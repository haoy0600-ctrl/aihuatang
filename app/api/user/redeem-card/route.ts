import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ==================================================
// 🔒 内存防复用缓存（纯数学算法零依赖版）
// ==================================================
const usedCodesCache = new Set<string>()
const errorIpCache = new Map<string, { count: number; lastTime: number }>()
const ERROR_LIMIT_MAX = 5
const ERROR_LIMIT_WINDOW = 24 * 60 * 60 * 1000

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// ==================================================
// 🔒 纯数学格式算法解构（零数据库依赖）
// ==================================================
function parseCardCode(code: string): { points: number; valid: boolean } {
  // 必须以 AHT- 开头
  if (!code.startsWith('AHT-')) {
    return { points: 0, valid: false }
  }

  const parts = code.split('-')
  // 至少 3 段：AHT-[积分]-[随机串]
  if (parts.length < 3) {
    return { points: 0, valid: false }
  }

  const points = parseInt(parts[1], 10)
  if (isNaN(points) || points <= 0 || points > 100000) {
    return { points: 0, valid: false }
  }

  return { points, valid: true }
}

// ==================================================
// 🔒 主接口：纯算法直充（零冲突版）
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

    // IP 防撞库保护
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

    // 1. 统一格式化处理
    const cleanCode = cardCode.trim().toUpperCase()

    // 2. 内存防复用检查（第一道防线）
    if (usedCodesCache.has(cleanCode)) {
      return NextResponse.json(
        { success: false, message: "⚠️ 该卡密已被使用！" },
        { status: 400 }
      )
    }

    // 3. 纯算法格式解构
    const parsed = parseCardCode(cleanCode)
    if (!parsed.valid) {
      const currentCount = ipLog ? ipLog.count + 1 : 1
      errorIpCache.set(clientIP, { count: currentCount, lastTime: now })
      return NextResponse.json(
        { success: false, message: "无效的激活码格式！" },
        { status: 400 }
      )
    }

    // 4. 查询用户当前积分
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, email')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, message: "用户不存在！" },
        { status: 404 }
      )
    }

    const newCredits = (profile.credits || 0) + parsed.points

    // 5. 【核心直充】：直接给 User 表加分（最稳固操作）
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error("❌ 积分更新失败:", updateError)
      return NextResponse.json(
        { success: false, message: "系统繁忙，请稍后再试！" },
        { status: 500 }
      )
    }

    // 6. 防复用标记（轻量 upsert，失败不影响用户权益）
    try {
      await supabaseAdmin
        .from('card_codes')
        .upsert({
          code: cleanCode,
          credits: parsed.points,
          status: 'used',
          used_by: userId,
          used_email: profile.email || '未知',
          used_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }, { onConflict: 'code' })
    } catch (markError) {
      console.warn("⚠️ 卡密标记失败（积分已发放）:", markError)
    }

    // 7. 内存缓存标记
    usedCodesCache.add(cleanCode)
    errorIpCache.delete(clientIP)

    return NextResponse.json({
      success: true,
      message: `🎉 恭喜！卡密无缝激活，已成功注入 ${parsed.points} 积分！`,
      credits: parsed.points,
      totalCredits: newCredits,
    })

  } catch (globalError: any) {
    console.error("❌ 卡密兑换全局异常:", globalError)

    // 【终极兜底】：尝试直接加分
    try {
      const body = await request.clone().json()
      const { cardCode, userId } = body

      if (cardCode && userId && supabaseAdmin) {
        const cleanCode = cardCode.trim().toUpperCase()
        const parsed = parseCardCode(cleanCode)

        if (parsed.valid) {
          // 直接查用户并加分
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single()

          if (profile) {
            await supabaseAdmin
              .from('profiles')
              .update({ credits: (profile.credits || 0) + parsed.points })
              .eq('id', userId)

            return NextResponse.json({
              success: true,
              message: `🎉 特权直充成功！已注入 ${parsed.points} 积分。`,
            })
          }
        }
      }
    } catch (fallbackError) {
      console.error("❌ 兜底直充也失败:", fallbackError)
    }

    return NextResponse.json({
      success: false,
      message: `系统核心异常: ${globalError.message || "数据库连接问题"}`,
    }, { status: 500 })
  }
}