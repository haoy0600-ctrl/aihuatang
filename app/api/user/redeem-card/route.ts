import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// ==================================================
// 🔒 安全大闸一：防撞库限流系统
// ==================================================

// IP 频率限制：内存计数器（正常请求限流）
const ipRequestMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1分钟窗口
const RATE_LIMIT_MAX = 10 // 每分钟最多10次请求

// IP 错误计数器：防止黑客暴力撞库猜卡密
const errorIpCache = new Map<string, { count: number; lastTime: number }>()
const ERROR_LIMIT_MAX = 3 // 单IP最多3次错误
const ERROR_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24小时锁定

// 卡密复用防护：内存缓存已使用的卡密
const usedCardCodes = new Map<string, { usedAt: number; usedBy: string; usedEmail: string }>()
const CARD_CACHE_TTL = 24 * 60 * 60 * 1000 // 24小时缓存

// 定时清理过期缓存
setInterval(() => {
  const now = Date.now()
  for (const [code, record] of usedCardCodes) {
    if (now - record.usedAt > CARD_CACHE_TTL) {
      usedCardCodes.delete(code)
    }
  }
  // 清理过期的错误计数器
  for (const [ip, record] of errorIpCache) {
    if (now - record.lastTime > ERROR_LIMIT_WINDOW) {
      errorIpCache.delete(ip)
    }
  }
}, 60 * 60 * 1000)

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

function checkErrorLimit(ip: string): { allowed: boolean; count: number; resetIn: number } {
  const now = Date.now()
  const record = errorIpCache.get(ip)

  if (!record || now - record.lastTime > ERROR_LIMIT_WINDOW) {
    return { allowed: true, count: 0, resetIn: 0 }
  }

  if (record.count >= ERROR_LIMIT_MAX) {
    return { allowed: false, count: record.count, resetIn: ERROR_LIMIT_WINDOW - (now - record.lastTime) }
  }

  return { allowed: true, count: record.count, resetIn: ERROR_LIMIT_WINDOW - (now - record.lastTime) }
}

function recordError(ip: string) {
  const now = Date.now()
  const record = errorIpCache.get(ip)
  if (record) {
    record.count++
    record.lastTime = now
  } else {
    errorIpCache.set(ip, { count: 1, lastTime: now })
  }
}

function clearError(ip: string) {
  errorIpCache.delete(ip)
}

// ==================================================
// 🔒 离线卡密解析函数
// ==================================================
function parseOfflineCardCode(code: string): { points: number; valid: boolean; format: string } {
  console.log("=== parseOfflineCardCode 开始 ===");
  console.log("原始卡密:", code);
  
  if (!code.startsWith('AHT-')) {
    console.log("卡密不以 AHT- 开头");
    return { points: 0, valid: false, format: 'unknown' }
  }
  
  const parts = code.split('-')
  console.log("分割后的 parts:", parts);
  
  if (parts.length < 3) {
    console.log("段数不足，至少需要3段");
    return { points: 0, valid: false, format: 'invalid' }
  }
  
  const potentialPoints = parseInt(parts[1], 10)
  console.log("解析的积分值:", potentialPoints, "原始值:", parts[1]);
  
  if (!isNaN(potentialPoints) && potentialPoints > 0 && potentialPoints <= 100000) {
    const remainingPart = parts.slice(2).join('-')
    console.log("剩余部分(随机串):", remainingPart);
    
    const isRandomString = /^[A-Z0-9-]+$/i.test(remainingPart) && remainingPart.length >= 4
    
    if (isRandomString) {
      console.log(`✅ 解析成功: 积分=${potentialPoints}, 随机串=${remainingPart}`);
      return { points: potentialPoints, valid: true, format: 'AHT-POINTS-RANDOM' }
    }
  }
  
  return { points: 0, valid: false, format: 'invalid' }
}

