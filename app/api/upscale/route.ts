import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''
const REPLICATE_MODEL_VERSION = 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa'

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase 未配置' },
        { status: 500 }
      )
    }

    const { imageUrl, recordId } = await request.json()

    if (!imageUrl || !recordId) {
      return NextResponse.json(
        { success: false, error: '图片链接和记录 ID 不能为空' },
        { status: 400 }
      )
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: '未配置 Replicate API Token' },
        { status: 500 }
      )
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
          scale: 4,
          face_enhance: true,
        },
      }),
    })

    const createData = await createResponse.json()

    if (!createResponse.ok || !createData.id) {
      console.error('[Upscale] Failed to create prediction:', createData)
      return NextResponse.json(
        { success: false, error: createData?.detail || createData?.error || '创建 4K 放大任务失败' },
        { status: 500 }
      )
    }

    const predictionId = createData.id as string
    let status = createData.status as string
    let outputUrl: string | null = null

    while (status !== 'succeeded' && status !== 'failed' && status !== 'canceled') {
      await wait(3000)

      const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
        },
      })

      const statusData = await statusResponse.json()
      status = statusData.status

      if (status === 'succeeded') {
        const output = statusData.output
        outputUrl = Array.isArray(output) ? output[0] : output || null
      }

      if (status === 'failed' || status === 'canceled') {
        console.error('[Upscale] Prediction ended unsuccessfully:', statusData)
        return NextResponse.json(
          { success: false, error: statusData?.error || '4K 放大失败' },
          { status: 500 }
        )
      }
    }

    if (!outputUrl) {
      return NextResponse.json(
        { success: false, error: '未获取到放大后的图片地址' },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabaseAdmin
      .from('generation_records')
      .update({ image_url_4k: outputUrl })
      .eq('id', recordId)

    if (updateError) {
      console.error('[Upscale] Failed to update record:', updateError)
    }

    return NextResponse.json({
      success: true,
      url: outputUrl,
    })
  } catch (error: any) {
    console.error('[Upscale] Error:', error.message, error.stack)
    return NextResponse.json(
      { success: false, error: '4K 放大失败，请稍后重试' },
      { status: 500 }
    )
  }
}
