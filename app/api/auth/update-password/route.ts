import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试',
      }, { status: 500 })
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    if (!password || password.length < 6) {
      return NextResponse.json({
        success: false,
        error: '密码长度至少 6 位',
      }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
      password,
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Update password error:', error)
    return NextResponse.json({
      success: false,
      error: '更新密码失败，请稍后重试',
    }, { status: 500 })
  }
}
