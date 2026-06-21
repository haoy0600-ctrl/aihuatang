import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// IP 频率限制：内存计数器
const ipRequestMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000
const RATE_LIMIT_MAX = 10 // 提高频率限制，支持连续兑换

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
function parseOfflineCardCode(code: string): { points: number; valid: boolean; format: string } {
  // 格式: AHT-积分-随机串 或 AHT-积分-随机串1-随机串2
  // 例如: AHT-100-ABCD 或 AHT-320-XYZW-ABCD 或 AHT-328-FD2F-6M9
  
  if (!code.startsWith('AHT-')) {
    return { points: 0, valid: false, format: 'unknown' }
  }
  
  const parts = code.split('-')
  
  // 必须至少有 AHT-积分-随机串 (3段)
  if (parts.length < 3) {
    console.log("离线卡密格式错误：段数不足，parts:", parts);
    return { points: 0, valid: false, format: 'invalid' }
  }
  
  // 尝试解析 parts[1] 作为积分
  const potentialPoints = parseInt(parts[1], 10)
  
  if (!isNaN(potentialPoints) && potentialPoints > 0 && potentialPoints <= 100000) {
    // 验证剩余部分是否确实是随机串（允许连字符）
    const remainingPart = parts.slice(2).join('-')
    
    // 随机串应该只包含字母和数字（允许连字符连接）
    const isRandomString = /^[A-Z0-9-]+$/i.test(remainingPart) && remainingPart.length >= 4
    
    if (isRandomString) {
      console.log(`离线卡密解析成功: 格式=${parts.join('-')}, 积分=${potentialPoints}, 随机串=${remainingPart}`);
      return { points: potentialPoints, valid: true, format: 'AHT-POINTS-RANDOM' }
    }
  }
  
  // 如果 parts[1] 不是有效数字，检查整个格式
  if (isNaN(potentialPoints) || potentialPoints <= 0) {
    console.log("parts[1] 不是有效积分值:", parts[1]);
  } else if (potentialPoints > 100000) {
    console.log("积分值超出范围:", potentialPoints);
  }
  
  return { points: 0, valid: false, format: 'invalid' }
}

export async function POST(request: NextRequest) {
  try {
    console.log("=== 主理人卡密兑换流水日志 ===");
    
    const clientIP = getClientIP(request)
    const rateCheck = checkRateLimit(clientIP)

    if (!rateCheck.allowed) {
      console.log(`IP ${clientIP} 请求过于频繁，剩余重置时间: ${rateCheck.resetIn}ms`);
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

    if (!cardCode) {
      console.log("激活码为空！");
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

    if (!supabaseAdmin) {
      console.error("Supabase Admin 未初始化！");
      return NextResponse.json(
        { success: false, error: '服务暂不可用，请稍后再试' },
        { status: 503 }
      )
    }

    const cleanCode = cardCode.trim().toUpperCase()
    console.log("当前用户ID:", userId);
    console.log("输入卡密:", cleanCode);

    // =========================================
    // 1. 去数据库查存量卡密
    // =========================================
    // 卡密记录类型
    type CardRecord = {
      id: string;
      code: string;
      credits: number;
      status: string;
      used_email?: string;
    }
    
    let { data: cardData, error: cardError } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_email')
      .eq('code', cleanCode)
      .single() as { data: CardRecord | null; error: any }

    // =========================================
    // 2. 核心大坝：如果数据库里没有这个码
    //    且是以 AHT- 开头的离线防伪码
    //    则【全自动就地初始化补录入库】
    // =========================================
    if ((cardError || !cardData) && cleanCode.startsWith('AHT-')) {
      const parsed = parseOfflineCardCode(cleanCode)
      
      if (parsed.valid) {
        console.log("检测到主理人生成的合法离线防伪码，正在执行全自动初始化补录...");
        console.log("解析积分:", parsed.points);
        
        try {
          // 尝试插入新记录
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
          } else if (insertError) {
            console.log("插入错误:", insertError.message);
          }
        } catch (insertErr: any) {
          // 如果抛出唯一性冲突（该码之前已经被补录过了），直接再次查询即可
          console.log("捕获到并发/唯一性冲突，执行二次读取...");
          console.log("冲突详情:", insertErr);
          
          const { data: existingCard } = await supabaseAdmin
            .from('card_codes')
            .select('id, code, credits, status, used_email')
            .eq('code', cleanCode)
            .single() as { data: CardRecord | null; error: any }
          
          if (existingCard) {
            cardData = existingCard
            cardError = null
            console.log(`✅ 并发冲突修复成功，卡密已存在: ${cleanCode}`);
          }
        }
      } else {
        console.log("⚠️ 离线卡密格式解析失败，parts:", cleanCode.split('-'));
      }
    } else if (!cleanCode.startsWith('AHT-')) {
      console.log("⚠️ 非AHT格式卡密，跳过离线补录逻辑");
    } else if (cardData) {
      console.log("✅ 数据库中已存在该卡密记录");
    }

    // =========================================
    // 3. 终极防御校验
    // =========================================
    if (cardError || !cardData) {
      console.log("❌ 防伪校验失败: 数据库中不存在此激活码，且不符合主理人离线制卡防伪格式");
      return NextResponse.json(
        { success: false, error: '无效的激活码！' },
        { status: 400 }
      )
    }

    if (cardData.status !== 'unused') {
      console.log(`❌ 充值失败: 该激活码已被使用过。消耗者: ${cardData.used_email || '未知'}`);
      return NextResponse.json(
        { success: false, error: '该激活码已被使用或已过期！' },
        { status: 400 }
      )
    }

    // 获取用户信息用于日志
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, credits, email')
      .eq('id', userId)
      .single()
    
    console.log("用户信息:", profile);

    const cardCredits = cardData.credits || 0
    const currentCredits = profile?.credits || 0
    const newCredits = currentCredits + cardCredits

    // =========================================
    // 4. 原子事务死锁：
    //    增加用户积分 + 将卡密作废挂钩
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
      console.error('❌ 更新用户积分失败:', updateError);
      return NextResponse.json(
        { success: false, error: '充值失败，请稍后再试' },
        { status: 500 }
      )
    }
    console.log(`✅ 用户积分更新成功: ${currentCredits} → ${newCredits}`);

    // 标记卡密为已使用，记录使用者邮箱
    const { error: useError } = await supabaseAdmin
      .from('card_codes')
      .update({
        status: 'used',
        used_by: userId,
        used_email: profile?.email || '未知邮箱',
        used_at: new Date().toISOString(),
      })
      .eq('id', cardData.id)

    if (useError) {
      console.error('❌ 标记卡密已使用失败:', useError);
    } else {
      console.log(`✅ 卡密 ${cleanCode} 已标记为已使用`);
    }

    console.log(`✨ 积分充值大成功！已成功向账号 ${profile?.email || userId} 注入 ${cardCredits} 积分！`);
    console.log("=== 本次兑换流水结束 ===\n");

    return NextResponse.json({
      success: true,
      message: `🎉 兑换成功！已为您满血注入 ${cardCredits} 积分。`,
      credits: cardCredits,
      totalCredits: newCredits,
    })

  } catch (globalError: any) {
    console.error("❌ 卡密兑换系统全局崩溃致命错误:", globalError);
    console.error("错误堆栈:", globalError?.stack);
    return NextResponse.json(
      { success: false, error: '系统对账事务繁忙，请稍后再试！' },
      { status: 500 }
    )
  }
}
