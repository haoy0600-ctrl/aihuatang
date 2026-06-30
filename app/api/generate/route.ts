import { NextRequest, NextResponse } from 'next/server'
import { HANDDRAWN_STYLES } from '@/config/styles'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getClientIP, isUserCurrentlyBanned, recordSensitiveWordViolation } from '@/lib/security'

export const maxDuration = 300

const GRS_API_KEY = process.env.GRSAI_API_KEY || ''
const GRS_API_BASE_URL = (process.env.GRS_API_BASE_URL || 'https://grsai.dakka.com.cn').replace(/\/+$/, '')

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

type ResolutionLevel = '1K' | '2K' | '4K'

type GenerateRequest = {
  inputContents?: string[]
  referenceImages?: string[]
  styleName?: string
  customStyle?: string
  aspectRatio?: string
  modelType?: string
  resolution?: ResolutionLevel
  ResolutionLevel?: ResolutionLevel
  mode?: 'text' | 'image'
  clientRequestId?: string
}

type CreditResult = {
  success: boolean
  currentCredits: number
  profileId: string
}

const BASE_IMAGE_SIZE_BY_RATIO: Record<string, string> = {
  auto: '1024x1024',
  '16:9': '16:9',
  '9:16': '9:16',
  '4:3': '4:3',
  '3:4': '3:4',
  '1:1': '1:1',
  '3:2': '3:2',
  '2:3': '2:3',
  '21:9': '21:9',
  '9:21': '9:21',
  '1:3': '1:3',
  '3:1': '3:1',
  '1:2': '1:2',
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

function normalizeResolution(value?: string): ResolutionLevel {
  return value === '1K' || value === '2K' || value === '4K' ? value : '1K'
}

function getResolutionPrice(resolution: ResolutionLevel) {
  if (resolution === '2K') return 4
  if (resolution === '4K') return 8
  return 2
}

function getBaseImageSize(aspectRatio: string) {
  return BASE_IMAGE_SIZE_BY_RATIO[aspectRatio] || BASE_IMAGE_SIZE_BY_RATIO.auto
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

function getGrsModelConfig(modelType: string) {
  const normalized = modelType.toLowerCase()
  const isNanoBanana = normalized.includes('banana') || normalized.includes('nano')

  return {
    endpoint: isNanoBanana ? `${GRS_API_BASE_URL}/v1/draw/nano-banana` : `${GRS_API_BASE_URL}/v1/draw/completions`,
    model: isNanoBanana ? 'nano-banana-pro' : 'gpt-image-2',
  }
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
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`${label}超时，请稍后重试。`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

async function parseJsonResponse(response: Response, label: string) {
  const raw = await response.text()

  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(`${label}返回了异常响应：${raw.slice(0, 160)}`)
  }
}

function extractImageUrl(value: any, depth = 0): string | null {
  if (!value || depth > 5) return null

  if (typeof value === 'string') {
    return /^https?:\/\//i.test(value) ? value : null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImageUrl(item, depth + 1)
      if (found) return found
    }
    return null
  }

  if (typeof value === 'object') {
    const directKeys = ['url', 'imageUrl', 'image_url', 'image', 'src', 'output', 'result']
    for (const key of directKeys) {
      const found = extractImageUrl(value[key], depth + 1)
      if (found) return found
    }

    const nestedKeys = ['data', 'results', 'images', 'image_urls', 'urls', 'outputs', 'payload']
    for (const key of nestedKeys) {
      const found = extractImageUrl(value[key], depth + 1)
      if (found) return found
    }
  }

  return null
}

function normalizeTaskStatus(json: any) {
  return String(json?.status ?? json?.data?.status ?? json?.state ?? json?.data?.state ?? '').toLowerCase()
}

function isTaskFinished(status: string) {
  return ['succeeded', 'success', 'completed', 'complete', 'done', 'finished', 'finish'].some((item) =>
    status.includes(item),
  )
}

function isTaskFailed(status: string) {
  return ['failed', 'fail', 'error', 'canceled', 'cancelled'].some((item) => status.includes(item))
}

async function submitGrsTask(prompt: string, imageSize: string, modelType: string, referenceImage?: string) {
  if (!GRS_API_KEY) {
    throw new Error('绘图服务尚未配置，请联系管理员补全 GRS API。')
  }

  const { endpoint, model } = getGrsModelConfig(modelType)
  const payload: Record<string, any> = {
    model,
    prompt,
    imageSize,
    webHook: '-1',
  }

  if (referenceImage) {
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

  const json = await parseJsonResponse(response, '绘图服务')
  if (!response.ok) {
    throw new Error(json.message || json.error || `绘图服务请求失败：${response.status}`)
  }

  const taskId = json.data?.id || json.data?.taskId || json.taskId || json.id
  if (!taskId) {
    throw new Error(json.message || json.error || '绘图任务创建失败。')
  }

  return taskId as string
}

async function pollGrsResult(taskId: string) {
  const pollUrl = `${GRS_API_BASE_URL}/v1/draw/result`
  const maxRetries = 80

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
      await sleep(3000)
      continue
    }

    const json = await parseJsonResponse(response, '绘图轮询')
    const imageUrl = extractImageUrl(json)
    if (imageUrl) {
      return imageUrl
    }

    const status = normalizeTaskStatus(json)
    if (isTaskFailed(status)) {
      throw new Error(json.error || json.message || json.data?.error || json.data?.message || '图片生成失败。')
    }

    if (isTaskFinished(status)) {
      console.error('[Generate] Task finished without image url:', { taskId, json })
    }

    await sleep(3000)
  }

  throw new Error('生成任务轮询超时，请稍后到生成记录页查看结果。')
}