// ==================================================
// 🔒 主接口：卡密兑换
// ==================================================
export async function POST(request: NextRequest) {
  try {
    console.log("=== 🔒 安全卡密兑换流水日志 ===");
    
    const clientIP = getClientIP(request)

    // =========================================
    // 补丁一：单IP错误限流拦截锁（防撞库）
    // =========================================
    const errorCheck = checkErrorLimit(clientIP)
    if (!errorCheck.allowed) {
      console.log(`⚠️ IP ${clientIP} 错误次数过多，触发防撞库保护`);
      return NextResponse.json(
        {
          success: false,
          error: `⚠️ 安全检测：您尝试的错误次数过多，账号已触发防撞库保护，请 ${Math.ceil(errorCheck.resetIn / 3600000)} 小时后再试或联系主理人微信！`,
          resetIn: Math.ceil(errorCheck.resetIn / 1000),
        },
        { status: 429 }
      )
    }

    // 正常请求频率限制
    const rateCheck = checkRateLimit(clientIP)
    if (!rateCheck.allowed) {
      console.log(`IP ${clientIP} 请求过于频繁`);
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
    console.log("请求参数:", JSON.stringify({ cardCode, userId }));

    if (!cardCode) {
      console.log("激活码为空！");
      recordError(clientIP)
      return NextResponse.json(
        { success: false, error: '激活码不能为空！' },
        { status: 400 }
      )
    }

    if (!userId) {
      console.log("用户ID为空，请先登录！");
      return NextResponse.json(
        { success: false, error: '请先登录账号！' },
        { status: 401 }
      )
    }

    // =========================================
    // 补丁二：用户输入自动容错（自动剔除前后空格，强转为大写）
    // =========================================
    const cleanCode = cardCode.trim().toUpperCase()
    console.log("当前用户ID:", userId);
    console.log("输入卡密(清理后):", cleanCode);

    // =========================================
    // 安全机制：卡密复用防护（内存缓存层）
    // =========================================
    const cachedUsed = usedCardCodes.get(cleanCode)
    if (cachedUsed) {
      const usedTime = new Date(cachedUsed.usedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
      console.log(`❌ 卡密复用检测: ${cleanCode} 已被使用`);
      return NextResponse.json(
        { 
          success: false, 
          error: `⚠️ 该卡密已被使用！已于 ${usedTime} 被账号 ${cachedUsed.usedEmail} 兑换走。`,
          usedTime: usedTime,
          usedByEmail: cachedUsed.usedEmail,
        },
        { status: 400 }
      )
    }

    type CardRecord = {
      id: string;
      code: string;
      credits: number;
      status: string;
      used_email?: string;
      used_at?: string;
      used_by?: string;
    }

    // =========================================
    // 1. 离线卡密直接解析（优先处理）
    // =========================================
    if (cleanCode.startsWith('AHT-')) {
      const parsed = parseOfflineCardCode(cleanCode)
      
      if (parsed.valid) {
        console.log("检测到主理人生成的合法离线防伪码，积分:", parsed.points);
        
        if (supabaseAdmin) {
          try {
            let { data: cardData, error: cardError } = await supabaseAdmin
              .from('card_codes')
              .select('id, code, credits, status, used_email, used_at, used_by')
              .eq('code', cleanCode)
              .single() as { data: CardRecord | null; error: any }

            // 如果数据库中没有，插入新记录
            if (cardError || !cardData) {
              console.log("数据库中不存在，尝试补录...");
              const { data: insertedCard, error: insertError } = await supabaseAdmin
                .from('card_codes')
                .insert({
                  code: cleanCode,
                  credits: parsed.points,
                  status: 'unused',
                  created_at: new Date().toISOString(),
                })
                .select('id, code, credits, status')
                .single() as { data: CardRecord | null; error: any }
              
              if (!insertError && insertedCard) {
                cardData = insertedCard
                cardError = null
                console.log(`✅ 离线卡密补录成功！面额为: ${parsed.points} 积分`);
              }
            }

            // =========================================
            // 补丁三：已被兑换账号具体回显（彻底拒绝微信扯皮铁证）
            // =========================================
            if (cardData && cardData.status === 'used') {
              const usedTime = cardData.used_at 
                ? new Date(cardData.used_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) 
                : "未知时间"
              const usedByEmail = cardData.used_email || "其他用户"
              console.log(`❌ 卡密已被使用: ${cleanCode}`);
              
              // 同步到内存缓存
              usedCardCodes.set(cleanCode, { 
                usedAt: cardData.used_at ? new Date(cardData.used_at).getTime() : Date.now(), 
                usedBy: cardData.used_by || 'unknown',
                usedEmail: usedByEmail,
              })
              
              return NextResponse.json(
                { 
                  success: false, 
                  error: `⚠️ 该卡密已被使用！已于 ${usedTime} 被账号 ${usedByEmail} 兑换走。`,
                  usedTime: usedTime,
                  usedByEmail: usedByEmail,
                },
                { status: 400 }
              )
            }

            // 更新用户积分
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('id, credits, email')
              .eq('id', userId)
              .single()
            
            const currentCredits = profile?.credits || 0
            const newCredits = currentCredits + parsed.points

            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({ 
                credits: newCredits,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId)

            if (updateError) {
              console.error('❌ 更新用户积分失败:', updateError);
              return NextResponse.json(
                { success: false, error: '充值失败，请稍后再试' },
                { status: 500 }
              )
            }

            // 标记卡密为已使用
            const usedAtTime = new Date().toISOString()
            if (cardData) {
              await supabaseAdmin
                .from('card_codes')
                .update({
                  status: 'used',
                  used_by: userId,
                  used_email: profile?.email || '未知邮箱',
                  used_at: usedAtTime,
                })
                .eq('id', cardData.id)
            }

            // 兑换成功，清除该 IP 的错误计数
            clearError(clientIP)
            
            // 同步到内存缓存
            usedCardCodes.set(cleanCode, { 
              usedAt: Date.now(), 
              usedBy: userId,
              usedEmail: profile?.email || '未知邮箱',
            })

            console.log(`✨ 积分充值大成功！已成功向账号 ${profile?.email || userId} 注入 ${parsed.points} 积分！`);
            return NextResponse.json({
              success: true,
              message: `🎉 兑换成功！已为您满血注入 ${parsed.points} 积分。`,
              credits: parsed.points,
              totalCredits: newCredits,
            })
          } catch (dbError) {
            console.error("数据库操作失败:", dbError);
            usedCardCodes.set(cleanCode, { usedAt: Date.now(), usedBy: userId, usedEmail: '开发模式' })
            clearError(clientIP)
            return NextResponse.json({
              success: true,
              message: `🎉 兑换成功！已为您注入 ${parsed.points} 积分（开发模式）。`,
              credits: parsed.points,
              totalCredits: parsed.points,
            })
          }
        } else {
          usedCardCodes.set(cleanCode, { usedAt: Date.now(), usedBy: userId, usedEmail: '开发模式' })
          clearError(clientIP)
          return NextResponse.json({
            success: true,
            message: `🎉 兑换成功！已为您注入 ${parsed.points} 积分（开发模式）。`,
            credits: parsed.points,
            totalCredits: parsed.points,
          })
        }
      } else {
        console.log("❌ 离线卡密格式解析失败");
        recordError(clientIP)
      }
    }

    // =========================================
    // 2. 数据库卡密查询（备用）
    // =========================================
    if (!supabaseAdmin) {
      console.error("❌ Supabase Admin 未初始化");
      recordError(clientIP)
      return NextResponse.json(
        { success: false, error: '服务暂不可用，请稍后再试' },
        { status: 503 }
      )
    }

    let { data: cardData, error: cardError } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_email, used_at, used_by')
      .eq('code', cleanCode)
      .single() as { data: CardRecord | null; error: any }

    if (cardError || !cardData) {
      console.log("❌ 防伪校验失败: 数据库中不存在此激活码");
      recordError(clientIP)
      return NextResponse.json(
        { success: false, error: '无效的激活码！' },
        { status: 400 }
      )
    }

    // =========================================
    // 补丁三：已被兑换账号具体回显
    // =========================================
    if (cardData.status !== 'unused') {
      const usedTime = cardData.used_at 
        ? new Date(cardData.used_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) 
        : "未知时间"
      const usedByEmail = cardData.used_email || "其他用户"
      console.log(`❌ 充值失败: 该激活码已被使用过`);
      
      // 同步到内存缓存
      usedCardCodes.set(cleanCode, { 
        usedAt: cardData.used_at ? new Date(cardData.used_at).getTime() : Date.now(), 
        usedBy: cardData.used_by || 'unknown',
        usedEmail: usedByEmail,
      })
      
      return NextResponse.json(
        { 
          success: false, 
          error: `⚠️ 该卡密已被使用！已于 ${usedTime} 被账号 ${usedByEmail} 兑换走。`,
          usedTime: usedTime,
          usedByEmail: usedByEmail,
        },
        { status: 400 }
      )
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, email')
      .eq('id', userId)
      .single()
    
    console.log("用户信息:", profile);

    const cardCredits = cardData.credits || 0
    const currentCredits = profile?.credits || 0
    const newCredits = currentCredits + cardCredits

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        credits: newCredits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ 更新用户积分失败:', updateError);
      return NextResponse.json(
        { success: false, error: '充值失败，请稍后再试' },
        { status: 500 }
      )
    }

    const usedAtTime = new Date().toISOString()
    await supabaseAdmin
      .from('card_codes')
      .update({
        status: 'used',
        used_by: userId,
        used_email: profile?.email || '未知邮箱',
        used_at: usedAtTime,
      })
      .eq('id', cardData.id)

    // 兑换成功，清除错误计数
    clearError(clientIP)
    
    // 同步到内存缓存
    usedCardCodes.set(cleanCode, { 
      usedAt: Date.now(), 
      usedBy: userId,
      usedEmail: profile?.email || '未知邮箱',
    })

    console.log(`✨ 积分充值大成功！已成功向账号 ${profile?.email || userId} 注入 ${cardCredits} 积分！`);
    console.log("=== 本次兑换流水结束 ===");

    return NextResponse.json({
      success: true,
      message: `🎉 兑换成功！已为您满血注入 ${cardCredits} 积分。`,
      credits: cardCredits,
      totalCredits: newCredits,
    })

  } catch (globalError: any) {
    console.error("❌ 卡密兑换系统全局崩溃:", globalError);
    return NextResponse.json(
      { success: false, error: '系统对账事务繁忙，请稍后再试！' },
      { status: 500 }
    )
  }
}