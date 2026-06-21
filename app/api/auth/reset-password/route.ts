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

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aihuatang.top'}/login`
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: '密码重置链接已发送到您的邮箱'
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({
      success: false,
      error: '发送失败，请稍后重试'
    }, { status: 500 })
  }
}