import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rawAccount = String(body.email || '').trim()
    const password = String(body.password || '')

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    if (!rawAccount || !password) {
      return NextResponse.json(
        {
          success: false,
          error: '邮箱/用户名和密码不能为空。',
        },
        { status: 400 },
      )
    }

    let loginEmail = rawAccount.toLowerCase()
    const isEmail = rawAccount.includes('@')

    if (!isEmail) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('username', rawAccount)
        .single()

      if (profileError || !profile?.email) {
        return NextResponse.json(
          {
            success: false,
            error: '用户名不存在。',
          },
          { status: 401 },
        )
      }

      loginEmail = String(profile.email).trim().toLowerCase()
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (error || !data.user) {
      return NextResponse.json(
        {
          success: false,
          error: '账号未注册或密码错误，请检查后重试。',
        },
        { status: 401 },
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.created_at,
      },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at
              ? data.session.expires_at * 1000
              : Date.now() + 30 * 24 * 60 * 60 * 1000,
          }
        : null,
    })
  } catch (error: any) {
    console.error('[Auth/Login] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '登录失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
