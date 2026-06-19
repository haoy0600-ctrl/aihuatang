import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { HANDDRAWN_STYLES } from '@/config/styles'

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
  const sentences: string[] = []
  
  const numberedPattern = /(\(\d+\)|[\u2460-\u2468]\.|[\u3007\u00b7\u002e]\d+|^\s*\d+\.\s*)/gm
  const lines = text.split('\n').filter(line => line.trim())
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    
    const matches: { start: number; end: number; text: string }[] = []
    let match
    while ((match = numberedPattern.exec(trimmedLine)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      })
    }
    
    if (matches.length > 0) {
      matches.forEach((m, i) => {
        const nextMatch = matches[i + 1]
        const content = trimmedLine.substring(m.end, nextMatch?.start).trim()
        if (content) {
          sentences.push(content)
        }
      })
    } else {
      sentences.push(trimmedLine)
    }
  }
  
  return sentences.length > 0 ? sentences : [text]
}

function getStyleByName(styleName: string) {
  return HANDDRAWN_STYLES.find(s => s.name === styleName)
}

function buildFinalPrompt(translatedText: string, styleName: string, customStyle?: string): string {
  if (customStyle && customStyle.trim()) {
    return `${translatedText}, ${customStyle.trim()}`
  }

  const style = getStyleByName(styleName)
  if (style) {
    const styleKeywords = style.styleKeywords || ''
    const layoutDirectives = style.layoutDirectives || ''
    return `${translatedText}, ${styleKeywords}, ${layoutDirectives}, neat infographic layout, zero text bleeding, clean vector style, abstract icon placeholders instead of text`
  }

  return `${translatedText}, cartoon hand-drawn style, cute illustration, vibrant pastel colors, clean thick line art, neat infographic layout`
}

async function submitWuyinTask(prompt: string, aspectRatio: string, modelType: string): Promise<string> {
  const url = modelType === 'NanoBanana2' || modelType === 'nanobanana' 
    ? WUYIN_IMAGE_TO_IMAGE_URL 
    : WUYIN_TEXT_TO_IMAGE_URL

  const body = {
    prompt: prompt,
    size: aspectRatio,
    count: 1,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': IMAGE_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Wuyin API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()

  if (data.code !== 200 || !data.data?.id) {
    throw new Error(`Wuyin API error: ${data.msg || 'Failed to submit task'}`)
  }

  return data.data.id
}

async function pollWuyinResult(taskId: string): Promise<string> {
  const maxRetries = 60
  const retryDelay = 3000

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

    if (isTextMode && sentences.length > 0) {
      const generationPromises = sentences.map((sentence, index) => 
        generateSingleImage(sentence, styleName, customStyle, aspectRatio, modelType, userId, index)
          .then(url => ({ url, index }))
          .catch(error => {
            console.error(`Failed to generate image for sentence ${index}:`, error)
            return { url: null, index, error }
          })
      )

      const results = await Promise.all(generationPromises)

      for (const result of results) {
        if (result.url) {
          imageUrls.push(result.url)
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

      const taskId = await submitWuyinTask(prompt, aspectRatio, modelType)
      const originUrl = await pollWuyinResult(taskId)
      const permanentUrl = await downloadAndUploadToSupabase(originUrl, userId, 0)
      imageUrls.push(permanentUrl)
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: '所有图片生成均失败，请重试' },
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
