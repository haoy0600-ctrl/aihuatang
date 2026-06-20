import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { HANDDRAWN_STYLES } from '@/config/styles'

export const maxDuration = 300

const IMAGE_API_KEY = process.env.IMAGE_API_KEY || ''

const WUYIN_TEXT_TO_IMAGE_URL = 'https://api.wuyinkeji.com/api/async/image_gpt'
const WUYIN_IMAGE_TO_IMAGE_URL = 'https://api.wuyinkeji.com/api/async/image_nanoBanana2'
const WUYIN_ASYNC_DETAIL_URL = 'https://api.wuyinkeji.com/api/async/detail'

const MODEL_COST: Record<string, number> = {
  'GPT-Image-2': 3,
  'NanoBanana2': 3,
  'image2': 3,
  'nanobanana': 3,
}

type GenerateRequest = {
  userId: string
  inputContents: string[]
  referenceImages: string[]
  styleName: string
  customStyle?: string
  aspectRatio: string
  modelType: string
}

function splitTextToSentences(text: string): string[] {
  // 完全禁用自动切分逻辑
  // 用户输入的所有文本（包括换行、空格等格式）100%保留在当前卡上
  // 只有当用户主动点击 "+" 添加新的 Tab 时，才会在新卡片上渲染
  const trimmedText = text.trim()
  if (!trimmedText) {
    return []
  }
  return [trimmedText]
}

function getStyleByName(styleName: string) {
  return HANDDRAWN_STYLES.find(s => s.name === styleName)
}

function buildFinalPrompt(inputText: string, styleName: string, customStyle?: string): string {
  if (customStyle && customStyle.trim()) {
    return customStyle.trim()
  }

  const style = getStyleByName(styleName)
  const selectedStylePrompt = style 
    ? `${style.styleKeywords || ''}, ${style.layoutDirectives || ''}`
    : 'cartoon hand-drawn style, cute illustration, vibrant pastel colors, clean thick line art, neat infographic layout'

  const userText = inputText.trim()

  // 1. 严格锁死用户核心文字内容
  const TEXT_CONTENT_LOCK = `
[STRICT TEXT CONTENT TO RENDER]
${userText}
[END OF TEXT CONTENT]
`

  // 2. 注入全局硬控版面指令与风格
  const SYSTEM_LAYOUT_RULE = `
[MANDATORY LAYOUT RULES]
1. You MUST explicitly and accurately render the text provided inside the [STRICT TEXT CONTENT TO RENDER] tag word for word on the image canvas.
2. DO NOT invent, hallucinate, or use filler text like 'Hello', 'Aurora', 'Dashboard', or generic UI text.
3. The chosen artistic style below must ONLY apply to the background texture, visual mood, and color palette. The text inside the tag is the absolute centerpiece.
4. NEVER generate a mobile app UI, dashboard interface, or any device mockup. The output must be a flat illustration or infographic card.
[END OF RULES]

[ARTISTIC STYLE TO APPLY]
${selectedStylePrompt}, professional educational infographic, clean layout, high quality, masterpiece
[END OF STYLE]
`

  // 3. 最终完美组装
  return `${TEXT_CONTENT_LOCK}\n${SYSTEM_LAYOUT_RULE}`
}

async function submitWuyinTask(prompt: string, aspectRatio: string, modelType: string, referenceImage?: string): Promise<string> {
  const isImageMode = !!referenceImage
  const url = isImageMode 
    ? WUYIN_IMAGE_TO_IMAGE_URL 
    : WUYIN_TEXT_TO_IMAGE_URL

  const body: Record<string, any> = {
    prompt: prompt,
    size: aspectRatio,
  }

  if (isImageMode && referenceImage) {
    body.urls = [referenceImage]
  }

  console.log('Wuyin API request:', { url, body: JSON.stringify(body) })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': IMAGE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const responseText = await response.text()
  console.log('Wuyin API response:', response.status, responseText)

  if (!response.ok) {
    throw new Error(`Wuyin API HTTP error: ${response.status} - ${responseText}`)
  }

  let data
  try {
    data = JSON.parse(responseText)
  } catch {
    throw new Error(`Wuyin API invalid JSON: ${responseText}`)
  }

  if (data.code !== 200 || !data.data?.id) {
    throw new Error(`Wuyin API error: ${data.msg || data.message || JSON.stringify(data)}`)
  }

  return data.data.id
}

