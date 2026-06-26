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
        error: '邮箱/用户名和密码不能为空'
      }, { status: 400 })
    }

    // 判断输入是邮箱还是用户名
    const isEmail = email.includes('@')
    let loginEmail = email

    // 如果是用户名，先查询对应的邮箱
    if (!isEmail) {
      console.log('[Auth/Login] Username detected, looking up email for:', email)

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('username', email)
        .single()

      if (profileError || !profile) {
        console.error('[Auth/Login] Username not found:', email)
        return NextResponse.json({
          success: false,
          error: '用户名不存在'
        }, { status: 401 })
      }

      loginEmail = profile.email
      console.log('[Auth/Login] Found email for username:', loginEmail)
    }

    console.log('[Auth/Login] Attempting login for:', loginEmail)

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: loginEmail,
      password
    })

    if (error || !data.user) {
      console.error('[Auth/Login] Auth failed:', error?.message || 'No user returned')
      return NextResponse.json({
        success: false,
        error: '该账号未注册或密码错误，请先前往注册'
      }, { status: 401 })
    }

    console.log('[Auth/Login] Success:', loginEmail)

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
