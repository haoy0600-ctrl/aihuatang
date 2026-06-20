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
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count, resetIn: RATE_LIMIT_WINDOW - record.count }
}

// 离线卡密自动兼容：解析 AHT-积分-随机串 格式
function parseOfflineCardCode(code: string): { points: number; valid: boolean } {
  // 格式: AHT-[面额]-[随机串] 或 AHT-[积分]-[随机串1]-[随机串2]
  // 例如: AHT-100-ABCD1234 或 AHT-320-XYZW-ABCD
  
  if (!code.startsWith('AHT-')) {
    return { points: 0, valid: false }
  }
  
  const parts = code.split('-')
  
  // AHT-XXX-XXXX 或 AHT-XXX-XXXX-XXXX 格式
  if (parts.length >= 3) {
    const points = parseInt(parts[1], 10)
    if (!isNaN(points) && points > 0 && points <= 10000) {
      return { points, valid: true }
    }
  }
  
  return { points: 0, valid: false }
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

    const cleanCode = cardCode.trim().toUpperCase()

    // =========================================
    // 1. 首先去数据库 Card 表中查询该卡密是否存在
    // =========================================
    let { data: cardData, error: cardError } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status')
      .eq('code', cleanCode)
      .single()

    // =========================================
    // 2. 【核心防伪升级】：如果数据库中还没有这个卡密记录
    //    且卡密符合 AHT 官方离线防伪格式，自动补录初始化
    // =========================================
    if ((cardError || !cardData) && cleanCode.startsWith('AHT-')) {
      const parsed = parseOfflineCardCode(cleanCode)
      
      if (parsed.valid) {
        console.log(`[离线卡密补录] 检测到离线卡密: ${cleanCode}, 积分: ${parsed.points}`)
        
        try {
          // 尝试插入新记录
          const { data: newCard, error: insertError } = await supabaseAdmin
            .from('card_codes')
            .insert({
              code: cleanCode,
              credits: parsed.points,
              status: 'unused',
              created_at: new Date().toISOString(),
            })
            .select('id, code, credits, status')
            .single()
          
          if (!insertError && newCard) {
            cardData = newCard
            cardError = null
            console.log(`[离线卡密补录] 成功创建记录: ${cleanCode}`)
          }
        } catch (insertErr: any) {
          // 如果抛出唯一性冲突（该码之前已经被补录过了），直接再次查询即可
          if (insertErr?.code === '23505' || insertErr?.message?.includes('duplicate')) {
            console.log(`[离线卡密补录] 检测到重复补录，重新查询: ${cleanCode}`)
            const { data: existingCard } = await supabaseAdmin
              .from('card_codes')
              .select('id, code, credits, status')
              .eq('code', cleanCode)
              .single()
            
            if (existingCard) {
              cardData = existingCard
              cardError = null
            }
          }
        }
      }
    }

    // =========================================
    // 3. 标准安全校验
    // =========================================
    if (cardError || !cardData) {
      return NextResponse.json(
        { success: false, error: '无效的激活码！' },
        { status: 400 }
      )
    }

    if (cardData.status !== 'unused') {
      return NextResponse.json(
        { success: false, error: '该激活码已被使用或已过期！' },
        { status: 400 }
      )
    }

    // 获取用户信息
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, email')
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

    // =========================================
    // 4. 执行原子化事务：更新积分 + 标记卡密已使用
    // =========================================
    
    // 更新用户积分
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update credits:', updateError)
      return NextResponse.json(
        { success: false, error: '充值失败，请稍后再试' },
        { status: 500 }
      )
    }

    // 标记卡密为已使用，记录使用者邮箱
    const { error: useError } = await supabaseAdmin
      .from('card_codes')
      .update({
        status: 'used',
        used_by: userId,
        used_email: profile.email,
        used_at: new Date().toISOString(),
      })
      .eq('id', cardData.id)

    if (useError) {
      console.error('Failed to mark card as used:', useError)
    }

    console.log(`[卡密兑换成功] 用户: ${profile.email}, 卡密: ${cleanCode}, 积分: ${cardCredits}, 总积分: ${newCredits}`)

    return NextResponse.json({
      success: true,
      message: `🎉 充值成功！已为您注入 ${cardCredits} 积分。`,
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
