import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { HANDDRAWN_STYLES } from '@/config/styles'
import { isAdminEmail, requireAuthenticatedUser } from '@/lib/auth'
import { isUserCurrentlyBanned, recordSensitiveWordViolation } from '@/lib/security'

export const maxDuration = 300

const GRS_API_KEY = process.env.GRSAI_API_KEY || ''
const GRS_API_BASE_URL = (process.env.GRS_API_BASE_URL || 'https://grsapiapi.com').replace(/\/+$/, '')
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''
const REPLICATE_MODEL_VERSION = '5035f3f00af141105492fe913bab5ec9e9b0821815b67cd13d31d1461cc452fe'

const BASE_SENSITIVE_WORDS = [
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
  '爆炸',
  '炸弹',
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
  inputContents: string[]
  referenceImages: string[]
  styleName: string
  customStyle?: string
  aspectRatio: string
  modelType: string
  resolution: string
  imageSize: string
  mode: string
  clientRequestId?: string
}

function timeoutPromise<T>(promise: Promise<T>, ms: number, label = '请求'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}超时，请稍后重试`)), ms)

    promise.then(
      (result) => {
        clearTimeout(timer)
        resolve(result)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number, label: string): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return fetch(url, {
    ...options,
    signal: controller.signal,
  })
    .then((response) => {
      clearTimeout(timeoutId)
      return response
    })
    .catch((error) => {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`${label}超时，请稍后重试`)
      }
      throw error
    })
}

function getResolutionPrice(resolution: string): number {
  switch (resolution) {
    case '1K':
      return 2
    case '2K':
      return 4
    case '4K':
      return 8
    default:
      return 2
  }
}

const ASPECT_RATIO_PIXELS: Record<string, Record<string, string>> = {
  '1K': {
    '16:9': '16:9',
    '9:16': '9:16',
    '4:3': '4:3',
    '3:4': '3:4',
    '1:1': '1:1',
  },
  '2K': {
    '16:9': '2048x1152',
    '9:16': '1152x2048',
    '4:3': '1536x1152',
    '3:4': '1152x1536',
    '1:1': '1536x1536',
  },
  '4K': {
    '16:9': '3840x2160',
    '9:16': '2160x3840',
    '4:3': '3072x2304',
    '3:4': '2304x3072',
    '1:1': '3072x3072',
  },
}

function getImageSizeByResolution(resolution: string, aspectRatio: string): string {
  return ASPECT_RATIO_PIXELS[resolution]?.[aspectRatio] || aspectRatio
}

function getModelName(): string {
  return 'gpt-image-2'
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

function getStyleByName(styleName: string) {
  return HANDDRAWN_STYLES.find((style) => style.name === styleName)
}

function buildFinalPrompt(inputText: string, styleName: string, customStyle?: string, isImageMode = false): string {
  const userText = sanitizePromptText(inputText)

  let activeStyle = ''
  if (customStyle && customStyle.trim()) {
    activeStyle = customStyle.trim()
  } else {
    const style = getStyleByName(styleName)
    activeStyle = style
      ? `${style.styleKeywords || ''}, ${style.layoutDirectives || ''}`
      : 'cartoon hand-drawn style, cute illustration, vibrant pastel colors, clean thick line art, neat infographic layout'
  }

  if (isImageMode) {
    return `
[CORE TASK: STYLE TRANSFER & RECONSTRUCTION]
You are given a reference image. Your task is to perform style transfer while reconstructing the content:
1. Analyze the reference image's composition, colors, and structural elements
2. Apply the target artistic style while preserving the core content and layout
3. Enhance and refine the visual quality
4. Maintain the original aspect ratio

[TARGET ARTISTIC STYLE]
${activeStyle}

[GUIDELINES]
- Preserve the original image's subject and composition
- Apply the style consistently throughout
- Ensure high quality rendering
- Maintain good visual balance
- Make the result visually appealing and professional

[NEGATIVE REINFORCEMENT]
low resolution, blurry, distorted subject, mismatched colors, poor composition, text artifacts, watermarks, overly compressed
`.trim()
  }

  return `
[CORE SUBJECT & TEXT COMPLIANCE]
You must strictly render and layout the following explicit text content. The text clarity is the highest priority of this image. Do not distort, do not omit, do not hallucinate any characters:
"${userText}"

