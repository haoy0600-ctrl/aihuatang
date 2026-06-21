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

    if (!email) {
      return NextResponse.json({
        success: false,
        error: '请先登录'
      }, { status: 401 })
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (profileError || !profileData) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profileData.id,
        email: profileData.email,
        createdAt: profileData.created_at
      },
      profile: profileData
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({
      success: false,
      error: '获取用户信息失败，请稍后重试'
    }, { status: 500 })
  }
}