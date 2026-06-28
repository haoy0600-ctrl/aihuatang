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

function timeoutPromise<T>(promise: Promise<T>, ms: number, label = '请求'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`[${label}] 超时，超过 ${ms}ms`)
      reject(new Error(`${label}超时，请稍后重试`))
    }, ms)

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
        console.error(`[${label}] 请求被中止（超时 ${timeoutMs}ms）`)
        throw new Error(`${label}请求超时，请稍后重试`)
      }

      console.error(`[${label}] fetch 错误:`, error.message, 'URL:', url)
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

function getModelName(_modelType: string, _resolution: string): string {
  return 'gpt-image-2'
}

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
}

function getStyleByName(styleName: string) {
  return HANDDRAWN_STYLES.find((style) => style.name === styleName)
}

function buildFinalPrompt(inputText: string, styleName: string, customStyle?: string, isImageMode = false): string {
  const userText = inputText.trim()

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

  const cleanedPrompt = prompt
    .replace(/[\s\t\n\r\-_~!@#$%^&*()[\]{}|;':",.<>?/\\]/g, '')
    .toLowerCase()

  for (const word of BASE_SENSITIVE_WORDS) {
    const cleanedWord = word.toLowerCase().replace(/\s/g, '')
    if (cleanedPrompt.includes(cleanedWord)) {
      console.warn('[Security] Sensitive word detected:', word)
      return true
    }
  }

  return false
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

  console.log('[GrsAI] API request:', {
    url: drawUrl,
    model: modelName,
    imageSize: payload.imageSize,
    resolution,
    is4K,
    isBanana,
    isImageMode,
    timestamp: Date.now(),
  })

  if (!GRS_API_KEY) {
    console.error('[GrsAI] GRS_API_KEY not configured')
    throw new Error('GRS API 未配置，请联系管理员。')
  }

  try {
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
      'GrsAI 提交任务',
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[GrsAI] API request failed: status=${response.status}, body=${errorText}`)
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`GrsAI 服务异常（${response.status}），已触发积分回滚。`)
      }

      throw new Error(`GrsAI 请求失败：${response.status} - ${errorText.substring(0, 200)}`)
    }

    const responseText = await timeoutPromise(
      response.text().then((text) => {
        console.log('[GrsAI] raw response:', text.substring(0, 500))
        return text
      }),
      30000,
      'GrsAI 读取响应',
    )

    let taskJson: any
    try {
      taskJson = JSON.parse(responseText)
    } catch {
      console.error('[GrsAI] JSON parse failed, raw:', responseText.substring(0, 500))
      throw new Error('GrsAI 返回了无效的 JSON 响应。')
    }

    if (!taskJson.data || !taskJson.data.id) {
      const message = taskJson.message || taskJson.error || 'GrsAI 任务创建失败，缺少 taskId。'
      console.error('[GrsAI] Create task failed:', message, '完整响应:', JSON.stringify(taskJson).substring(0, 500))
      throw new Error(message)
    }

    console.log('[GrsAI] Task created:', taskJson.data.id)
    return taskJson.data.id
  } catch (error: any) {
    console.error('[GrsAI] submitGrsTask error:', error.message)
    throw error
  }
}

async function pollGrsResult(taskId: string): Promise<string> {
  const maxRetries = 30
  const retryDelay = 4000
  const pollUrl = `${GRS_API_BASE_URL}/v1/draw/result`

  for (let i = 0; i < maxRetries; i += 1) {
    try {
      const checkRes = await fetchWithTimeout(
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
        `GrsAI 轮询 ${i + 1}/${maxRetries}`,
      )

      if (!checkRes.ok) {
        const errorText = await checkRes.text()
        console.error(`[GrsAI] Poll failed: status=${checkRes.status}, body=${errorText.substring(0, 200)}`)
        if (checkRes.status === 429 || checkRes.status >= 500) {
          throw new Error(`GrsAI 轮询异常（${checkRes.status}）`)
        }

        await new Promise((resolve) => setTimeout(resolve, retryDelay))
        continue
      }

      const checkJson = await timeoutPromise(checkRes.json(), 15000, 'GrsAI 解析轮询响应')
      console.log(`[GrsAI] poll ${i + 1}/${maxRetries}: status=${checkJson.status || checkJson.data?.status}`)

      const results = checkJson.results || checkJson.data?.results
      const status = checkJson.status || checkJson.data?.status

      if (status === 'succeeded' && results && results[0]?.url) {
        console.log('[GrsAI] 生成成功, 图片 URL:', results[0].url.substring(0, 100) + '...')
        return results[0].url
      }

      if (status === 'failed') {
        const failReason = checkJson.error || checkJson.data?.error || '未知原因'
        console.error('[GrsAI] 生成失败:', failReason)
        throw new Error(`GrsAI 生成失败（${failReason}），已触发积分回滚。`)
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    } catch (error: any) {
      console.error(`[GrsAI] Poll attempt ${i + 1} error:`, error.message)
      if (i === maxRetries - 1) {
        throw new Error(`GrsAI 任务超时（${maxRetries} 次轮询均失败）：${error.message}`)
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  throw new Error('GrsAI 任务超时，请稍后重试。')
}

async function upscaleImage(imageUrl: string, scale: number): Promise<string> {
  if (!REPLICATE_API_TOKEN) {
    console.error('[Upscale] REPLICATE_API_TOKEN not configured, skipping upscale')
    return imageUrl
  }

  console.log(`[Upscale] Starting ${scale}x upscale for:`, imageUrl.substring(0, 100))

  try {
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
      console.error('[Upscale] Failed to create prediction:', createData)
      return imageUrl
    }

    const predictionId = createData.id
    console.log('[Upscale] Prediction created:', predictionId)

    let status = createData.status
    let outputUrl = null

    while (status !== 'succeeded' && status !== 'failed') {
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
        },
      })

      const statusData = await statusResponse.json()
      status = statusData.status

      console.log('[Upscale] Polling status:', status)

      if (status === 'succeeded') {
        outputUrl = statusData.output
        console.log('[Upscale] Upscale succeeded:', outputUrl?.substring(0, 100))
      } else if (status === 'failed') {
        console.error('[Upscale] Upscale failed:', statusData.error)
        return imageUrl
      }
    }

    return outputUrl || imageUrl
  } catch (error: any) {
    console.error('[Upscale] Upscale error:', error.message)
    return imageUrl
  }
}

async function generateSingleImage(
  sentence: string,
  styleName: string,
  customStyle: string | undefined,
  imageSize: string,
  modelName: string,
  modelType: string,
  resolution: string,
  index: number,
  referenceImage?: string,
): Promise<string> {
  console.log(`[Generate] Item ${index}: ${sentence}`)

  const isImageMode = Boolean(referenceImage)
  const finalPrompt = buildFinalPrompt(sentence, styleName, customStyle, isImageMode)
  console.log(`[Generate] Item ${index} final prompt: ${finalPrompt.substring(0, 100)}...`)

  const taskId = await submitGrsTask(finalPrompt, imageSize, modelName, modelType, resolution, referenceImage)
  console.log(`[Generate] Item ${index} task submitted: ${taskId}`)

  const imageUrl = await pollGrsResult(taskId)
  console.log(`[Generate] Item ${index} image generated: ${imageUrl}`)

  return imageUrl
}

async function checkVipPermission(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn('[VIP] Supabase admin not configured, allowing VIP access in demo mode')
    return true
  }

  try {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('vip_level, credits, email')
      .eq('id', userId)
      .single()

    if (profileError || !profileData) {
      console.warn('[VIP] Profile not found or no VIP info, treating as non-VIP')
      return false
    }

    if (isAdminEmail(profileData.email)) {
      console.log('[VIP] Admin user detected, granting VIP access')
      return true
    }

    if (profileData.vip_level && profileData.vip_level >= 1) {
      console.log('[VIP] User has vip_level >= 1, granting VIP access')
      return true
    }

    const hasEnoughCredits = (profileData.credits || 0) >= 8
    console.log('[VIP] User VIP check (fallback):', { userId, credits: profileData.credits, hasEnoughCredits })
    return hasEnoughCredits
  } catch (error) {
    console.error('[VIP] VIP check failed:', error)
    return false
  }
}

async function deductCredits(
  userId: string,
  amount: number,
): Promise<{ success: boolean; currentCredits: number; profileId: string }> {
  if (!supabaseAdmin) {
    console.warn('[Deduct] Supabase admin not configured, skipping deduction in demo mode')
    return { success: true, currentCredits: 9999, profileId: userId }
  }

  try {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, credits')
      .eq('id', userId)
      .single()

    if (profileError || !profileData) {
      console.error('[Deduct] Profile not found')
      return { success: false, currentCredits: 0, profileId: '' }
    }

    const profileId = profileData.id
    const currentCredits = profileData.credits || 0

    if (currentCredits < amount) {
      console.error('[Deduct] Insufficient credits:', { currentCredits, required: amount })
      return { success: false, currentCredits, profileId }
    }

    const newCredits = currentCredits - amount
    const { error: deductError } = await supabaseAdmin
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', profileId)
      .eq('credits', currentCredits)

    if (deductError) {
      console.error('[Deduct] Deduct failed:', deductError)
      return { success: false, currentCredits, profileId }
    }

    console.log('[Deduct] Credits deducted:', { userId, amount, remaining: newCredits })
    return { success: true, currentCredits: newCredits, profileId }
  } catch (error) {
    console.error('[Deduct] Database error:', error)
    return { success: false, currentCredits: 0, profileId: '' }
  }
}

async function rollbackCredits(profileId: string, amount: number): Promise<void> {
  if (!supabaseAdmin || !profileId) {
    console.warn('[Rollback] Supabase admin not configured or no profileId, skipping rollback')
    return
  }

  try {
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('id', profileId)
      .single()

    if (!currentProfile) {
      console.error('[Rollback] Profile not found for rollback')
      return
    }

    const rollbackAmount = (currentProfile.credits || 0) + amount
    const { error: rollbackError } = await supabaseAdmin
      .from('profiles')
      .update({ credits: rollbackAmount })
      .eq('id', profileId)

    if (rollbackError) {
      console.error('[Rollback] Failed to rollback:', rollbackError)
    } else {
      console.log('[Rollback] Credits rolled back successfully:', { profileId, amount, restoredTo: rollbackAmount })
    }
  } catch (error) {
    console.error('[Rollback] Database error:', error)
  }
}

export async function POST(request: NextRequest) {
  let currentCredits = 0
  let profileId = ''
  let totalCost = 0
  let creditsDeducted = false

  try {
    const body: GenerateRequest = await timeoutPromise(request.json(), 10000)
    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const userId = auth.user.id
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    console.log('[Security] Request received:', { userId, ip, timestamp: Date.now() })

    const {
      inputContents = [],
      referenceImages = [],
      styleName,
      customStyle,
      aspectRatio,
      modelType,
      resolution,
    } = body

    const isTextMode = inputContents.length > 0
    const isImageMode = referenceImages.length > 0

    if (!isTextMode && !isImageMode) {
      return NextResponse.json(
        { success: false, error: '必须提供文案内容或参考图片。' },
        { status: 400 },
      )
    }

    if (!styleName) {
      return NextResponse.json(
        { success: false, error: '缺少风格参数。' },
        { status: 400 },
      )
    }

    const allPrompts = isTextMode ? inputContents.join('\n') : referenceImages.join('\n') || '[Image Mode]'

    const isBanned = await isUserCurrentlyBanned(userId)
    if (isBanned) {
      return NextResponse.json(
        { success: false, error: '账号因恶意刷词已触发安全限制，24 小时内无法继续使用。' },
        { status: 403 },
      )
    }

    if (detectSensitiveWords(allPrompts)) {
      const shouldBan = await recordSensitiveWordViolation({
        userId,
        ipAddress: ip,
        prompt: allPrompts,
      })

      await deductCredits(userId, 2)

      const errorMessage = shouldBan
        ? '检测到违禁词汇，生成失败。账号因多次违规已被临时封禁。'
        : '检测到违禁词汇，生成失败。请调整内容后重试。'

      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 })
    }

    const is4K = resolution === '4K'
    const isVipModel = modelType.toLowerCase().includes('vip') || is4K

    if (isVipModel) {
      const isVip = await checkVipPermission(userId)
      if (!isVip) {
        return NextResponse.json(
          { success: false, error: '无权使用 VIP 4K 极清功能，请充值高级卡密解锁。' },
          { status: 403 },
        )
      }
    }

    const costPerImage = getResolutionPrice(resolution)
    const targetImageSize = getImageSizeByResolution(resolution, aspectRatio)
    const modelName = getModelName(modelType, resolution)

    const sentences = isTextMode
      ? inputContents.filter((item) => item && item.trim().length > 0)
      : []

    const totalImageCount = isTextMode ? sentences.length : referenceImages.length
    totalCost = totalImageCount * costPerImage

    console.log('[Generate] Total images to generate:', totalImageCount)
    console.log('[Generate] Cost per image:', costPerImage)
    console.log('[Generate] Total cost:', totalCost)
    console.log('[Generate] Resolution:', resolution)
    console.log('[Generate] AspectRatio:', aspectRatio, '-> ImageSize:', targetImageSize)
    console.log('[Generate] Model:', modelName)

    const deductResult = await deductCredits(userId, totalCost)
    if (!deductResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `余额不足，需要 ${totalCost} 积分，当前仅剩 ${deductResult.currentCredits} 积分，请充值后重试。`,
          creditsRemaining: deductResult.currentCredits,
        },
        { status: 400 },
      )
    }

    currentCredits = deductResult.currentCredits
    profileId = deductResult.profileId
    creditsDeducted = true

    const imageUrls: string[] = []
    const finalPrompts: string[] = []
    let firstError: string | null = null

    try {
      if (isTextMode && sentences.length > 0) {
        const generationPromises = sentences.map((sentence, index) =>
          generateSingleImage(
            sentence,
            styleName,
            customStyle,
            targetImageSize,
            modelName,
            modelType,
            resolution,
            index,
          )
            .then((url) => ({ url, error: null as Error | null }))
            .catch((error) => {
              console.error(`[Generate] Failed to generate image for sentence ${index}:`, error)
              return { url: null, error: error as Error }
            }),
        )

        const results = await Promise.all(generationPromises)
        for (const result of results) {
          if (result.url) {
            imageUrls.push(result.url)
          } else if (result.error && !firstError) {
            firstError = result.error instanceof Error ? result.error.message : String(result.error)
          }
        }

        for (const sentence of sentences) {
          finalPrompts.push(buildFinalPrompt(sentence, styleName, customStyle))
        }
      } else if (isImageMode) {
        const generationPromises = referenceImages.map((referenceImage, index) => {
          const imagePrompt = buildFinalPrompt(`参考图风格转换与内容重构 #${index + 1}`, styleName, customStyle, true)
          finalPrompts.push(imagePrompt)

          return submitGrsTask(
            imagePrompt,
            targetImageSize,
            modelName,
            modelType,
            resolution,
            referenceImage,
          )
            .then((taskId) => pollGrsResult(taskId))
            .then((url) => ({ url, error: null as Error | null }))
            .catch((error) => {
              console.error(`[Generate] Failed to generate image for reference ${index}:`, error)
              return { url: null, error: error as Error }
            })
        })

        const results = await Promise.all(generationPromises)
        for (const result of results) {
          if (result.url) {
            imageUrls.push(result.url)
          } else if (result.error && !firstError) {
            firstError = result.error instanceof Error ? result.error.message : String(result.error)
          }
        }
      }

      if (imageUrls.length === 0) {
        throw new Error(firstError || '所有图片生成均失败。')
      }

      if ((resolution === '2K' || resolution === '4K') && REPLICATE_API_TOKEN) {
        const scale = resolution === '2K' ? 2 : 4
        console.log(`[Generate] Starting ${resolution} upscale (${scale}x) for all images...`)

        const upscaledUrls = await Promise.all(
          imageUrls.map((url, index) =>
            upscaleImage(url, scale)
              .then((upscaledUrl) => {
                console.log(`[Generate] Image ${index} upscaled to ${resolution}:`, upscaledUrl?.substring(0, 100))
                return upscaledUrl
              })
              .catch((error) => {
                console.error(`[Generate] Upscale failed for image ${index}:`, error.message)
                return url
              }),
          ),
        )

        for (let i = 0; i < upscaledUrls.length; i += 1) {
          if (upscaledUrls[i] && upscaledUrls[i] !== imageUrls[i]) {
            imageUrls[i] = upscaledUrls[i]
          }
        }

        console.log(`[Generate] All images upscaled to ${resolution}`)
      }
    } catch (generationError: any) {
      console.error('[Generate] Image generation failed:', generationError.message)

      if (creditsDeducted) {
        await rollbackCredits(profileId, totalCost)
      }

      return NextResponse.json(
        {
          success: false,
          error: generationError.message || '图片生成失败，积分已退回。',
          creditsRemaining: currentCredits + totalCost,
        },
        { status: 500 },
      )
    }

    console.error('[DEBUG-API-GEN-DB-INSERT] Attempting to save record:', {
      userId,
      imageCount: imageUrls.length,
      firstImageUrl: imageUrls[0]?.substring(0, 100),
      resolution,
      modelName,
      supabaseAdminExists: !!supabaseAdmin,
    })

    if (supabaseAdmin) {
      const recordData = {
        user_id: userId,
        prompt: isTextMode ? inputContents.join('\n') : '[Image Mode]',
        style_name: styleName,
        style_prompt: finalPrompts.join('\n---\n'),
        model: modelName,
        image_count: imageUrls.length,
        image_urls: JSON.stringify(imageUrls),
        status: 'success',
        resolution,
      }

      console.error('[DEBUG-API-GEN-DB-INSERT-DATA] Record data:', JSON.stringify(recordData).substring(0, 500))

      const { error: recordError, data: recordDataResult } = await supabaseAdmin
        .from('generation_records')
        .insert(recordData)
        .select()

      if (recordError) {
        console.error('[DEBUG-API-GEN-DB-ERROR] Failed to create generation record:', {
          error: recordError,
          errorMessage: recordError.message,
          errorCode: recordError.code,
          errorDetails: recordError.details,
        })
      } else {
        console.error('[DEBUG-API-GEN-DB-SUCCESS] Record saved successfully:', {
          recordId: recordDataResult?.[0]?.id,
        })
      }
    } else {
      console.error('[DEBUG-API-GEN-DB-NO-ADMIN] supabaseAdmin is not initialized!')
    }

    console.log('[Generate] Generation complete:', imageUrls.length, 'images,', totalCost, 'credits deducted')

    const responsePayload = {
      success: true,
      imageUrls,
      imageUrl: imageUrls[0],
      creditsRemaining: currentCredits,
    }
    console.error('[DEBUG-API-GEN-RESPONSE] Returning to frontend:', JSON.stringify(responsePayload).substring(0, 500))

    return NextResponse.json(responsePayload)
  } catch (error: any) {
    console.error('[Generate] API error:', error.message, error.stack)

    if (creditsDeducted && profileId) {
      await rollbackCredits(profileId, totalCost)
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '服务端错误，请稍后重试。',
        creditsRemaining: creditsDeducted ? currentCredits + totalCost : currentCredits,
      },
      { status: 500 },
    )
  }
}
