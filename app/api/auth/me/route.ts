import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: '系统配置未完成，请稍后重试。' },
        { status: 500 },
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', auth.user.id)
      .single()

    if (profileError || !profileData) {
      console.error('[Auth/Me] Profile query error:', profileError)
      return NextResponse.json(
        { success: false, error: '用户资料不存在。' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        createdAt: profileData.created_at,
      },
      profile: profileData,
    })
  } catch (error: any) {
    console.error('[Auth/Me] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: '获取用户信息失败，请稍后重试。' },
      { status: 500 },
    )
  }
}
