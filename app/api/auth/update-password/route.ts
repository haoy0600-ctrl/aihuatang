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

    const { error } = await supabaseAdmin.auth.updateUser({
      password
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Update password error:', error)
    return NextResponse.json({
      success: false,
      error: '更新密码失败，请稍后重试'
    }, { status: 500 })
  }
}