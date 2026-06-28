import { NextRequest, NextResponse } from 'next/server'
import { HANDDRAWN_STYLES } from '@/config/styles'
import { isAdminEmail, requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getClientIP, isUserCurrentlyBanned, recordSensitiveWordViolation } from '@/lib/security'

export const maxDuration = 300

const GRS_API_KEY = process.env.GRSAI_API_KEY || ''
const GRS_API_BASE_URL = (process.env.GRS_API_BASE_URL || 'https://grsapiapi.com').replace(/\/+$/, '')
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''
const REPLICATE_MODEL_VERSION = '5035f3f00af141105492fe913bab5ec9e9b0821815b67cd13d31d1461cc452fe'

const SENSITIVE_WORDS = [
  '台独',
  '港独',
  '藏独',
  '疆独',
  '法轮功',
  '邪教',
  '恐怖主义',
  '极端主义',
  'isis',
  '色情',
  '裸照',
  '裸体',
  '性行为',
  '成人内容',
  '援交',
  '强奸',
  '乱伦',
  '自残',
  '自杀',
  '炸弹',
  '爆炸',
  '枪支',
  '毒品',
  '大麻',
  '海洛因',
  '冰毒',
  '暗网',
  'vpn',
  '翻墙',
  '黑客',
  '木马',
  '病毒',
  '钓鱼',
  '勒索',
  '赌博',
  '百家乐',
  '六合彩',
  '诈骗',
  '洗钱',
  '人肉搜索',
  '仇恨言论',
  '国家机密',
  '泄密',
]

type GenerateRequest = {
  inputContents?: string[]
  referenceImages?: string[]
  styleName?: string
  customStyle?: string
  aspectRatio?: string
  modelType?: string
  resolution?: '1K' | '2K' | '4K'
  imageSize?: string
  mode?: 'text' | 'image'
  clientRequestId?: string
}

