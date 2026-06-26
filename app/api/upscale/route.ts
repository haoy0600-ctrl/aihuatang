import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN
const REPLICATE_MODEL_VERSION = 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageUrl, recordId } = body

    if (!imageUrl || !recordId) {
      return NextResponse.json({
        success: false,
        error: '图片链接和记录ID不能为空'
      }, { status: 400 })
    }

    if (!REPLICATE_API_TOKEN) {
      console.error('[Upscale] Replicate API token not configured')
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    console.log('[Upscale] Starting 4K upscale for:', imageUrl)

    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${REPLICATE_API_TOKEN}`
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: {
          image: imageUrl,
          scale: 4,
          face_enhance: true
        }
      })
    })

    const createData = await createResponse.json()

    if (!createData.id) {
      console.error('[Upscale] Failed to create prediction:', createData)
      return NextResponse.json({
        success: false,
        error: '创建超分任务失败'
      }, { status: 500 })
    }

    const predictionId = createData.id
    console.log('[Upscale] Prediction created:', predictionId)

    let status = createData.status
    let outputUrl = null

    while (status !== 'succeeded' && status !== 'failed') {
      // 用户要求 3 秒延迟
      await new Promise(resolve => setTimeout(resolve, 3000))

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`
        }
      })

      const statusData = await statusResponse.json()
      status = statusData.status

      console.log('[Upscale] Polling status:', status)

      if (status === 'succeeded') {
        outputUrl = statusData.output
        console.log('[Upscale] Prediction succeeded:', outputUrl)
      } else if (status === 'failed') {
        console.error('[Upscale] Prediction failed:', statusData.error)
        return NextResponse.json({
          success: false,
          error: statusData.error || '超分处理失败'
        }, { status: 500 })
      }
    }

    if (outputUrl) {
      console.log('[Upscale] Updating record with 4K URL:', recordId)

      const { error } = await supabaseAdmin
        .from('generation_records')
        .update({ image_url_4k: outputUrl })
        .eq('id', recordId)

      if (error) {
        console.error('[Upscale] Failed to update record:', error)
      }
    }

    return NextResponse.json({
      success: true,
      url: outputUrl
    })

  } catch (error: any) {
    console.error('[Upscale] Error:', error.message, error.stack)
    return NextResponse.json({
      success: false,
      error: '超分处理失败，请稍后重试'
    }, { status: 500 })
  }
}