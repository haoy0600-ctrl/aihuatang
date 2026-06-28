import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { countRecentIpEvents, getClientIP, logSecurityEvent } from '@/lib/security'

const REDEEM_ERROR_LIMIT = 3
const REDEEM_BLOCK_WINDOW_MS = 24 * 60 * 60 * 1000

async function getRecentRedeemErrorCount(ipAddress: string) {
  return countRecentIpEvents('redeem_card_invalid', ipAddress, REDEEM_BLOCK_WINDOW_MS)
}

async function fetchProfile(userId: string) {
  if (!supabaseAdmin) {
    return { data: null, error: new Error('Supabase admin not configured') }
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, credits, email')
    .eq('id', userId)
    .single()

  return { data, error }
}

export async function POST(request: NextRequest) {
  try {
    const ipAddress = getClientIP(request)

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, message: '服务暂不可用，请稍后再试。' }, { status: 503 })
    }

    const recentErrorCount = await getRecentRedeemErrorCount(ipAddress)
    if (recentErrorCount >= REDEEM_ERROR_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          message: '安全限制：输入错误次数过多，请 24 小时后再试。',
        },
        { status: 429 },
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const body = await request.json()
    const cardCode = typeof body.cardCode === 'string' ? body.cardCode.trim().toUpperCase() : ''
    const userId = auth.user.id

    if (!cardCode) {
      return NextResponse.json({ success: false, message: '卡密不能为空。' }, { status: 400 })
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

      return NextResponse.json({ success: false, message: '无效的卡密。' }, { status: 400 })
    }

    if (cardData.status === 'used') {
      return NextResponse.json({ success: false, message: '卡密已使用' }, { status: 400 })
    }

    const profileResult = await fetchProfile(userId)
    const profile = profileResult.data
    if (profileResult.error || !profile) {
      console.error('[RedeemCard] Profile not found:', { userId, profileError: profileResult.error })
      return NextResponse.json({ success: false, message: '用户资料不存在。' }, { status: 404 })
    }

    const { data: usedCard, error: markUsedError } = await supabaseAdmin
      .from('card_codes')
      .update({
        status: 'used',
        used_by: userId,
        used_email: profile.email || auth.user.email || '未知用户',
        used_at: new Date().toISOString(),
      })
      .eq('id', cardData.id)
      .eq('status', 'unused')
      .select('credits')
      .single()

    if (markUsedError) {
      console.error('[RedeemCard] Mark used failed:', markUsedError)
      return NextResponse.json({ success: false, message: '卡密已使用' }, { status: 409 })
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
        .update({ credits: newCredits })
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

      return NextResponse.json({ success: false, message: '系统繁忙，请稍后再试。' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `兑换成功，已到账 ${creditsToAdd} 积分。`,
      credits: creditsToAdd,
      totalCredits: newCredits,
    })
  } catch (error: any) {
    console.error('[RedeemCard] Unknown error:', error?.message, error?.stack)
    return NextResponse.json({ success: false, message: '系统繁忙，请稍后再试。' }, { status: 500 })
  }
}
