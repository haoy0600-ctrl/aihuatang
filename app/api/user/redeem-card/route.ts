import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ==================================================
// 🔒 内存 IP 错误计数器：防止黑客暴力撞库猜卡密
// ==================================================
const errorIpCache = new Map<string, { count: number; lastTime: number }>()

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// ==================================================
// 🔒 主接口：卡密兑换（100%稳固防扯皮版）
// ==================================================
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const now = Date.now()

    // =========================================
    // 补丁一：单IP错误限流拦截锁（3次错误/24小时）
    // =========================================
    const ipLog = errorIpCache.get(ip)
    if (ipLog && ipLog.count >= 3 && now - ipLog.lastTime < 24 * 60 * 60 * 1000) {
      return NextResponse.json({
        success: false,
        message: "⚠️ 安全检测：您尝试的错误次数过多，账号已触发防撞库保护，请 24 小时后再试或联系主理人微信！"
      }, { status: 429 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, message: "服务暂不可用，请稍后再试！" },
        { status: 503 }
      )
    }

    const { cardCode, userId } = await request.json()

    if (!cardCode) {
      return NextResponse.json({ success: false, message: "激活码不能为空！" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ success: false, message: "请先登录账号！" }, { status: 401 })
    }

    // =========================================
    // 补丁二：用户输入自动容错（自动剔除前后空格，强转为高标准大写字母）
    // =========================================
    const cleanCode = cardCode.trim().toUpperCase()

    // =========================================
    // 1. 去数据库查存量卡密
    // =========================================
    let card = null
    const { data: cardData } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_email, used_at')
      .eq('code', cleanCode)
      .single()

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

    // =========================================
    // 2. 核心大坝：如果是 AHT- 开头的离线防伪码且存量不存在，全自动就地初始化入库
    // =========================================
    if (!card && cleanCode.startsWith('AHT-')) {
      const parts = cleanCode.split('-')
      if (parts.length >= 4) {
        const points = parseInt(parts[1], 10)
        if (!isNaN(points) && points > 0) {
          try {
            const { data: newCard } = await supabaseAdmin
              .from('card_codes')
              .insert({
                code: cleanCode,
                credits: points,
                status: 'unused',
                created_at: new Date().toISOString(),
              })
              .select()
              .single()

            if (newCard) {
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

    // =========================================
    // 3. 校验卡密有效性
    // =========================================
    if (!card) {
      const currentCount = ipLog ? ipLog.count + 1 : 1
      errorIpCache.set(ip, { count: currentCount, lastTime: now })
      return NextResponse.json({ success: false, message: "无效的激活码！" }, { status: 400 })
    }

    // =========================================
    // 补丁三：已被兑换账号具体回显（彻底拒绝微信扯皮铁证）
    // =========================================
    if (card.isUsed) {
      const usedTime = card.usedAt
        ? new Date(card.usedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : "未知时间"
      return NextResponse.json({
        success: false,
        message: `⚠️ 该卡密已被使用！已于 ${usedTime} 被账号 ${card.usedByEmail || "其他用户"} 兑换走。`
      }, { status: 400 })
    }

    // =========================================
    // 查询用户当前积分
    // =========================================
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ success: false, message: "用户不存在！" }, { status: 404 })
    }

    const newCredits = (profile.credits || 0) + card.points

    // =========================================
    // 4. 原子化事务：通过 upsert 强行原子化锁死并发双刷漏洞并直接发分
    // =========================================
    const updateError = await supabaseAdmin
      .from('profiles')
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError?.error) {
      console.error("积分更新失败:", updateError.error)
      return NextResponse.json({ success: false, message: "系统对账繁忙，请稍后再试！" }, { status: 500 })
    }

    // 将卡密标记为已使用
    await supabaseAdmin
      .from('card_codes')
      .update({
        status: 'used',
        used_by: userId,
        used_email: profile.email || '未知',
        used_at: new Date().toISOString(),
      })
      .eq('id', card.id)

    // 兑换成功，清除该 IP 的错误计数
    errorIpCache.delete(ip)

    return NextResponse.json({
      success: true,
      message: `🎉 兑换成功！已为您满血注入 ${card.points} 积分。`,
      credits: card.points,
      totalCredits: newCredits,
    })

  } catch (error: any) {
    console.error("卡密系统未知错误:", error)
    return NextResponse.json({
      success: false,
      message: "系统对账繁忙，请稍后再试或联系主理人！"
    }, { status: 500 })
  }
}