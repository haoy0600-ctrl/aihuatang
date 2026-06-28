import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { oldPassword, newPassword } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: auth.user.email,
      password: oldPassword,
    })

    if (signInError) {
      return NextResponse.json(
        {
          success: false,
          error: '原密码错误。',
        },
        { status: 400 },
      )
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(auth.user.id, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: `修改密码失败：${updateError.message}`,
        },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: true,
      message: '密码修改成功',
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '修改密码失败，请稍后重试',
      },
      { status: 500 },
    )
  }
}
