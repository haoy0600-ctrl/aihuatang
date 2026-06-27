import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const QQ_EMAIL_BONUS = 3
const DEFAULT_CREDITS = 6
const QQ_EMAIL_BONUS_CREDITS = DEFAULT_CREDITS + QQ_EMAIL_BONUS

function isQQEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@qq.com')
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试。',
      }, { status: 500 })
    }

    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .limit(1)

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({
        success: false,
        error: '该邮箱已注册，请直接登录。',
      }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aihuatang.top'}/login`,
      },
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 })
    }

    if (data.user) {
      const qqEmail = isQQEmail(email)
      const initialCredits = qqEmail ? QQ_EMAIL_BONUS_CREDITS : DEFAULT_CREDITS

      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email || email,
          credits: initialCredits,
          created_at: new Date().toISOString(),
        })
    }

    return NextResponse.json({
      success: true,
      message: '注册成功，请登录。',
      isQQEmail: isQQEmail(email),
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({
      success: false,
      error: '注册失败，请稍后重试。',
    }, { status: 500 })
  }
}