function sanitizePromptText(text: string) {
  return String(text || '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function getResolutionPrice(resolution: string) {
  if (resolution === '2K') return 4
  if (resolution === '4K') return 8
  return 2
}

const ASPECT_RATIO_PIXELS: Record<string, Record<string, string>> = {
  '1K': {
    auto: '1024x1024',
    '16:9': '16:9',
    '9:16': '9:16',
    '4:3': '4:3',
    '3:4': '3:4',
    '1:1': '1:1',
    '3:2': '3:2',
    '2:3': '2:3',
  },
  '2K': {
    auto: '2048x2048',
    '16:9': '2048x1152',
    '9:16': '1152x2048',
    '4:3': '1536x1152',
    '3:4': '1152x1536',
    '1:1': '1536x1536',
    '3:2': '1792x1216',
    '2:3': '1216x1792',
  },
  '4K': {
    auto: '4096x4096',
    '16:9': '3840x2160',
    '9:16': '2160x3840',
    '4:3': '3072x2304',
    '3:4': '2304x3072',
    '1:1': '3072x3072',
    '3:2': '3840x2560',
    '2:3': '2560x3840',
  },
}

function getImageSizeByResolution(resolution: string, aspectRatio: string) {
  return ASPECT_RATIO_PIXELS[resolution]?.[aspectRatio] || ASPECT_RATIO_PIXELS[resolution]?.auto || '1024x1024'
}

function getStyleByName(styleName: string) {
  return HANDDRAWN_STYLES.find((style) => style.name === styleName) || null
}

function detectSensitiveWords(prompt: string) {
  const cleaned = String(prompt || '')
    .replace(/[\s\t\n\r\-_~!@#$%^&*()[\]{}|;':",.<>?/\\]/g, '')
    .toLowerCase()

  return SENSITIVE_WORDS.some((word) => cleaned.includes(word.toLowerCase()))
}

function buildFinalPrompt(inputText: string, styleName: string, customStyle?: string, isImageMode = false) {
  const userText = sanitizePromptText(inputText)
  const matchedStyle = getStyleByName(styleName)
  const activeStyle = customStyle?.trim()
    ? customStyle.trim()
    : matchedStyle
      ? [matchedStyle.styleKeywords, matchedStyle.layoutDirectives].filter(Boolean).join(', ')
      : 'cartoon hand-drawn style, clean composition, premium educational infographic'

  if (isImageMode) {
    return [
      '[TASK]',
      'Analyze the reference image and redraw it in the target style while preserving its main subject and composition.',
      '',
      '[TARGET STYLE]',
      activeStyle,
      '',
      '[REQUIREMENTS]',
      'Preserve the reference subject, improve visual quality, keep the layout clean, and avoid extra text artifacts.',
    ].join('\n')
  }

  return [
    '[CORE CONTENT]',
    userText,
    '',
    '[STYLE]',
    activeStyle,
    '',
    '[REQUIREMENTS]',
    'Keep all text readable, preserve the original meaning, avoid markdown symbols in the rendered image, and produce a polished infographic composition.',
  ].join('\n')
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number, label: string) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`${label}超时，请稍后重试。`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function submitGrsTask(
  prompt: string,
  imageSize: string,
  modelName: string,
  modelType: string,
  resolution: string,
  referenceImage?: string,
) {
  if (!GRS_API_KEY) {
    throw new Error('绘图服务尚未配置，请联系管理员补全 GRS API。')
  }

  const isBanana = modelType.toLowerCase().includes('banana')
  const isImageMode = Boolean(referenceImage)
  const endpoint = isBanana
    ? `${GRS_API_BASE_URL}/v1/draw/nano-banana`
    : `${GRS_API_BASE_URL}/v1/draw/completions`

  const payload: Record<string, any> = {
    model: modelName,
    prompt,
    imageSize,
    webHook: '-1',
  }

  if (isBanana && resolution === '4K') {
    payload.imageSize = '4K'
  }

  if (isImageMode && referenceImage) {
    payload.images = [referenceImage]
  }

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GRS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    60000,
    '提交生成任务',
  )

  const raw = await response.text()

  if (!response.ok) {
    throw new Error(`绘图服务请求失败：${response.status} ${raw.slice(0, 160)}`)
  }

  let json: any
  try {
    json = JSON.parse(raw)
  } catch {
    throw new Error('绘图服务返回了异常响应，请稍后重试。')
  }

  const taskId = json.data?.id
  if (!taskId) {
    throw new Error(json.message || json.error || '绘图任务创建失败。')
  }

  return taskId as string
}

async function pollGrsResult(taskId: string) {
  const pollUrl = `${GRS_API_BASE_URL}/v1/draw/result`
  const maxRetries = 30

  for (let index = 0; index < maxRetries; index += 1) {
    const response = await fetchWithTimeout(
      pollUrl,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GRS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: taskId }),
      },
      30000,
      '轮询生成任务',
    )

    if (!response.ok) {
      await new Promise((resolve) => setTimeout(resolve, 4000))
      continue
    }

    const json = await response.json()
    const status = json.status || json.data?.status
    const results = json.results || json.data?.results

    if (status === 'succeeded' && results?.[0]?.url) {
      return results[0].url as string
    }

    if (status === 'failed') {
      throw new Error(json.error || json.data?.error || '图片生成失败。')
    }

    await new Promise((resolve) => setTimeout(resolve, 4000))
  }

  throw new Error('生成任务超时，请稍后到记录页查看结果。')
}

