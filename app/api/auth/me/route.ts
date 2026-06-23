import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!supabaseAdmin) {
      console.error('[Auth/Me] Supabase admin not configured')
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

    if (profileError) {
      console.error('[Auth/Me] Profile query error:', profileError)
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 })
    }

    if (!profileData) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 })
    }

    console.log('[Auth/Me] User found:', email)

    return NextResponse.json({
      success: true,
      user: {
        id: profileData.id,
        email: profileData.email,
        createdAt: profileData.created_at
      },
      profile: profileData
    })
  } catch (error: any) {
    console.error('[Auth/Me] Error:', error.message, error.stack)
    return NextResponse.json({
      success: false,
      error: '获取用户信息失败，请稍后重试'
    }, { status: 500 })
  }
}