async function deductCredits(userId: string, amount: number): Promise<CreditResult> {
  if (!supabaseAdmin) {
    return { success: false, currentCredits: 0, profileId: '' }
  }

  const { data: profile, error } = await supabaseAdmin.from('profiles').select('id, credits').eq('id', userId).single()
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

function withoutKeys(payload: Record<string, any>, keys: string[]) {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !keys.includes(key)))
}

function isSchemaCompatibilityError(error: any) {
  const message = String(error?.message || '')
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    message.includes('schema cache') ||
    message.includes('column') ||
    message.includes('input_content') ||
    message.includes('image_url_4k') ||
    message.includes('resolution')
  )
}

async function insertGenerationRecord(payload: Record<string, any>) {
  if (!supabaseAdmin) {
    return { data: null, error: new Error('Supabase admin not configured') }
  }

  const candidates = [
    payload,
    withoutKeys(payload, ['image_url_4k']),
    withoutKeys(payload, ['image_url_4k', 'resolution']),
    withoutKeys(payload, ['image_url_4k', 'resolution', 'input_content']),
  ]

  let lastError: any = null
  for (const candidate of candidates) {
    const { data, error } = await supabaseAdmin.from('generation_records').insert(candidate).select('id').single()
    if (!error) {
      return { data, error: null }
    }

    lastError = error
    if (!isSchemaCompatibilityError(error)) break
  }

  return { data: null, error: lastError }
}

