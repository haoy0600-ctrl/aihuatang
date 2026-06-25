import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { HANDDRAWN_STYLES } from '@/config/styles'
import { requireAuthenticatedUser } from '@/lib/auth'

export const maxDuration = 300

const GRS_API_KEY = process.env.GRSAI_API_KEY || ''
const GRS_API_BASE_URL = (process.env.GRS_API_BASE_URL || 'https://grsapiapi.com').replace(/\/+$/, '')

function timeoutPromise<T>(promise: Promise<T>, ms: number, label: string = '请求'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error(`[${label}] 超时，超过 ${ms}ms`)
      reject(new Error(`请求超时，超过 ${ms}ms`))
    }, ms)
    promise.then(
      (result) => {
        clearTimeout(timer)
        resolve(result)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
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
        console.error(`[${label}] 请求被中止 (超时 ${timeoutMs}ms)`)
        throw new Error(`${label}请求超时，请稍后重试`)
      }
      console.error(`[${label}] fetch错误:`, error.message, 'URL:', url)
      throw error
    })
}

function getResolutionPrice(resolution: string): number {
  switch (resolution) {
    case '1K': return 2
    case '2K': return 4
    case '4K': return 8
    default: return 2
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

function getModelName(modelType: string, resolution: string): string {
  const is4K = resolution === '4K'
  
  if (modelType.toLowerCase().includes('banana')) {
    if (is4K) {
      return modelType === 'NanoBanana2' ? 'nano-banana-pro-4k-vip' : 'nano-banana-pro-4k-vip'
    }
    return 'nano-banana-pro'
  }
  
  if (is4K) {
    return 'gpt-image-2-vip'
  }
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
  return HANDDRAWN_STYLES.find(s => s.name === styleName)
}

function buildFinalPrompt(inputText: string, styleName: string, customStyle?: string, isImageMode: boolean = false): string {
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
    const imagePrompt = `
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
`;
    return imagePrompt
  }

  const finalPromptForAI = `
[CORE SUBJECT & TEXT COMPLIANCE]
You must strictly render and layout the following explicit text content. The text clarity is the highest priority of this image. Do not distort, do not omit, do not hallucinate any characters:
"${userText}"

[VISUAL BACKGROUND & STYLE ENVIRONMENT]
Render the ambient background, textures, color palette, and artistic medium strictly according to the style guidelines below. However, this style MUST NOT interfere with the legibility of the core text above. Keep the text area clean, high-contrast, and solid baseline:
${activeStyle}

[NEGATIVE REINFORCEMENT]
low resolution, blurry text, chaotic layout, compressed artifact, deformed characters, text bleeding into background color.
`;

  return finalPromptForAI
}

async function submitGrsTask(
  prompt: string,
  imageSize: string,
  modelName: string,
  modelType: string,
  resolution: string,
  referenceImage?: string
): Promise<string> {
  const isImageMode = !!referenceImage
  const is4K = resolution === '4K'
  const isBanana = modelType.toLowerCase().includes('banana')
  
  const drawUrl = isBanana
    ? `${GRS_API_BASE_URL}/v1/draw/nano-banana`
    : `${GRS_API_BASE_URL}/v1/draw/completions`

  const payload: any = {
    model: modelName,
    prompt: prompt,
    imageSize: imageSize,
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
    timestamp: Date.now() 
  })

  if (!GRS_API_KEY) {
    console.error('[GrsAI] GRS_API_KEY 未配置')
    throw new Error('GRS_API_KEY 未配置，请联系管理员')
  }

  try {
    const response = await fetchWithTimeout(drawUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GRS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }, 60000, 'GrsAI提交任务')

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[GrsAI] API request failed: status=${response.status}, body=${errorText}`)
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`GrsAI API 异常(${response.status})，将执行积分回滚: ${errorText.substring(0, 200)}`)
      }
      throw new Error(`GrsAI API 请求失败: ${response.status} - ${errorText.substring(0, 200)}`)
    }

    const responseText = await timeoutPromise(response.text().then(t => { console.log('[GrsAI] raw response:', t.substring(0, 500)); return t }), 30000, 'GrsAI读取响应')
    
    let taskJson
    try {
      taskJson = JSON.parse(responseText)
    } catch {
      console.error('[GrsAI] JSON解析失败, raw:', responseText.substring(0, 500))
      throw new Error('GrsAI 返回了无效的JSON响应')
    }

    if (!taskJson.data || !taskJson.data.id) {
      const msg = taskJson.message || taskJson.error || 'GrsAI 任务创建失败(无taskId)'
      console.error('[GrsAI] 任务创建失败:', msg, '完整响应:', JSON.stringify(taskJson).substring(0, 500))
      throw new Error(msg)
    }

    console.log('[GrsAI] 任务创建成功, taskId:', taskJson.data.id)
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

  for (let i = 0; i < maxRetries; i++) {
    try {
      const checkRes = await fetchWithTimeout(pollUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GRS_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: taskId }),
      }, 30000, `GrsAI轮询${i + 1}/${maxRetries}`)

      if (!checkRes.ok) {
        const errorText = await checkRes.text()
        console.error(`[GrsAI] Poll failed: status=${checkRes.status}, body=${errorText.substring(0, 200)}`)
        if (checkRes.status === 429 || checkRes.status >= 500) {
          throw new Error(`GrsAI 轮询异常(${checkRes.status})`)
        }
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        continue
      }

      const checkJson = await timeoutPromise(checkRes.json(), 15000, 'GrsAI解析轮询响应')
      console.log(`[GrsAI] poll ${i + 1}/${maxRetries}: status=${checkJson.status || checkJson.data?.status}`)

      const results = checkJson.results || checkJson.data?.results
      const status = checkJson.status || checkJson.data?.status

      if (status === 'succeeded' && results && results[0]) {
        console.log('[GrsAI] 生成成功, 图片URL:', results[0].url ? results[0].url.substring(0, 100) + '...' : '无URL')
        return results[0].url
      }

      if (status === 'failed') {
        const failReason = checkJson.error || checkJson.data?.error || '未知原因'
        console.error('[GrsAI] 生成失败:', failReason)
        throw new Error(`GrsAI 官方节点提示生成失败(${failReason})，已执行免扣费退款`)
      }

      await new Promise(resolve => setTimeout(resolve, retryDelay))
    } catch (error: any) {
      console.error(`[GrsAI] Poll attempt ${i + 1} error:`, error.message)
      if (i === maxRetries - 1) {
        throw new Error(`GrsAI 任务超时(${maxRetries}次轮询均失败): ${error.message}`)
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
  }

  throw new Error('GrsAI 任务超时，请点击二次生成')
}

async function downloadAndUploadToSupabase(imageUrl: string, userId: string, index: number): Promise<string> {
  try {
    const imageResponse = await timeoutPromise(fetch(imageUrl), 30000)

    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`)
    }

    const arrayBuffer = await timeoutPromise(imageResponse.arrayBuffer(), 30000)
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer)

    const timestamp = Date.now()
    const fileName = `${userId}/${timestamp}-${index}.png`

    if (!supabaseAdmin) {
      console.warn('[Supabase] Supabase admin not configured, skipping upload. Returning original URL.')
      return imageUrl
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('handdrawn-images')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '31536000',
        upsert: false,
      })

    if (uploadError) {
      console.error('[Supabase] Storage upload failed:', uploadError)
      return imageUrl
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('handdrawn-images')
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      console.warn('[Supabase] Failed to get public URL, returning original URL')
      return imageUrl
    }

    return urlData.publicUrl
  } catch (error: any) {
    console.error('[Supabase] downloadAndUploadToSupabase error:', error.message)
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
  userId: string,
  index: number,
  referenceImage?: string
): Promise<string> {
  const translatedText = sentence
  console.log(`[Generate] Sentence ${index}: ${translatedText}`)

  const isImageMode = !!referenceImage
  const finalPrompt = buildFinalPrompt(translatedText, styleName, customStyle, isImageMode)
  console.log(`[Generate] Sentence ${index} final prompt: ${finalPrompt.substring(0, 100)}...`)

  const taskId = await submitGrsTask(finalPrompt, imageSize, modelName, modelType, resolution, referenceImage)
  console.log(`[Generate] Sentence ${index} task submitted: ${taskId}`)

  const originImageUrl = await pollGrsResult(taskId)
  console.log(`[Generate] Sentence ${index} image generated: ${originImageUrl}`)

  const permanentUrl = await downloadAndUploadToSupabase(originImageUrl, userId, index)
  console.log(`[Generate] Sentence ${index} image uploaded: ${permanentUrl}`)

  return permanentUrl
}

