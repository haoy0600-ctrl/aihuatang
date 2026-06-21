import { NextRequest, NextResponse } from 'next/server'

// ==================================================
// 🔒 安全大闸三：新用户注册单IP防薅羊毛防爆锁
// ==================================================

// 注册计数器：单个网络IP每24小时内最多只能成功注册2个账号
const registerIpCache = new Map<string, { count: number; date: string }>()
const REGISTER_LIMIT_MAX = 2 // 单IP最多2次注册
const REGISTER_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24小时窗口

// 定时清理过期缓存
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of registerIpCache) {
    if (now - new Date(record.date).getTime() > REGISTER_LIMIT_WINDOW) {
      registerIpCache.delete(ip)
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

export async function POST(request: NextRequest) {
  try {
    console.log("=== 🔒 注册IP检查 ===");
    
    const clientIP = getClientIP(request)
    const { email } = await request.json()
    
    console.log("请求IP:", clientIP);
    console.log("注册邮箱:", email);
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: '邮箱地址不能为空' },
        { status: 400 }
      )
    }
    
    // 检查IP注册次数
    const record = registerIpCache.get(clientIP)
    const now = Date.now()
    
    if (record) {
      const recordTime = new Date(record.date).getTime()
      const hoursPassed = (now - recordTime) / (60 * 60 * 1000)
      
      console.log(`IP ${clientIP} 已注册 ${record.count} 次，距上次注册 ${hoursPassed.toFixed(1)} 小时`);
      
      if (record.count >= REGISTER_LIMIT_MAX && hoursPassed < 24) {
        console.log(`⚠️ IP ${clientIP} 注册频繁，触发防薅羊毛保护`);
        return NextResponse.json(
          { 
            success: false, 
            error: '⚠️ 注册频繁：单个网络环境每天最多允许注册 2 个账号，请明日再来，或微信联系主理人特批授权！',
            remainingHours: Math.ceil(24 - hoursPassed),
          },
          { status: 429 }
        )
      }
      
      // 超过24小时，重置计数
      if (hoursPassed >= 24) {
        registerIpCache.set(clientIP, { count: 0, date: new Date(now).toISOString() })
        console.log(`IP ${clientIP} 24小时已过，重置计数`);
      }
    }
    
    console.log(`✅ IP ${clientIP} 可以注册`);
    return NextResponse.json({
      success: true,
      message: 'IP检查通过，可以继续注册',
    })
    
  } catch (error: any) {
    console.error("注册IP检查错误:", error);
    return NextResponse.json(
      { success: false, error: '系统繁忙，请稍后再试' },
      { status: 500 }
    )
  }
}

// 注册成功后调用此接口记录IP
export async function PUT(request: NextRequest) {
  try {
    console.log("=== 🔒 记录注册IP ===");
    
    const clientIP = getClientIP(request)
    const { email } = await request.json()
    
    console.log("记录IP:", clientIP);
    console.log("注册邮箱:", email);
    
    const now = Date.now()
    const record = registerIpCache.get(clientIP)
    
    if (record) {
      // 增加计数
      record.count++
      record.date = new Date(now).toISOString()
      console.log(`IP ${clientIP} 注册次数更新为: ${record.count}`);
    } else {
      // 新记录
      registerIpCache.set(clientIP, { count: 1, date: new Date(now).toISOString() })
      console.log(`IP ${clientIP} 首次注册记录`);
    }
    
    return NextResponse.json({
      success: true,
      message: '注册IP已记录',
    })
    
  } catch (error: any) {
    console.error("记录注册IP错误:", error);
    return NextResponse.json(
      { success: false, error: '系统繁忙' },
      { status: 500 }
    )
  }
}