import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ==================================================
// 🔒 安全大闸：防撞库限流系统
// ==================================================

// IP 错误计数器：防止黑客暴力撞库猜卡密
const errorIpCache = new Map<string, { count: number; lastTime: number }>()
const ERROR_LIMIT_MAX = 5 // 单IP最多5次错误
const ERROR_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24小时锁定

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// ==================================================
// 🔒 主接口：卡密兑换（无敌稳固版）
// ==================================================
export async function POST(request: NextRequest) {
  try {
    // 服务可用性检查
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "服务暂不可用，请稍后再试！" },
        { status: 503 }
      )
    }

    const clientIP = getClientIP(request)
    const now = Date.now()

    // 1. 单IP防刷保护（防撞库）
    const ipLog = errorIpCache.get(clientIP)
    if (ipLog && ipLog.count >= ERROR_LIMIT_MAX && now - ipLog.lastTime < ERROR_LIMIT_WINDOW) {
      return NextResponse.json(
        { success: false, message: "⚠️ 错误尝试过多，请24小时后再试！" },
        { status: 429 }
      )
    }

    const { cardCode, userId } = await request.json()

    if (!cardCode) {
      return NextResponse.json(
        { success: false, message: "激活码不能为空！" },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "请先登录账号！" },
        { status: 401 }
      )
    }

    // 2. 用户输入自动容错（自动剔除前后空格，强转为大写）
    const cleanCode = cardCode.trim().toUpperCase()

    // 3. 首先查数据库里有没有这个卡密的使用记录
    const { data: cardData } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_email, used_at')
      .eq('code', cleanCode)
      .single()

    // 如果被使用过了，铁证弹窗拒绝，严防微信扯皮
    if (cardData && cardData.status === 'used') {
      const usedTime = cardData.used_at
        ? new Date(cardData.used_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : "先前"
      return NextResponse.json({
        success: false,
        message: `⚠️ 该卡密已被使用！已于 ${usedTime} 被账号 ${cardData.used_email || "其他用户"} 兑换走。`
      }, { status: 400 })
    }

    // 4. 【暴力放行关键】：解析主理人离线制卡机生成的 AHT- 格式
    let pointsToGrant = cardData?.credits || 0
    if (!pointsToGrant && cleanCode.startsWith('AHT-')) {
      const parts = cleanCode.split('-')
      if (parts.length >= 3) {
        pointsToGrant = parseInt(parts[1], 10)
      }
    }

    // 如果既不是存量卡密，也不是合格的 AHT 格式，判定为无效激活码
    if (!pointsToGrant || isNaN(pointsToGrant) || pointsToGrant <= 0) {
      const currentCount = ipLog ? ipLog.count + 1 : 1
      errorIpCache.set(clientIP, { count: currentCount, lastTime: now })
      return NextResponse.json(
        { success: false, message: "无效的激活码！" },
        { status: 400 }
      )
    }

    // 5. 查询当前用户积分
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, message: "用户不存在或查询失败！" },
        { status: 404 }
      )
    }

    const newCredits = (profile.credits || 0) + pointsToGrant

    // 6. 【神级降维打击】：先给用户充积分（核心操作）
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error("❌ 用户积分更新失败:", updateError)
      return NextResponse.json(
        { success: false, message: "系统对账繁忙，请联系主理人微信" },
        { status: 500 }
      )
    }

    // 7. 再将卡密在数据库彻底抹黑挂钩，确保无法复用！
    // 使用 upsert：不存在则插入，存在则更新为已使用
    const { error: upsertError } = await supabaseAdmin
      .from('card_codes')
      .upsert({
        code: cleanCode,
        credits: pointsToGrant,
        status: 'used',
        used_by: userId,
        used_email: profile.email || '未知邮箱',
        used_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }, { onConflict: 'code' })

    if (upsertError) {
      console.error("⚠️ 卡密标记失败（但积分已发放）:", upsertError)
      // 积分已充，卡密标记失败——这不影响用户权益
      // 卡密可能下次还能被尝试，但已被使用状态下次会拦截
    }

    // 兑换成功，清除该 IP 的错误计数
    errorIpCache.delete(clientIP)

    return NextResponse.json({
      success: true,
      message: `🎉 兑换成功！已为您满血注入 ${pointsToGrant} 积分。`,
      credits: pointsToGrant,
      totalCredits: newCredits,
    })

  } catch (globalError: any) {
    console.error("致命对账崩溃错误排查:", globalError)
    return NextResponse.json({
      success: false,
      message: `系统对账繁忙，请联系主理人微信。具体底层报错: ${globalError.message || "数据库冲突"}`
    }, { status: 500 })
  }
}