async function upscaleImage(imageUrl: string, scale: number) {
  if (!REPLICATE_API_TOKEN) {
    return imageUrl
  }

  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
    },
    body: JSON.stringify({
      version: REPLICATE_MODEL_VERSION,
      input: {
        image: imageUrl,
        scale,
        face_enhance: true,
      },
    }),
  })

  const createData = await createResponse.json()
  if (!createData?.id) {
    return imageUrl
  }

  let status = createData.status
  let outputUrl = ''

  while (status !== 'succeeded' && status !== 'failed' && status !== 'canceled') {
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${createData.id}`, {
      headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
    })
    const statusData = await statusResponse.json()
    status = statusData.status

    if (status === 'succeeded') {
      outputUrl = Array.isArray(statusData.output) ? statusData.output[0] : statusData.output || ''
    }
  }

  return outputUrl || imageUrl
}

async function checkVipPermission(userId: string) {
  if (!supabaseAdmin) return false

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('vip_level, credits, email')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return false
  }

  if (isAdminEmail(data.email)) {
    return true
  }

  return (data.vip_level || 0) >= 1 || (data.credits || 0) >= 8
}

async function deductCredits(userId: string, amount: number) {
  if (!supabaseAdmin) {
    return { success: false, currentCredits: 0, profileId: '' }
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id, credits')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return { success: false, currentCredits: 0, profileId: '' }
  }

  const currentCredits = profile.credits || 0
  if (currentCredits < amount) {
    return { success: false, currentCredits, profileId: profile.id }
  }

  const { error: deductError } = await supabaseAdmin
    .from('profiles')
    .update({ credits: currentCredits - amount })
    .eq('id', profile.id)
    .eq('credits', currentCredits)

  if (deductError) {
    return { success: false, currentCredits, profileId: profile.id }
  }

  return {
    success: true,
    currentCredits: currentCredits - amount,
    profileId: profile.id,
  }
}

async function rollbackCredits(profileId: string, amount: number) {
  if (!supabaseAdmin || !profileId || amount <= 0) return

  const { data: profile } = await supabaseAdmin.from('profiles').select('credits').eq('id', profileId).single()
  const currentCredits = profile?.credits || 0

  await supabaseAdmin
    .from('profiles')
    .update({ credits: currentCredits + amount })
    .eq('id', profileId)
}

async function updateGenerationRecord(recordId: string, payload: Record<string, any>) {
  if (!supabaseAdmin || !recordId) return

  const { error } = await supabaseAdmin.from('generation_records').update(payload).eq('id', recordId)
  if (error) {
    console.error('[Generate] Update record failed:', { recordId, error })
  }
}

export async function POST(request: NextRequest) {
  let currentCredits = 0
  let profileId = ''
  let totalCost = 0
  let creditsDeducted = false
  let recordId = ''

  try {
    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const body = (await request.json()) as GenerateRequest
    const inputContents = Array.isArray(body.inputContents) ? body.inputContents : []
    const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages : []
    const styleName = String(body.styleName || '').trim()
    const customStyle = String(body.customStyle || '').trim()
    const aspectRatio = String(body.aspectRatio || '9:16')
    const modelType = String(body.modelType || 'GPT-Image-2')
    const resolution = String(body.resolution || '1K')
    const clientRequestId = body.clientRequestId || null
    const ipAddress = getClientIP(request)

    const sanitizedInputContents = inputContents.map((item) => sanitizePromptText(item)).filter(Boolean)
    const isTextMode = sanitizedInputContents.length > 0
    const isImageMode = referenceImages.length > 0

    if (!isTextMode && !isImageMode) {
      return NextResponse.json(
        {
          success: false,
          error: '请先输入内容或上传参考图。',
        },
        { status: 400 },
      )
    }

    if (!styleName) {
      return NextResponse.json(
        {
          success: false,
          error: '请选择风格后再创建任务。',
        },
        { status: 400 },
      )
    }

    if (await isUserCurrentlyBanned(auth.user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: '当前账号因违规触发安全限制，暂时无法继续创建任务。',
        },
        { status: 403 },
      )
    }

    const moderationText = isTextMode
      ? sanitizedInputContents.join('\n')
      : [styleName, customStyle].filter(Boolean).join('\n') || '[image-mode]'

    if (detectSensitiveWords(moderationText)) {
      const shouldBan = await recordSensitiveWordViolation({
        userId: auth.user.id,
        ipAddress,
        prompt: moderationText,
      })

      return NextResponse.json(
        {
          success: false,
          error: shouldBan
            ? '检测到违禁词汇，账号已暂时限制使用，请稍后再试。'
            : '检测到违禁词汇，请调整内容后重试。',
        },
        { status: 400 },
      )
    }

    if (resolution === '4K') {
      const canUse4k = await checkVipPermission(auth.user.id)
      if (!canUse4k) {
        return NextResponse.json(
          {
            success: false,
            error: '当前账号没有 4K 权限，请先充值高级卡密后再使用。',
          },
          { status: 403 },
        )
      }
    }

    const costPerImage = getResolutionPrice(resolution)
    const totalImageCount = isTextMode ? sanitizedInputContents.length : referenceImages.length
    totalCost = Math.max(1, totalImageCount) * costPerImage

    const deductResult = await deductCredits(auth.user.id, totalCost)
    if (!deductResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `积分不足，本次需要 ${totalCost} 积分，当前仅剩 ${deductResult.currentCredits} 积分。`,
          creditsRemaining: deductResult.currentCredits,
        },
        { status: 400 },
      )
    }

    creditsDeducted = true
    currentCredits = deductResult.currentCredits
    profileId = deductResult.profileId

    const recordPayload = {
      user_id: auth.user.id,
      input_content: {
        clientRequestId,
        mode: isTextMode ? 'text' : 'image',
        items: isTextMode ? sanitizedInputContents : [],
        referenceCount: referenceImages.length,
      },
      prompt: isTextMode ? sanitizedInputContents.join('\n') : '[Image Mode]',
      style_name: styleName,
      style_prompt: customStyle,
      aspect_ratio: aspectRatio,
      model: modelType,
      image_count: Math.max(1, totalImageCount),
      image_urls: JSON.stringify([]),
      resolution,
      status: 'processing',
    }

    const { data: insertedRecord, error: insertError } = await supabaseAdmin
      .from('generation_records')
      .insert(recordPayload)
      .select('id')
      .single()

    if (insertError || !insertedRecord?.id) {
      console.error('[Generate] Insert record failed:', insertError)
      await rollbackCredits(profileId, totalCost)
      return NextResponse.json(
        {
          success: false,
          error: '创建生成任务失败，积分已退回，请稍后重试。',
          creditsRemaining: currentCredits + totalCost,
        },
        { status: 500 },
      )
    }

    recordId = insertedRecord.id

    const imageUrls: string[] = []
    const finalPrompts: string[] = []

    try {
      if (isTextMode) {
        for (const sentence of sanitizedInputContents) {
          const finalPrompt = buildFinalPrompt(sentence, styleName, customStyle, false)
          finalPrompts.push(finalPrompt)
          const taskId = await submitGrsTask(
            finalPrompt,
            getImageSizeByResolution(resolution, aspectRatio),
            'gpt-image-2',
            modelType,
            resolution,
          )
          const imageUrl = await pollGrsResult(taskId)
          imageUrls.push(imageUrl)
        }
      } else {
        for (let index = 0; index < referenceImages.length; index += 1) {
          const finalPrompt = buildFinalPrompt(`参考图风格重绘 ${index + 1}`, styleName, customStyle, true)
          finalPrompts.push(finalPrompt)
          const taskId = await submitGrsTask(
            finalPrompt,
            getImageSizeByResolution(resolution, aspectRatio),
            'gpt-image-2',
            modelType,
            resolution,
            referenceImages[index],
          )
          const imageUrl = await pollGrsResult(taskId)
          imageUrls.push(imageUrl)
        }
      }

      if (!imageUrls.length) {
        throw new Error('没有成功生成任何图片。')
      }

      if ((resolution === '2K' || resolution === '4K') && REPLICATE_API_TOKEN) {
        const scale = resolution === '2K' ? 2 : 4
        const refinedUrls = await Promise.all(imageUrls.map((url) => upscaleImage(url, scale).catch(() => url)))
        for (let index = 0; index < refinedUrls.length; index += 1) {
          imageUrls[index] = refinedUrls[index] || imageUrls[index]
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || '生成失败，请稍后重试。'
      if (creditsDeducted) {
        await rollbackCredits(profileId, totalCost)
      }

      await updateGenerationRecord(recordId, {
        status: 'failed',
        input_content: {
          clientRequestId,
          mode: isTextMode ? 'text' : 'image',
          items: isTextMode ? sanitizedInputContents : [],
          referenceCount: referenceImages.length,
          errorMessage,
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          creditsRemaining: currentCredits + totalCost,
        },
        { status: 500 },
      )
    }

    await updateGenerationRecord(recordId, {
      prompt: isTextMode ? sanitizedInputContents.join('\n') : '[Image Mode]',
      style_name: styleName,
      style_prompt: finalPrompts.join('\n---\n'),
      aspect_ratio: aspectRatio,
      model: modelType,
      image_count: imageUrls.length,
      image_urls: JSON.stringify(imageUrls),
      image_url: imageUrls[0] || null,
      resolution,
      status: 'success',
      input_content: {
        clientRequestId,
        mode: isTextMode ? 'text' : 'image',
        items: isTextMode ? sanitizedInputContents : [],
        referenceCount: referenceImages.length,
      },
    })

    return NextResponse.json({
      success: true,
      recordId,
      imageUrls,
      imageUrl: imageUrls[0],
      creditsRemaining: currentCredits,
    })
  } catch (error: any) {
    console.error('[Generate] Fatal error:', error)

    if (creditsDeducted && profileId) {
      await rollbackCredits(profileId, totalCost)
    }

    if (recordId) {
      await updateGenerationRecord(recordId, {
        status: 'failed',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: error?.message || '服务异常，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
