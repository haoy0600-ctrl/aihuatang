import { NextRequest, NextResponse } from 'next/server'
import { countRecentIpEvents, getClientIP, logSecurityEvent } from '@/lib/security'
import { isUsernameTaken, USERNAME_PATTERN } from '@/lib/profile'

const REGISTER_LIMIT_MAX = 2
const REGISTER_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000

async function getRecentRegisterCount(ipAddress: string) {
  return countRecentIpEvents('register_success', ipAddress, REGISTER_LIMIT_WINDOW_MS)
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const { email, username } = await request.json()
    const normalizedUsername = typeof username === 'string' ? username.trim() : ''

    if (!email) {
      return NextResponse.json({ success: false, error: '邮箱地址不能为空。' }, { status: 400 })
    }

    if (normalizedUsername) {
      if (!USERNAME_PATTERN.test(normalizedUsername)) {
        return NextResponse.json(
          { success: false, error: '用户名只能使用 3-20 位字母、数字、下划线或短横线。' },
          { status: 400 },
        )
      }

      const usernameStatus = await isUsernameTaken(normalizedUsername)
      if (usernameStatus.taken) {
        return NextResponse.json({ success: false, error: '该用户名已被使用，请换一个。' }, { status: 400 })
      }

      if (!usernameStatus.supported) {
        return NextResponse.json(
          { success: false, error: '系统尚未启用用户名字段，请管理员先执行数据库修复脚本。' },
          { status: 500 },
        )
      }

      if (usernameStatus.error) {
        console.error('[RegisterCheck] Username check error:', usernameStatus.error)
        return NextResponse.json({ success: false, error: '用户名检查失败，请稍后重试。' }, { status: 500 })
      }
    }

    const recentRegisterCount = await getRecentRegisterCount(clientIP)
    if (recentRegisterCount >= REGISTER_LIMIT_MAX) {
      return NextResponse.json(
        {
          success: false,
          error: '注册过于频繁：同一网络环境 24 小时内最多注册 2 个账号，请稍后再试。',
        },
        { status: 429 },
      )
    }

    return NextResponse.json({
      success: true,
      message: '注册检查通过。',
    })
  } catch (error) {
    console.error('[RegisterCheck] POST error:', error)
    return NextResponse.json({ success: false, error: '系统繁忙，请稍后再试。' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const clientIP = getClientIP(request)
    const { email } = await request.json()

    await logSecurityEvent({
      type: 'register_success',
      ipAddress: clientIP,
      prompt: typeof email === 'string' ? email : null,
    })

    return NextResponse.json({
      success: true,
      message: '注册来源已记录。',
    })
  } catch (error) {
    console.error('[RegisterCheck] PUT error:', error)
    return NextResponse.json({ success: false, error: '系统繁忙。' }, { status: 500 })
  }
}
