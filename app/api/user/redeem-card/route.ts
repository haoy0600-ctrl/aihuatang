import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'

const errorIpCache = new Map<string, { count: number; lastTime: number }>()

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const now = Date.now()

    const ipLog = errorIpCache.get(ip)
    if (ipLog && ipLog.count >= 3 && now - ipLog.lastTime < 24 * 60 * 60 * 1000) {
      console.warn('[RedeemCard] IP blocked:', ip, 'errors:', ipLog.count)
      return NextResponse.json({
        success: false,
        message: "⚠️ 安全检测：您尝试的错误次数过多，账号已触发防撞库保护，请 24 小时后再试或联系主理人微信！"
      }, { status: 429 })
    }

    if (!supabaseAdmin) {
      console.error('[RedeemCard] Supabase admin not configured')
      return NextResponse.json(
        { success: false, message: "服务暂不可用，请稍后再试！" },
        { status: 503 }
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const body = await request.json()
    const { cardCode } = body
    const userId = auth.user.id

    if (!cardCode) {
      return NextResponse.json({ success: false, message: "激活码不能为空！" }, { status: 400 })
    }

    const cleanCode = cardCode.trim().toUpperCase()
    console.log('[RedeemCard] Processing card:', cleanCode.substring(0, 8) + '***')

    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_by, used_email, used_at')
      .eq('code', cleanCode)
      .single()

    if (cardError && cardError.code !== 'PGRST116') {
      console.error('[RedeemCard] Query card error:', cardError)
    }

    if (!cardData) {
      const currentCount = ipLog ? ipLog.count + 1 : 1
      errorIpCache.set(ip, { count: currentCount, lastTime: now })
      console.warn('[RedeemCard] Invalid card:', cleanCode, 'IP:', ip, 'count:', currentCount)
      return NextResponse.json({ success: false, message: "无效的激活码！" }, { status: 400 })
    }

    if (cardData.status === 'used') {
      const usedTime = cardData.used_at
        ? new Date(cardData.used_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : "未知时间"
      console.warn('[RedeemCard] Card already used:', cleanCode, 'by:', cardData.used_email, 'at:', usedTime)
      return NextResponse.json({
        success: false,
        message: `⚠️ 该卡密已被使用！已于 ${usedTime} 被账号 ${cardData.used_email || "其他用户"} 兑换走。`
      }, { status: 400 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('[RedeemCard] Profile not found:', userId, profileError)
      return NextResponse.json({ success: false, message: "用户不存在！" }, { status: 404 })
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
      return NextResponse.json({ success: false, message: "该卡密已被使用或暂不可兑换，请刷新后重试！" }, { status: 409 })
    }

    const creditsToAdd = usedCard?.credits || cardData.credits || 0
    let newCredits = (profile.credits || 0) + creditsToAdd
    let updateError = null

    for (let attempt = 0; attempt < 3; attempt++) {
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
      return NextResponse.json({ success: false, message: "系统对账繁忙，请稍后再试！" }, { status: 500 })
    }

    errorIpCache.delete(ip)
    console.log('[RedeemCard] Success:', creditsToAdd, 'credits added to', userId, 'total:', newCredits)

    return NextResponse.json({
      success: true,
      message: `🎉 兑换成功！已为您满血注入 ${creditsToAdd} 积分。`,
      credits: creditsToAdd,
      totalCredits: newCredits,
    })

  } catch (error: any) {
    console.error('[RedeemCard] Unknown error:', error.message, error.stack)
    return NextResponse.json({
      success: false,
      message: "系统对账繁忙，请稍后再试或联系主理人！"
    }, { status: 500 })
  }
}
