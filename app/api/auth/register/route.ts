import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ensureProfileRecord } from '@/lib/profile'

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
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const normalizedEmail = String(email || '').trim().toLowerCase()

    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .limit(1)

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '该邮箱已注册，请直接登录。',
        },
        { status: 400 },
      )
    }

    const { data, error } = await supabaseAdmin.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aihuatang.top'}/login`,
      },
    })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 },
      )
    }

    if (data.user) {
      const qqEmail = isQQEmail(normalizedEmail)
      const initialCredits = qqEmail ? QQ_EMAIL_BONUS_CREDITS : DEFAULT_CREDITS

      const ensured = await ensureProfileRecord({
        userId: data.user.id,
        email: data.user.email || normalizedEmail,
        credits: initialCredits,
      })

      if (!ensured.success) {
        console.error('[Auth/Register] Ensure profile failed:', ensured.error)
      }
    }

    return NextResponse.json({
      success: true,
      message: '注册成功，请登录。',
      isQQEmail: isQQEmail(normalizedEmail),
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '注册失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
