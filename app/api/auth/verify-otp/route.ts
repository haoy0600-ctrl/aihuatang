import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
        createdAt: data.user?.created_at,
        emailConfirmedAt: data.user?.email_confirmed_at
      }
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({
      success: false,
      error: '验证失败，请稍后重试'
    }, { status: 500 })
  }
}