async function checkVipPermission(userId: string): Promise<boolean> {
  if (!supabaseAdmin) {
    console.warn('[VIP] Supabase admin not configured, allowing VIP access in demo mode')
    return true
  }

  try {
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('vip_level')
      .eq('id', userId)
      .single()

    if (profileError || !profileData) {
      console.warn('[VIP] Profile not found or no VIP info, treating as non-VIP')
      return false
    }

    const vipLevel = profileData.vip_level || 0
    const isVip = vipLevel >= 1
    console.log('[VIP] User VIP check:', { userId, vipLevel, isVip })
    return isVip
  } catch (error) {
    console.error('[VIP] VIP check failed:', error)
    return false
  }
}

async function deductCredits(userId: string, amount: number): Promise<{ success: boolean; currentCredits: number; profileId: string }> {
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

    const rollbackCredits = (currentProfile.credits || 0) + amount
    const { error: rollbackError } = await supabaseAdmin
      .from('profiles')
      .update({ credits: rollbackCredits })
      .eq('id', profileId)

    if (rollbackError) {
      console.error('[Rollback] Failed to rollback:', rollbackError)
    } else {
      console.log('[Rollback] Credits rolled back successfully:', { profileId, amount, restoredTo: rollbackCredits })
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
    const {
      inputContents = [],
      referenceImages = [],
      styleName,
      customStyle,
      aspectRatio,
      modelType,
      resolution,
      imageSize,
      mode,
    } = body

    const isTextMode = inputContents.length > 0
    const isImageMode = referenceImages.length > 0

    if (!isTextMode && !isImageMode) {
      return NextResponse.json(
        { success: false, error: 'Either inputContents or referenceImages is required' },
        { status: 400 }
      )
    }

    if (!styleName) {
      return NextResponse.json(
        { success: false, error: 'Missing style parameters' },
        { status: 400 }
      )
    }

    const is4K = resolution === '4K'
    const isVipModel = modelType.toLowerCase().includes('vip') || is4K

    if (isVipModel) {
      const isVip = await checkVipPermission(userId)
      if (!isVip) {
        return NextResponse.json(
          { success: false, error: '无权使用 VIP 4K 功能，请充值高级卡密' },
          { status: 403 }
        )
      }
    }

    const costPerImage = getResolutionPrice(resolution)
    const targetImageSize = getImageSizeByResolution(resolution, aspectRatio)
    const modelName = getModelName(modelType, resolution)

    let sentences: string[] = []

    if (isTextMode) {
      sentences = inputContents.filter(s => s && s.trim().length > 0)
      console.log('[Generate] Valid text segments:', sentences.length)
    }

    const totalImageCount = isTextMode ? sentences.length : (isImageMode ? 1 : 1)
    totalCost = totalImageCount * costPerImage

    console.log('[Generate] Total images to generate:', totalImageCount)
    console.log('[Generate] Cost per image:', costPerImage)
    console.log('[Generate] Total cost:', totalCost)
    console.log('[Generate] Resolution:', resolution)
    console.log('[Generate] AspectRatio:', aspectRatio, '→ ImageSize:', targetImageSize)
    console.log('[Generate] Model:', modelName)

    const deductResult = await deductCredits(userId, totalCost)
    if (!deductResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: `余额不足！需要 ${totalCost} 积分，当前 ${deductResult.currentCredits} 积分，请充值后重试`,
          creditsRemaining: deductResult.currentCredits,
        },
        { status: 400 }
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
          generateSingleImage(sentence, styleName, customStyle, targetImageSize, modelName, modelType, resolution, userId, index)
            .then(url => ({ url, index, error: null as Error | null }))
            .catch(error => {
              console.error(`[Generate] Failed to generate image for sentence ${index}:`, error)
              return { url: null, index, error: error as Error }
            })
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
        const imgPrompt = buildFinalPrompt('参考图片风格转换与内容重构', styleName, customStyle, true)
        finalPrompts.push(imgPrompt)

        const firstReferenceImage = referenceImages[0]
        const taskId = await submitGrsTask(imgPrompt, targetImageSize, modelName, modelType, resolution, firstReferenceImage)
        const originUrl = await pollGrsResult(taskId)
        const permanentUrl = await downloadAndUploadToSupabase(originUrl, userId, 0)
        imageUrls.push(permanentUrl)
      }

      if (imageUrls.length === 0) {
        throw new Error(firstError || '所有图片生成均失败')
      }

    } catch (generationError: any) {
      console.error('[Generate] Image generation failed:', generationError.message)

      if (creditsDeducted) {
        await rollbackCredits(profileId, totalCost)
      }

      return NextResponse.json(
        {
          success: false,
          error: generationError.message || '图片生成失败，积分已退回',
          creditsRemaining: currentCredits + totalCost,
        },
        { status: 500 }
      )
    }

    if (supabaseAdmin) {
      const { error: recordError } = await supabaseAdmin
        .from('generation_records')
        .insert({
          user_id: userId,
          prompt: isTextMode ? inputContents.join('\n') : '[Image Mode]',
          style_name: styleName,
          style_prompt: finalPrompts.join('\n---\n'),
          model: modelName,
          image_count: imageUrls.length,
          image_urls: JSON.stringify(imageUrls),
          status: 'success',
          resolution: resolution,
        })

      if (recordError) {
        console.error('[Generate] Failed to create generation record:', recordError)
      }
    }

    console.log('[Generate] Generation complete:', imageUrls.length, 'images,', totalCost, 'credits deducted')

    return NextResponse.json({
      success: true,
      imageUrls: imageUrls,
      imageUrl: imageUrls[0],
      creditsRemaining: currentCredits,
    })

  } catch (error: any) {
    console.error('[Generate] API error:', error.message, error.stack)

    if (creditsDeducted && profileId) {
      await rollbackCredits(profileId, totalCost)
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '服务端错误，请稍后重试',
        creditsRemaining: creditsDeducted ? currentCredits + totalCost : currentCredits,
      },
      { status: 500 }
    )
  }
}
