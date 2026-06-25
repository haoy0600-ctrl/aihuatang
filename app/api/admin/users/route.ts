import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) return auth.response

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, credits, created_at, banned')
      .order('created_at', { ascending: false })

    if (profilesError || !profiles) {
      return NextResponse.json({
        success: false,
        error: '获取用户失败'
      }, { status: 500 })
    }

    const userProfiles = profiles.map(profile => ({
      id: profile.id,
      email: profile.email || '未知邮箱',
      credits: profile.credits || 0,
      created_at: profile.created_at,
      banned: profile.banned || false
    }))

    return NextResponse.json({
      success: true,
      users: userProfiles
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({
      success: false,
      error: '获取用户失败，请稍后重试'
    }, { status: 500 })
  }
}
