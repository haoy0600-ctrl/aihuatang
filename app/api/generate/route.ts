import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { HANDDRAWN_STYLES } from '@/config/styles'

export const maxDuration = 300

const GRS_API_KEY = process.env.GRSAI_API_KEY || ''
const BASE_URL = 'https://grsapiapi.com'

// 降价后计费规则：GPT-Image-2全线2积分，NanoBanana2按分辨率2/8积分
function getResolutionPrice(modelType: string, resolution: string): number {
  if (modelType === 'NanoBanana2') {
    return resolution === '1K' ? 2 : 8
  } else {
    return 2
  }
}

type GenerateRequest = {
  userId: string
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

function buildFinalPrompt(inputText: string, styleName: string, customStyle?: string): string {
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
  modelType: string,
  referenceImage?: string
): Promise<string> {
  const isImageMode = !!referenceImage
  const model = modelType === 'NanoBanana2' ? 'nano-banana-pro' : 'gpt-image-2'
  const drawUrl = modelType === 'NanoBanana2'
    ? `${BASE_URL}/v1/draw/nano-banana`
    : `${BASE_URL}/v1/draw/completions`

  const payload: any = {
    model: model,
    prompt: prompt,
    imageSize: imageSize,
    webHook: '-1',
  }

  if (isImageMode && referenceImage) {
    payload.images = [referenceImage]
  }

  console.log('GrsAI API request:', { url: drawUrl, model, imageSize, isImageMode })

  const response = await fetch(drawUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GRS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const responseText = await response.text()
  console.log('GrsAI task response:', response.status, responseText)

  let taskJson
  try {
    taskJson = JSON.parse(responseText)
  } catch {
    throw new Error('GrsAI returned invalid JSON')
  }

  if (!taskJson.data || !taskJson.data.id) {
    throw new Error(taskJson.message || 'GrsAI 任务创建失败')
  }

  return taskJson.data.id
}

async function pollGrsResult(taskId: string): Promise<string> {
  const maxRetries = 30
  const retryDelay = 4000

  for (let i = 0; i < maxRetries; i++) {
    const checkRes = await fetch(`${BASE_URL}/v1/draw/result`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GRS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: taskId }),
    })

    const checkJson = await checkRes.json()
    console.log(`GrsAI poll ${i + 1}/${maxRetries}: status=${checkJson.status || checkJson.data?.status}`)

    const results = checkJson.results || checkJson.data?.results
    const status = checkJson.status || checkJson.data?.status

    if (status === 'succeeded' && results && results[0]) {
      return results[0].url
    }

    if (status === 'failed') {
      throw new Error('GrsAI 官方节点提示生成失败，已执行免扣费退款')
    }

    await new Promise(resolve => setTimeout(resolve, retryDelay))
  }

  throw new Error('GrsAI 任务超时，请点击二次生成')
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
  imageSize: string,
  modelType: string,
  userId: string,
  index: number,
  referenceImage?: string
): Promise<string> {
  const translatedText = sentence
  console.log(`Sentence ${index}: ${translatedText}`)

  const finalPrompt = buildFinalPrompt(translatedText, styleName, customStyle)
  console.log(`Sentence ${index} final prompt: ${finalPrompt}`)

  const taskId = await submitGrsTask(finalPrompt, imageSize, modelType, referenceImage)
  console.log(`Sentence ${index} task submitted: ${taskId}`)

  const originImageUrl = await pollGrsResult(taskId)
  console.log(`Sentence ${index} image generated: ${originImageUrl}`)

  const permanentUrl = await downloadAndUploadToSupabase(originImageUrl, userId, index)
  console.log(`Sentence ${index} image uploaded: ${permanentUrl}`)

  return permanentUrl
}

