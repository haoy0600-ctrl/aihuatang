import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!supabaseAdmin) {
      console.error('[Auth/Login] Supabase admin not configured')
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: '邮箱和密码不能为空'
      }, { status: 400 })
    }

    console.log('[Auth/Login] Attempting login for:', email)

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('[Auth/Login] Auth error:', error.message)
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 401 })
    }

    if (!data.user) {
      console.error('[Auth/Login] No user returned')
      return NextResponse.json({
        success: false,
        error: '登录失败'
      }, { status: 401 })
    }

    console.log('[Auth/Login] Success:', email)

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        createdAt: data.user.created_at
      },
      session: data.session ? {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ? data.session.expires_at * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000
      } : null
    })
  } catch (error: any) {
    console.error('[Auth/Login] Error:', error.message, error.stack)
    return NextResponse.json({
      success: false,
      error: '登录失败，请稍后重试'
    }, { status: 500 })
  }
}
