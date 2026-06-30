import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const normalizedEmail = String(email || '').trim().toLowerCase()

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '系统配置未完成，请稍后重试。' }, { status: 500 })
    }

    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return NextResponse.json({ success: false, error: '请输入有效的邮箱地址。' }, { status: 400 })
    }

    const { data: existingProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1)

    if (existingProfiles && existingProfiles.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '该邮箱已注册，请直接登录或找回密码。',
          alreadyRegistered: true,
        },
        { status: 400 },
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://aihuatang.top'
    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${appUrl}/login`,
      },
    })

    if (error) {
      console.error('[Auth/SendCode] signInWithOtp failed:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: '验证码已发送，请查收邮箱。',
      data,
    })
  } catch (error) {
    console.error('[Auth/SendCode] Error:', error)
    return NextResponse.json({ success: false, error: '发送验证码失败，请稍后重试。' }, { status: 500 })
  }
}