async function updateGenerationRecord(recordId: string, payload: Record<string, any>) {
  if (!supabaseAdmin || !recordId) return false

  const candidates = [
    payload,
    withoutKeys(payload, ['image_url_4k']),
    withoutKeys(payload, ['image_url_4k', 'resolution']),
    withoutKeys(payload, ['image_url_4k', 'resolution', 'input_content']),
  ]

  for (const candidate of candidates) {
    const { error } = await supabaseAdmin.from('generation_records').update(candidate).eq('id', recordId)
    if (!error) {
      return true
    }

    if (!isSchemaCompatibilityError(error)) {
      console.error('[Generate] Update record failed:', { recordId, error })
      return false
    }
  }

  console.error('[Generate] Update record failed: no compatible payload', { recordId })
  return false
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
      return NextResponse.json({ success: false, error: '系统配置未完成，请稍后重试。' }, { status: 500 })
    }

    const body = (await request.json()) as GenerateRequest
    const inputContents = Array.isArray(body.inputContents) ? body.inputContents : []
    const referenceImages = Array.isArray(body.referenceImages) ? body.referenceImages.filter(Boolean) : []
    const styleName = String(body.styleName || '').trim()
    const customStyle = String(body.customStyle || '').trim()
    const aspectRatio = String(body.aspectRatio || '9:16')
    const modelType = String(body.modelType || 'GPT-Image-2')
    const resolution = normalizeResolution(body.ResolutionLevel || body.resolution)
    const clientRequestId = body.clientRequestId || null
    const ipAddress = getClientIP(request)

    const sanitizedInputContents = inputContents.map((item) => sanitizePromptText(item)).filter(Boolean)
    const isTextMode = sanitizedInputContents.length > 0
    const isImageMode = !isTextMode && referenceImages.length > 0

    if (!isTextMode && !isImageMode) {
      return NextResponse.json({ success: false, error: '请先输入内容或上传参考图。' }, { status: 400 })
    }

    if (!styleName) {
      return NextResponse.json({ success: false, error: '请选择风格后再创建任务。' }, { status: 400 })
    }

    if (await isUserCurrentlyBanned(auth.user.id)) {
      return NextResponse.json(
        { success: false, error: '当前账号因违规触发安全限制，暂时无法继续创建任务。' },
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
          error: shouldBan ? '检测到违禁词汇，账号已暂时限制使用，请稍后再试。' : '检测到违禁词汇，请调整内容后重试。',
        },
        { status: 400 },
      )
    }

    const sourceItems = isTextMode ? sanitizedInputContents : referenceImages
    const totalImageCount = Math.max(1, sourceItems.length)
    const costPerImage = getResolutionPrice(resolution)
    totalCost = totalImageCount * costPerImage

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

    const baseRecordMeta = {
      clientRequestId,
      mode: isTextMode ? 'text' : 'image',
      items: isTextMode ? sanitizedInputContents : [],
      referenceCount: referenceImages.length,
    }

    const { data: insertedRecord, error: insertError } = await insertGenerationRecord({
      user_id: auth.user.id,
      input_content: baseRecordMeta,
      prompt: isTextMode ? sanitizedInputContents.join('\n') : '[Image Mode]',
      style_name: styleName,
      style_prompt: customStyle,
      aspect_ratio: aspectRatio,
      model: modelType,
      image_count: totalImageCount,
      image_url: null,
      image_urls: JSON.stringify([]),
      image_url_4k: null,
      resolution,
      status: 'processing',
    })

    if (insertError || !insertedRecord?.id) {
      console.error('[Generate] Insert record failed:', insertError)
      await rollbackCredits(profileId, totalCost)
      return NextResponse.json(
        {
          success: false,
          error: '创建生成记录失败，积分已退回，请稍后重试。',
          creditsRemaining: currentCredits + totalCost,
        },
        { status: 500 },
      )
    }

    recordId = insertedRecord.id

    const imageUrls: string[] = []
    const finalPrompts: string[] = []
    const baseImageSize = getBaseImageSize(aspectRatio)

    try {
      if (isTextMode) {
        for (const sentence of sanitizedInputContents) {
          const finalPrompt = buildFinalPrompt(sentence, styleName, customStyle, false)
          finalPrompts.push(finalPrompt)

          const taskId = await submitGrsTask(finalPrompt, baseImageSize, modelType)
          const imageUrl = await pollGrsResult(taskId)
          imageUrls.push(imageUrl)
        }
      } else {
        for (let index = 0; index < referenceImages.length; index += 1) {
          const finalPrompt = buildFinalPrompt(`参考图风格重绘 ${index + 1}`, styleName, customStyle, true)
          finalPrompts.push(finalPrompt)

          const taskId = await submitGrsTask(finalPrompt, baseImageSize, modelType, referenceImages[index])
          const imageUrl = await pollGrsResult(taskId)
          imageUrls.push(imageUrl)
        }
      }

      if (!imageUrls.length) {
        throw new Error('没有成功生成任何图片。')
      }
    } catch (error: any) {
      const errorMessage = error?.message || '生成失败，请稍后重试。'
      if (creditsDeducted) {
        await rollbackCredits(profileId, totalCost)
      }

      await updateGenerationRecord(recordId, {
        status: 'failed',
        input_content: {
          ...baseRecordMeta,
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

    const updateOk = await updateGenerationRecord(recordId, {
      prompt: isTextMode ? sanitizedInputContents.join('\n') : '[Image Mode]',
      style_name: styleName,
      style_prompt: finalPrompts.join('\n---\n'),
      aspect_ratio: aspectRatio,
      model: modelType,
      image_count: imageUrls.length,
      image_urls: JSON.stringify(imageUrls),
      image_url: imageUrls[0] || null,
      image_url_4k: null,
      resolution,
      status: 'success',
      input_content: baseRecordMeta,
    })

    if (!updateOk) {
      await rollbackCredits(profileId, totalCost)
      return NextResponse.json(
        {
          success: false,
          error: '图片已生成，但保存生成记录失败，积分已退回，请联系管理员查看服务器日志。',
          creditsRemaining: currentCredits + totalCost,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      recordId,
      imageUrls,
      imageUrl: imageUrls[0],
      creditsRemaining: currentCredits,
      recordSaved: true,
    })
  } catch (error: any) {
    console.error('[Generate] Fatal error:', error)

    if (creditsDeducted && profileId) {
      await rollbackCredits(profileId, totalCost)
    }

    if (recordId) {
      await updateGenerationRecord(recordId, { status: 'failed' })
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
