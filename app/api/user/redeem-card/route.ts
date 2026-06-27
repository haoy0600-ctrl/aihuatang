import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { countRecentIpEvents, getClientIP, logSecurityEvent } from '@/lib/security'

const REDEEM_ERROR_LIMIT = 3
const REDEEM_BLOCK_WINDOW_MS = 24 * 60 * 60 * 1000

async function getRecentRedeemErrorCount(ipAddress: string) {
  return countRecentIpEvents('redeem_card_invalid', ipAddress, REDEEM_BLOCK_WINDOW_MS)
}

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getClientIP(request)

    if (!supabaseAdmin) {
      console.error('[RedeemCard] Supabase admin not configured')
      return NextResponse.json(
        { success: false, message: '服务暂不可用，请稍后再试。' },
        { status: 503 }
      )
    }

    const recentErrorCount = await getRecentRedeemErrorCount(ipAddress)
    if (recentErrorCount >= REDEEM_ERROR_LIMIT) {
      console.warn('[RedeemCard] IP blocked by recent invalid attempts:', { ipAddress, recentErrorCount })
      return NextResponse.json(
        {
          success: false,
          message: '安全检测：错误次数过多，请 24 小时后再试。',
        },
        { status: 429 }
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const body = await request.json()
    const cardCode = typeof body.cardCode === 'string' ? body.cardCode.trim().toUpperCase() : ''
    const userId = auth.user.id

    if (!cardCode) {
      return NextResponse.json(
        { success: false, message: '激活码不能为空。' },
        { status: 400 }
      )
    }

    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_by, used_email, used_at')
      .eq('code', cardCode)
      .single()

    if (cardError && cardError.code !== 'PGRST116') {
      console.error('[RedeemCard] Query card error:', cardError)
    }

    if (!cardData) {
      await logSecurityEvent({
        type: 'redeem_card_invalid',
        userId,
        ipAddress,
        prompt: cardCode,
      })

      const updatedErrorCount = await getRecentRedeemErrorCount(ipAddress)
      console.warn('[RedeemCard] Invalid card attempt:', { ipAddress, updatedErrorCount })

      return NextResponse.json(
        { success: false, message: '无效的激活码。' },
        { status: 400 }
      )
    }

    if (cardData.status === 'used') {
      const usedTime = cardData.used_at
        ? new Date(cardData.used_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '未知时间'

      return NextResponse.json(
        {
          success: false,
          message: `该卡密已于 ${usedTime} 被 ${cardData.used_email || '其他用户'} 使用。`,
        },
        { status: 400 }
      )
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[RedeemCard] Profile not found:', { userId, profileError })
      return NextResponse.json(
        { success: false, message: '用户不存在。' },
        { status: 404 }
      )
    }

    const { data: usedCard, error: markUsedError } = await supabaseAdmin
      .from('card_codes')
      .update({
        status: 'used',
        used_by: userId,
        used_email: profile.email || '未知',
        used_at: new Date().toISOString(),
      })
      .eq('id', cardData.id)
      .eq('status', 'unused')
      .select('credits')
      .single()

    if (markUsedError) {
      console.error('[RedeemCard] Mark used failed:', markUsedError)
      return NextResponse.json(
        { success: false, message: '该卡密已被使用，请刷新后重试。' },
        { status: 409 }
      )
    }

    const creditsToAdd = usedCard?.credits || cardData.credits || 0
    let newCredits = (profile.credits || 0) + creditsToAdd
    let updateError: unknown = null

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: latestProfile, error: latestProfileError } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      if (latestProfileError || !latestProfile) {
        updateError = latestProfileError
        break
      }

      const currentCredits = latestProfile.credits || 0
      newCredits = currentCredits + creditsToAdd

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          credits: newCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('credits', currentCredits)

      updateError = error
      if (!error) break
    }

    if (updateError) {
      console.error('[RedeemCard] Credits update failed:', updateError)
      await supabaseAdmin
        .from('card_codes')
        .update({
          status: 'unused',
          used_by: null,
          used_email: null,
          used_at: null,
        })
        .eq('id', cardData.id)
        .eq('used_by', userId)

      return NextResponse.json(
        { success: false, message: '系统繁忙，请稍后再试。' },
        { status: 500 }
      )
    }

    console.log('[RedeemCard] Success:', { userId, creditsToAdd, totalCredits: newCredits })

    return NextResponse.json({
      success: true,
      message: `兑换成功，已为您充值 ${creditsToAdd} 积分。`,
      credits: creditsToAdd,
      totalCredits: newCredits,
    })
  } catch (error: any) {
    console.error('[RedeemCard] Unknown error:', error?.message, error?.stack)
    return NextResponse.json(
      { success: false, message: '系统繁忙，请稍后再试。' },
      { status: 500 }
    )
  }
}
