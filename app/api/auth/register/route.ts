import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aihuatang.top'}/login`
      }
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 })
    }

    if (data.user) {
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email || email,
          credits: 6,
          created_at: new Date().toISOString(),
        })
    }

    return NextResponse.json({
      success: true,
      message: '注册成功！请登录'
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({
      success: false,
      error: '注册失败，请稍后重试'
    }, { status: 500 })
  }
}