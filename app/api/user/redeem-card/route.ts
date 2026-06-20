import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// IP 频率限制：内存计数器
const ipRequestMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 5

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const record = ipRequestMap.get(ip)

  if (!record || now > record.resetTime) {
    ipRequestMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetIn: RATE_LIMIT_WINDOW }
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now }
  }

  record.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count, resetIn: record.resetTime - now }
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const rateCheck = checkRateLimit(clientIP)

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: '操作过于频繁，请稍后再试',
          resetIn: Math.ceil(rateCheck.resetIn / 1000),
        },
        { status: 429 }
      )
    }

    const { cardCode, userId } = await request.json()

    if (!cardCode || !userId) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: '服务暂不可用，请稍后再试' },
        { status: 503 }
      )
    }

    const normalizedCode = cardCode.trim().toUpperCase()

    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status')
      .eq('code', normalizedCode)
      .single()

    if (cardError || !cardData) {
      return NextResponse.json(
        { success: false, error: '卡密无效或已过期' },
        { status: 400 }
      )
    }

    if (cardData.status !== 'unused') {
      return NextResponse.json(
        { success: false, error: '该卡密已被使用' },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, credits')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: '用户不存在，请先登录' },
        { status: 400 }
      )
    }

    const cardCredits = cardData.credits || 0
    const newCredits = (profile.credits || 0) + cardCredits

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update credits:', updateError)
      return NextResponse.json(
        { success: false, error: '充值失败，请稍后再试' },
        { status: 500 }
      )
    }

    const { error: useError } = await supabaseAdmin
      .from('card_codes')
      .update({
        status: 'used',
        used_by: userId,
        used_at: new Date().toISOString(),
      })
      .eq('id', cardData.id)

    if (useError) {
      console.error('Failed to mark card as used:', useError)
    }

    return NextResponse.json({
      success: true,
      message: `🎉 激活成功！${cardCredits}积分已注入您的账号！`,
      credits: cardCredits,
      totalCredits: newCredits,
    })

  } catch (error: any) {
    console.error('Card redemption error:', error)
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    )
  }
}