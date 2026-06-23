import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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

    const body = await request.json()
    const { cardCode, userId } = body

    if (!cardCode) {
      return NextResponse.json({ success: false, message: "激活码不能为空！" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ success: false, message: "请先登录账号！" }, { status: 401 })
    }

    const cleanCode = cardCode.trim().toUpperCase()
    console.log('[RedeemCard] Processing card:', cleanCode.substring(0, 8) + '***')

    let card = null
    const { data: cardData, error: cardError } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_email, used_at')
      .eq('code', cleanCode)
      .single()

    if (cardError && cardError.code !== 'PGRST116') {
      console.error('[RedeemCard] Query card error:', cardError)
    }

    if (cardData) {
      card = {
        id: cardData.id,
        code: cardData.code,
        points: cardData.credits,
        isUsed: cardData.status === 'used',
        usedByEmail: cardData.used_email,
        usedAt: cardData.used_at,
      }
    }

    if (!card && cleanCode.startsWith('AHT-')) {
      const parts = cleanCode.split('-')
      if (parts.length >= 4) {
        const points = parseInt(parts[1], 10)
        if (!isNaN(points) && points > 0) {
          try {
            const { data: newCard, error: insertError } = await supabaseAdmin
              .from('card_codes')
              .insert({
                code: cleanCode,
                credits: points,
                status: 'unused',
                created_at: new Date().toISOString(),
              })
              .select()
              .single()

            if (insertError) {
              console.warn('[RedeemCard] Insert failed, checking existing:', insertError)
              const { data: retryCard } = await supabaseAdmin
                .from('card_codes')
                .select('id, code, credits, status, used_email, used_at')
                .eq('code', cleanCode)
                .single()

              if (retryCard) {
                card = {
                  id: retryCard.id,
                  code: retryCard.code,
                  points: retryCard.credits,
                  isUsed: retryCard.status === 'used',
                  usedByEmail: retryCard.used_email,
                  usedAt: retryCard.used_at,
                }
              }
            } else if (newCard) {
              card = {
                id: newCard.id,
                code: newCard.code,
                points: newCard.credits,
                isUsed: false,
                usedByEmail: null,
                usedAt: null,
              }
            }
          } catch (dbErr) {
            console.error('[RedeemCard] Init card error:', dbErr)
            const { data: retryCard } = await supabaseAdmin
              .from('card_codes')
              .select('id, code, credits, status, used_email, used_at')
              .eq('code', cleanCode)
              .single()

            if (retryCard) {
              card = {
                id: retryCard.id,
                code: retryCard.code,
                points: retryCard.credits,
                isUsed: retryCard.status === 'used',
                usedByEmail: retryCard.used_email,
                usedAt: retryCard.used_at,
              }
            }
          }
        }
      }
    }

    if (!card) {
      const currentCount = ipLog ? ipLog.count + 1 : 1
      errorIpCache.set(ip, { count: currentCount, lastTime: now })
      console.warn('[RedeemCard] Invalid card:', cleanCode, 'IP:', ip, 'count:', currentCount)
      return NextResponse.json({ success: false, message: "无效的激活码！" }, { status: 400 })
    }

    if (card.isUsed) {
      const usedTime = card.usedAt
        ? new Date(card.usedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : "未知时间"
      console.warn('[RedeemCard] Card already used:', cleanCode, 'by:', card.usedByEmail, 'at:', usedTime)
      return NextResponse.json({
        success: false,
        message: `⚠️ 该卡密已被使用！已于 ${usedTime} 被账号 ${card.usedByEmail || "其他用户"} 兑换走。`
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

    const newCredits = (profile.credits || 0) + card.points

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('[RedeemCard] Credits update failed:', updateError)
      return NextResponse.json({ success: false, message: "系统对账繁忙，请稍后再试！" }, { status: 500 })
    }

    const { error: markUsedError } = await supabaseAdmin
      .from('card_codes')
      .update({
        status: 'used',
        used_by: userId,
        used_email: profile.email || '未知',
        used_at: new Date().toISOString(),
      })
      .eq('id', card.id)

    if (markUsedError) {
      console.error('[RedeemCard] Mark used failed:', markUsedError)
    }

    errorIpCache.delete(ip)
    console.log('[RedeemCard] Success:', card.points, 'credits added to', userId, 'total:', newCredits)

    return NextResponse.json({
      success: true,
      message: `🎉 兑换成功！已为您满血注入 ${card.points} 积分。`,
      credits: card.points,
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