export async function POST(request: NextRequest) {
  let currentCredits = 0
  let profileId = ''
  let profile: any = null
  let totalCost = 0
  let creditsDeducted = false

  try {
    const body: GenerateRequest = await request.json()
    const {
      userId,
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

    const costPerImage = getResolutionPrice(modelType, resolution)
    const targetImageSize = imageSize || '1440x2560'

    let sentences: string[] = []

    if (isTextMode) {
      sentences = inputContents.filter(s => s && s.trim().length > 0)
      console.log('Valid text segments:', sentences.length)
    }

    const totalImageCount = isTextMode ? sentences.length : (isImageMode ? 1 : 1)
    totalCost = totalImageCount * costPerImage

    console.log(`Total images to generate: ${totalImageCount}`)
    console.log(`Cost per image: ${costPerImage}`)
    console.log(`Total cost: ${totalCost}`)
    console.log(`Resolution: ${resolution}, ImageSize: ${targetImageSize}`)

    // ========================================
    // 核心安全逻辑：先扣费，再生成
    // ========================================
    if (!supabaseAdmin) {
      console.warn('Supabase admin not configured, skipping credit check in demo mode')
      currentCredits = 9999
    } else {
      try {
        // 查询用户积分
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id, credits')
          .eq('id', userId)
          .single()

        if (profileError || !profileData) {
          console.warn('Profile not found, creating new profile')
          const { data: newProfileData, error: newProfileError } = await supabaseAdmin
            .from('profiles')
            .insert({
              id: userId,
              credits: 3,
            })
            .select()
            .single()

          if (newProfileError || !newProfileData) {
            console.error('Failed to create profile:', newProfileError)
            return NextResponse.json(
              { success: false, error: 'Failed to initialize profile' },
              { status: 500 }
            )
          }
          profile = newProfileData
          profileId = newProfileData.id
        } else {
          profile = profileData
          profileId = profileData.id
        }

        currentCredits = profile.credits
        console.log(`User credits: ${currentCredits}, Required: ${totalCost}`)

        // 检查积分是否足够
        if (profile.credits < totalCost) {
          return NextResponse.json(
            {
              success: false,
              error: `余额不足！需要 ${totalCost} 积分，当前 ${profile.credits} 积分，请充值后重试`,
              creditsRemaining: profile.credits,
            },
            { status: 400 }
          )
        }

        // ========================================
        // 【核心安全】：先扣费，再生成
        // ========================================
        const newCredits = currentCredits - totalCost
        const { error: deductError } = await supabaseAdmin
          .from('profiles')
          .update({ credits: newCredits })
          .eq('id', profileId)
          .eq('credits', currentCredits) // 乐观锁，防止并发扣费

        if (deductError) {
          console.error('Failed to deduct credits (concurrent request or error):', deductError)
          return NextResponse.json(
            { success: false, error: '积分扣费失败，请稍后重试' },
            { status: 500 }
          )
        }

        creditsDeducted = true
        console.log(`Credits deducted: ${totalCost}, remaining: ${newCredits}`)

      } catch (dbError) {
        console.error('Database error:', dbError)
        return NextResponse.json(
          { success: false, error: 'Database error' },
          { status: 500 }
        )
      }
    }

    // ========================================
    // 扣费成功后，开始生成图片
    // ========================================
    const imageUrls: string[] = []
    const finalPrompts: string[] = []
    let firstError: string | null = null

    try {
      if (isTextMode && sentences.length > 0) {
        const generationPromises = sentences.map((sentence, index) =>
          generateSingleImage(sentence, styleName, customStyle, targetImageSize, modelType, userId, index)
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
        const imgPrompt = buildFinalPrompt('参考图片风格转换与内容重构', styleName, customStyle)
        finalPrompts.push(imgPrompt)

        const firstReferenceImage = referenceImages[0]
        const taskId = await submitGrsTask(imgPrompt, targetImageSize, modelType, firstReferenceImage)
        const originUrl = await pollGrsResult(taskId)
        const permanentUrl = await downloadAndUploadToSupabase(originUrl, userId, 0)
        imageUrls.push(permanentUrl)
      }

      // 如果所有图片都生成失败，回退积分
      if (imageUrls.length === 0) {
        throw new Error(firstError || '所有图片生成均失败')
      }

    } catch (generationError: any) {
      // ========================================
      // 【核心安全】：生成失败，回退积分
      // ========================================
      console.error('Image generation failed, rolling back credits:', generationError.message)

      if (creditsDeducted && supabaseAdmin) {
        const { data: currentProfile } = await supabaseAdmin
          .from('profiles')
          .select('credits')
          .eq('id', profileId)
          .single()

        if (currentProfile) {
          const rollbackCredits = (currentProfile.credits || 0) + totalCost
          await supabaseAdmin
            .from('profiles')
            .update({ credits: rollbackCredits })
            .eq('id', profileId)
          console.log(`Credits rolled back: ${totalCost}, restored to: ${rollbackCredits}`)
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: generationError.message || '图片生成失败，积分已退回',
          creditsRemaining: currentCredits, // 回退后的积分
        },
        { status: 500 }
      )
    }

    // ========================================
    // 生成成功，创建生成记录
    // ========================================
    const newCredits = currentCredits - totalCost

    if (supabaseAdmin) {
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
          resolution: resolution,
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
    })

  } catch (error: any) {
    console.error('Generate API error:', error)

    // 如果扣费了但生成过程出错，尝试回退积分
    if (creditsDeducted && supabaseAdmin && profileId) {
      try {
        const { data: currentProfile } = await supabaseAdmin
          .from('profiles')
          .select('credits')
          .eq('id', profileId)
          .single()

        if (currentProfile) {
          const rollbackCredits = (currentProfile.credits || 0) + totalCost
          await supabaseAdmin
            .from('profiles')
            .update({ credits: rollbackCredits })
            .eq('id', profileId)
          console.log(`Error handler: Credits rolled back: ${totalCost}`)
        }
      } catch (rollbackError) {
        console.error('Failed to rollback credits:', rollbackError)
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        creditsRemaining: currentCredits,
      },
      { status: 500 }
    )
  }
}