async function pollWuyinResult(taskId: string): Promise<string> {
  const maxRetries = 120
  const retryDelay = 2000

  for (let i = 0; i < maxRetries; i++) {
    const url = `${WUYIN_ASYNC_DETAIL_URL}?key=${IMAGE_API_KEY}&id=${taskId}`
    
    const response = await fetch(url, { method: 'GET' })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Wuyin result API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    if (data.code !== 200) {
      throw new Error(`Wuyin result API error: ${data.msg || 'Unknown error'}`)
    }

    const status = data.data?.status

    if (status === 2) {
      const result = data.data?.result
      if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'string') {
        return result[0]
      }
      throw new Error('Wuyin API returned empty result')
    }

    if (status === 3) {
      throw new Error(`Wuyin task failed: ${data.data?.message || 'Unknown error'}`)
    }

    await new Promise(resolve => setTimeout(resolve, retryDelay))
  }

  throw new Error('Wuyin API timeout: task took too long')
}

async function downloadAndUploadToSupabase(imageUrl: string, userId: string, index: number): Promise<string> {
  const imageResponse = await fetch(imageUrl)

  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`)
  }

  const arrayBuffer = await imageResponse.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer as ArrayBuffer)

  const timestamp = Date.now()
  const fileName = `${userId}/${timestamp}-${index}.png`

  if (!supabaseAdmin) {
    console.warn('Supabase admin not configured, skipping upload. Returning original URL.')
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
    console.error('Supabase storage upload failed, returning original URL:', uploadError)
    return imageUrl
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('handdrawn-images')
    .getPublicUrl(fileName)

  if (!urlData?.publicUrl) {
    console.warn('Failed to get public URL, returning original URL')
    return imageUrl
  }

  return urlData.publicUrl
}

async function generateSingleImage(
  sentence: string,
  styleName: string,
  customStyle: string | undefined,
  aspectRatio: string,
  modelType: string,
  userId: string,
  index: number
): Promise<string> {
  const translatedText = sentence
  console.log(`Sentence ${index}: ${translatedText}`)

  const finalPrompt = buildFinalPrompt(translatedText, styleName, customStyle)
  console.log(`Sentence ${index} final prompt: ${finalPrompt}`)

  const taskId = await submitWuyinTask(finalPrompt, aspectRatio, modelType)
  console.log(`Sentence ${index} task submitted: ${taskId}`)

  const originImageUrl = await pollWuyinResult(taskId)
  console.log(`Sentence ${index} image generated: ${originImageUrl}`)

  const permanentUrl = await downloadAndUploadToSupabase(originImageUrl, userId, index)
  console.log(`Sentence ${index} image uploaded: ${permanentUrl}`)

  return permanentUrl
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const { 
      userId, 
      inputContents = [], 
      referenceImages = [],
      styleName, 
      customStyle,
      aspectRatio, 
      modelType 
    } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: userId' },
        { status: 400 }
      )
    }

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

    const costPerImage = MODEL_COST[modelType] || 3

    let sentences: string[] = []

    if (isTextMode) {
      const allText = inputContents.join('\n')
      sentences = splitTextToSentences(allText)
      console.log('Text split into sentences:', sentences.length)
      console.log('Sentences:', sentences)
    }

    const totalImageCount = isTextMode ? sentences.length : (referenceImages.length > 0 ? 1 : 1)
    const totalCost = totalImageCount * costPerImage

    console.log(`Total images to generate: ${totalImageCount}`)
    console.log(`Cost per image: ${costPerImage}`)
    console.log(`Total cost: ${totalCost}`)

    let currentCredits = 0
    let profileId = userId

    if (!supabaseAdmin) {
      console.warn('Supabase admin not configured, skipping credit check in demo mode')
      currentCredits = 9999
    } else {
      console.log('Checking profile for userId:', userId)
      
      let { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, credits')
        .eq('id', userId)
        .single()

      console.log('Profile query result:', { profile, profileError })

      if (profileError || !profile) {
        console.log('Profile not found, attempting to create for userId:', userId)
        
        const { error: insertError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: userId,
            credits: 3,
            email: '',
            created_at: new Date().toISOString(),
          })
        
        if (insertError) {
          console.error('Failed to create profile:', insertError)
          return NextResponse.json(
            { success: false, error: `您的账户不存在，请先注册 (${insertError.message})` },
            { status: 403 }
          )
        }

        profile = { id: userId, credits: 3 }
        console.log('Profile created successfully:', profile)
      }

      profileId = profile.id
      currentCredits = profile.credits

      console.log(`User credits: ${currentCredits}, Required: ${totalCost}`)

      if (profile.credits < totalCost) {
        return NextResponse.json(
          { 
            success: false, 
            error: `余额不足！需要 ${totalCost} 积分，当前 ${profile.credits} 积分，请充值后重试`,
            creditsRemaining: profile.credits,
            requiredCredits: totalCost
          },
          { status: 403 }
        )
      }
    }

    const imageUrls: string[] = []
    const finalPrompts: string[] = []
    let firstError: string | null = null

    if (isTextMode && sentences.length > 0) {
      const generationPromises = sentences.map((sentence, index) => 
        generateSingleImage(sentence, styleName, customStyle, aspectRatio, modelType, userId, index)
          .then(url => ({ url, index, error: null as Error | null }))
          .catch(error => {
            console.error(`Failed to generate image for sentence ${index}:`, error)
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
      const style = getStyleByName(styleName)
      const styleKeywords = style?.styleKeywords || ''
      const layoutDirectives = style?.layoutDirectives || ''
      const prompt = `reference image style transfer, ${styleKeywords}, ${layoutDirectives}`
      finalPrompts.push(prompt)

      const firstReferenceImage = referenceImages[0]
      const taskId = await submitWuyinTask(prompt, aspectRatio, modelType, firstReferenceImage)
      const originUrl = await pollWuyinResult(taskId)
      const permanentUrl = await downloadAndUploadToSupabase(originUrl, userId, 0)
      imageUrls.push(permanentUrl)
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: firstError || '所有图片生成均失败，请重试' },
        { status: 500 }
      )
    }

    const newCredits = currentCredits - totalCost

    if (supabaseAdmin) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', profileId)

      if (updateError) {
        console.error('Failed to update credits:', updateError)
      }

      const { error: recordError } = await supabaseAdmin
        .from('generation_records')
        .insert({
          user_id: userId,
          prompt: isTextMode ? inputContents.join('\n') : '[Image Mode]',
          style_name: styleName,
          style_prompt: finalPrompts.join('\n---\n'),
          model: modelType || 'GPT-Image-2',
          image_count: imageUrls.length,
          image_urls: JSON.stringify(imageUrls),
          status: 'success',
        })

      if (recordError) {
        console.error('Failed to create generation record:', recordError)
      }
    }

    console.log(`Generation complete: ${imageUrls.length} images, ${totalCost} credits deducted`)

    return NextResponse.json({
      success: true,
      imageUrls: imageUrls,
      imageUrl: imageUrls[0],
      creditsRemaining: newCredits,
      totalGenerated: imageUrls.length,
      sentencesCount: sentences.length,
    })

  } catch (error) {
    console.error('Generation error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

    return NextResponse.json(
      {
        success: false,
        error: `生成失败: ${errorMessage}`,
        message: '您的积分未被扣除，请重试',
      },
      {
        status: 500,
      }
    )
  }
}
