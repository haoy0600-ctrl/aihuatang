import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''
const REPLICATE_MODEL_VERSION =
  'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa'

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getUpscaleCreditCost(resolution?: string | null) {
  if (resolution === '2K') return 4
  if (resolution === '4K') return 0
  return 6
}

async function rollbackCredits(userId: string, credits: number) {
  const { data: profile } = await supabaseAdmin!.from('profiles').select('credits').eq('id', userId).single()
  const currentCredits = profile?.credits || 0
  await supabaseAdmin!.from('profiles').update({ credits: currentCredits + credits }).eq('id', userId)
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '系统配置未完成，请稍后重试。' }, { status: 500 })
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const { imageUrl, recordId } = await request.json()

    if (!imageUrl || !recordId) {
      return NextResponse.json({ success: false, error: '图片链接和记录 ID 不能为空。' }, { status: 400 })
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { success: false, error: '4K 放大服务尚未配置，请先补充服务器的 Replicate 配置。' },
        { status: 500 },
      )
    }

    const { data: record, error: recordError } = await supabaseAdmin
      .from('generation_records')
      .select('id, user_id, resolution, image_url_4k')
      .eq('id', recordId)
      .eq('user_id', auth.user.id)
      .single()

    if (recordError || !record) {
      return NextResponse.json({ success: false, error: '记录不存在或无权操作。' }, { status: 404 })
    }

    if (record.image_url_4k) {
      return NextResponse.json({ success: true, url: record.image_url_4k, creditsRemaining: null })
    }

    const upscaleCost = getUpscaleCreditCost(record.resolution)

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('id', auth.user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ success: false, error: '读取积分失败，请稍后重试。' }, { status: 500 })
    }

    const currentCredits = profile.credits || 0
    if (upscaleCost > currentCredits) {
      return NextResponse.json(
        {
          success: false,
          error: `积分不足，本次 4K 放大需要 ${upscaleCost} 积分，当前仅剩 ${currentCredits} 积分。`,
        },
        { status: 400 },
      )
    }

    if (upscaleCost > 0) {
      const { error: deductError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: currentCredits - upscaleCost })
        .eq('id', auth.user.id)
        .eq('credits', currentCredits)

      if (deductError) {
        return NextResponse.json({ success: false, error: '扣除积分失败，请稍后重试。' }, { status: 409 })
      }
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
      if (upscaleCost > 0) {
        await rollbackCredits(auth.user.id, upscaleCost)
      }

      const detail = String(createData?.detail || createData?.error || '')
      if (detail.toLowerCase().includes('insufficient credit')) {
        return NextResponse.json(
          {
            success: false,
            error: '4K 放大服务当前不可用：服务器上游 Replicate 余额不足，请先给服务器的 Replicate 账户充值。',
          },
          { status: 503 },
        )
      }

      return NextResponse.json(
        { success: false, error: detail || '创建 4K 放大任务失败，请稍后重试。' },
        { status: 500 },
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
        if (upscaleCost > 0) {
          await rollbackCredits(auth.user.id, upscaleCost)
        }

        const detail = String(statusData?.error || '')
        return NextResponse.json(
          { success: false, error: detail || '4K 放大失败，请稍后重试。' },
          { status: 500 },
        )
      }
    }

    if (!outputUrl) {
      if (upscaleCost > 0) {
        await rollbackCredits(auth.user.id, upscaleCost)
      }

      return NextResponse.json({ success: false, error: '未获取到 4K 图片地址。' }, { status: 500 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('generation_records')
      .update({ image_url_4k: outputUrl })
      .eq('id', recordId)
      .eq('user_id', auth.user.id)

    if (updateError) {
      console.error('[Upscale] Failed to update record:', updateError)
    }

    return NextResponse.json({
      success: true,
      url: outputUrl,
      creditsCost: upscaleCost,
      creditsRemaining: currentCredits - upscaleCost,
    })
  } catch (error: any) {
    console.error('[Upscale] Error:', error.message, error.stack)
    return NextResponse.json({ success: false, error: '4K 放大失败，请稍后重试。' }, { status: 500 })
  }
}
