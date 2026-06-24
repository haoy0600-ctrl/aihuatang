import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({
        success: false,
        error: '请输入有效的邮箱地址'
      }, { status: 400 })
    }

    // 🔒 邮箱查重：检查邮箱是否已注册
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .limit(1)

    if (existingUser && existingUser.length > 0) {
      return NextResponse.json({
        success: false,
        error: '该邮箱已注册，请直接登录或使用密码登录',
        alreadyRegistered: true
      }, { status: 400 })
    }

    // 发送验证码
    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true
      }
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送，请查收邮箱',
      data
    })
  } catch (error) {
    console.error('Send code error:', error)
    return NextResponse.json({
      success: false,
      error: '发送验证码失败，请稍后重试'
    }, { status: 500 })
  }
}