[VISUAL BACKGROUND & STYLE ENVIRONMENT]
Render the ambient background, textures, color palette, and artistic medium strictly according to the style guidelines below. However, this style MUST NOT interfere with the legibility of the core text above. Keep the text area clean, high-contrast, and solid baseline:
${activeStyle}

[NEGATIVE REINFORCEMENT]
low resolution, blurry text, chaotic layout, compressed artifact, deformed characters, text bleeding into background color.
`.trim()
}

function detectSensitiveWords(prompt: string): boolean {
  if (!prompt || !prompt.trim()) return false

  const cleanedPrompt = prompt.replace(/[\s\t\n\r\-_~!@#$%^&*()[\]{}|;':",.<>?/\\]/g, '').toLowerCase()
  return BASE_SENSITIVE_WORDS.some((word) => cleanedPrompt.includes(word.toLowerCase().replace(/\s/g, '')))
}

async function submitGrsTask(
  prompt: string,
  imageSize: string,
  modelName: string,
  modelType: string,
  resolution: string,
  referenceImage?: string,
): Promise<string> {
  const isImageMode = Boolean(referenceImage)
  const is4K = resolution === '4K'
  const isBanana = modelType.toLowerCase().includes('banana')

  const drawUrl = isBanana
    ? `${GRS_API_BASE_URL}/v1/draw/nano-banana`
    : `${GRS_API_BASE_URL}/v1/draw/completions`

  const payload: Record<string, any> = {
    model: modelName,
    prompt,
    imageSize,
    webHook: '-1',
  }

  if (isBanana && is4K) {
    payload.imageSize = '4K'
  }

  if (isImageMode && referenceImage) {
    payload.images = [referenceImage]
  }

  if (!GRS_API_KEY) {
    throw new Error('GRS API 未配置，请联系管理员。')
  }

  const response = await fetchWithTimeout(
    drawUrl,
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

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`绘图服务请求失败：${response.status} ${errorText.substring(0, 120)}`)
  }

  const responseText = await timeoutPromise(response.text(), 30000, '读取绘图响应')
  let taskJson: any

  try {
    taskJson = JSON.parse(responseText)
  } catch {
    throw new Error('绘图服务返回了无效响应，请稍后重试。')
  }

  if (!taskJson.data?.id) {
    throw new Error(taskJson.message || taskJson.error || '绘图任务创建失败。')
  }

  return taskJson.data.id
}

async function pollGrsResult(taskId: string): Promise<string> {
  const maxRetries = 30
  const retryDelay = 4000
  const pollUrl = `${GRS_API_BASE_URL}/v1/draw/result`

  for (let i = 0; i < maxRetries; i += 1) {
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
      `轮询任务 ${i + 1}/${maxRetries}`,
    )

    if (!response.ok) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
      continue
    }

    const checkJson = await timeoutPromise(response.json(), 15000, '解析轮询结果')
    const results = checkJson.results || checkJson.data?.results
    const status = checkJson.status || checkJson.data?.status

    if (status === 'succeeded' && results?.[0]?.url) {
      return results[0].url
    }

    if (status === 'failed') {
      throw new Error(checkJson.error || checkJson.data?.error || '绘图任务失败。')
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelay))
  }

  throw new Error('绘图任务超时，请稍后重试。')
}

async function upscaleImage(imageUrl: string, scale: number): Promise<string> {
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
  if (!createData.id) {
    return imageUrl
  }

  let status = createData.status
  let outputUrl = null
  const predictionId = createData.id

  while (status !== 'succeeded' && status !== 'failed') {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
    })
    const statusData = await statusResponse.json()
    status = statusData.status

    if (status === 'succeeded') {
      outputUrl = statusData.output
    }
    if (status === 'failed') {
      return imageUrl
    }
  }

  return outputUrl || imageUrl
}

async function checkVipPermission(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    return true
  }

  const { data: profileData, error } = await supabaseAdmin
    .from('profiles')
    .select('vip_level, credits, email')
    .eq('id', userId)
    .single()

  if (error || !profileData) {
    return false
  }

  if (isAdminEmail(profileData.email)) {
    return true
  }

  if (profileData.vip_level && profileData.vip_level >= 1) {
    return true
  }

  return (profileData.credits || 0) >= 8
}

async function deductCredits(
  userId: string,
  amount: number,
): Promise<{ success: boolean; currentCredits: number; profileId: string }> {
  if (!supabaseAdmin) {
    return { success: true, currentCredits: 9999, profileId: userId }
  }

  const { data: profileData, error } = await supabaseAdmin
    .from('profiles')
    .select('id, credits')
    .eq('id', userId)
    .single()

  if (error || !profileData) {
    return { success: false, currentCredits: 0, profileId: '' }
  }

  const currentCredits = profileData.credits || 0
  if (currentCredits < amount) {
    return { success: false, currentCredits, profileId: profileData.id }
  }

  const newCredits = currentCredits - amount
  const { error: deductError } = await supabaseAdmin
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', profileData.id)
    .eq('credits', currentCredits)

  if (deductError) {
    return { success: false, currentCredits, profileId: profileData.id }
  }

  return { success: true, currentCredits: newCredits, profileId: profileData.id }
}

async function rollbackCredits(profileId: string, amount: number): Promise<void> {
  if (!supabaseAdmin || !profileId) return

  const { data: currentProfile } = await supabaseAdmin
    .from('profiles')
    .select('credits')
    .eq('id', profileId)
    .single()

  if (!currentProfile) return

  await supabaseAdmin
    .from('profiles')
    .update({ credits: (currentProfile.credits || 0) + amount })
    .eq('id', profileId)
}

async function updateGenerationRecord(recordId: string, payload: Record<string, any>): Promise<void> {
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
    const body: GenerateRequest = await timeoutPromise(request.json(), 10000)
    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const userId = auth.user.id
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    const {
      inputContents = [],
      referenceImages = [],
      styleName,
      customStyle,
      aspectRatio,
      modelType,
      resolution,
      clientRequestId,
    } = body

    const isTextMode = inputContents.length > 0
    const isImageMode = referenceImages.length > 0

    if (!isTextMode && !isImageMode) {
      return NextResponse.json({ success: false, error: '必须提供文案内容或参考图片。' }, { status: 400 })
    }

    if (!styleName) {
      return NextResponse.json({ success: false, error: '缺少风格参数。' }, { status: 400 })
    }

    const sanitizedInputContents = inputContents.map((item) => sanitizePromptText(item)).filter(Boolean)
    const moderationText = isTextMode
      ? sanitizedInputContents.join('\n')
      : [styleName, customStyle?.trim()].filter(Boolean).join('\n') || '[Image Mode]'

    const isBanned = await isUserCurrentlyBanned(userId)
    if (isBanned) {
      return NextResponse.json(
        { success: false, error: '账号因恶意刷词已触发安全限制，24 小时内无法继续使用。' },
        { status: 403 },
      )
    }

    if (detectSensitiveWords(moderationText)) {
      const shouldBan = await recordSensitiveWordViolation({
        userId,
        ipAddress: ip,
        prompt: moderationText,
      })

      await deductCredits(userId, 2)
      return NextResponse.json(
        {
          success: false,
          error: shouldBan
            ? '检测到违禁词汇，生成失败。账号因多次违规已被临时封禁。'
            : '检测到违禁词汇，生成失败。请调整内容后重试。',
        },
        { status: 400 },
      )
    }

    const is4K = resolution === '4K'
    const isVipModel = modelType.toLowerCase().includes('vip') || is4K
    if (isVipModel) {
      const isVip = await checkVipPermission(userId)
      if (!isVip) {
        return NextResponse.json(
          { success: false, error: '当前账号没有 4K 权限，请先充值高级卡密后再使用。' },
          { status: 403 },
        )
      }
    }

    const costPerImage = getResolutionPrice(resolution)
    const targetImageSize = getImageSizeByResolution(resolution, aspectRatio)
    const modelName = getModelName()
    const sentences = isTextMode ? sanitizedInputContents.filter((item) => item.trim()) : []
    const totalImageCount = isTextMode ? sentences.length : referenceImages.length

    totalCost = totalImageCount * costPerImage

    const deductResult = await deductCredits(userId, totalCost)
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

    currentCredits = deductResult.currentCredits
    profileId = deductResult.profileId
    creditsDeducted = true

    if (!supabaseAdmin) {
      await rollbackCredits(profileId, totalCost)
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
          creditsRemaining: currentCredits + totalCost,
        },
        { status: 500 },
      )
    }

    const { data: insertedRecord, error: insertRecordError } = await supabaseAdmin
      .from('generation_records')
      .insert({
        user_id: userId,
        input_content: {
          clientRequestId: clientRequestId || null,
          mode: isTextMode ? 'text' : 'image',
          items: isTextMode ? sanitizedInputContents : [],
          referenceCount: isImageMode ? referenceImages.length : 0,
        },
        prompt: isTextMode ? sanitizedInputContents.join('\n') : '[Image Mode]',
        style_name: styleName,
        style_prompt: customStyle || '',
        aspect_ratio: aspectRatio,
        model: modelName,
        image_count: totalImageCount,
        image_urls: JSON.stringify([]),
        resolution,
        status: 'processing',
      } as any)
      .select('id')
      .single()

    if (insertRecordError || !insertedRecord?.id) {
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
    let firstError = ''

    try {
      if (isTextMode) {
        const results = await Promise.all(
          sentences.map(async (sentence, index) => {
            const finalPrompt = buildFinalPrompt(sentence, styleName, customStyle)
            finalPrompts.push(finalPrompt)

            try {
              const taskId = await submitGrsTask(finalPrompt, targetImageSize, modelName, modelType, resolution)
              const url = await pollGrsResult(taskId)
              return { url, error: '' }
            } catch (error: any) {
              return { url: '', error: error?.message || `第 ${index + 1} 段生成失败` }
            }
          }),
        )

        results.forEach((result) => {
          if (result.url) {
            imageUrls.push(result.url)
          } else if (!firstError) {
            firstError = result.error
          }
        })
      } else {
        const results = await Promise.all(
          referenceImages.map(async (referenceImage, index) => {
            const finalPrompt = buildFinalPrompt(`参考图风格转绘 ${index + 1}`, styleName, customStyle, true)
            finalPrompts.push(finalPrompt)

            try {
              const taskId = await submitGrsTask(
                finalPrompt,
                targetImageSize,
                modelName,
                modelType,
                resolution,
                referenceImage,
              )
              const url = await pollGrsResult(taskId)
              return { url, error: '' }
            } catch (error: any) {
              return { url: '', error: error?.message || `第 ${index + 1} 张参考图生成失败` }
            }
          }),
        )

        results.forEach((result) => {
          if (result.url) {
            imageUrls.push(result.url)
          } else if (!firstError) {
            firstError = result.error
          }
        })
      }

      if (imageUrls.length === 0) {
        throw new Error(firstError || '所有图片生成均失败。')
      }

      if ((resolution === '2K' || resolution === '4K') && REPLICATE_API_TOKEN) {
        const scale = resolution === '2K' ? 2 : 4
        const upscaledUrls = await Promise.all(
          imageUrls.map((url) =>
            upscaleImage(url, scale).catch(() => url),
          ),
        )

        for (let i = 0; i < upscaledUrls.length; i += 1) {
          if (upscaledUrls[i]) {
            imageUrls[i] = upscaledUrls[i]
          }
        }
      }
    } catch (generationError: any) {
      if (creditsDeducted) {
        await rollbackCredits(profileId, totalCost)
      }

      await updateGenerationRecord(recordId, {
        status: 'failed',
        input_content: {
          clientRequestId: clientRequestId || null,
          mode: isTextMode ? 'text' : 'image',
          items: isTextMode ? sanitizedInputContents : [],
          referenceCount: isImageMode ? referenceImages.length : 0,
          errorMessage: generationError?.message || '生成失败，请稍后重试。',
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: generationError?.message || '生成失败，积分已退回。',
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
      model: modelName,
      image_count: imageUrls.length,
      image_urls: JSON.stringify(imageUrls),
      resolution,
      status: 'success',
      input_content: {
        clientRequestId: clientRequestId || null,
        mode: isTextMode ? 'text' : 'image',
        items: isTextMode ? sanitizedInputContents : [],
        referenceCount: isImageMode ? referenceImages.length : 0,
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
        error: error?.message || '服务端错误，请稍后重试。',
        creditsRemaining: creditsDeducted ? currentCredits + totalCost : currentCredits,
      },
      { status: 500 },
    )
  }
}
