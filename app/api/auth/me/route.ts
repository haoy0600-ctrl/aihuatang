import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { DEFAULT_PROFILE_CREDITS, ensureProfileRecord } from '@/lib/profile'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '系统配置未完成，请稍后重试。' }, { status: 500 })
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const ensured = await ensureProfileRecord({
      userId: auth.user.id,
      email: auth.user.email,
      credits: DEFAULT_PROFILE_CREDITS,
    })

    if (!ensured.success || !ensured.profile) {
      console.error('[Auth/Me] Ensure profile error:', ensured.error)
      return NextResponse.json({ success: false, error: '创建用户资料失败。' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        createdAt: ensured.profile.created_at,
      },
      profile: ensured.profile,
    })
  } catch (error: any) {
    console.error('[Auth/Me] Error:', error?.message || error)
    return NextResponse.json({ success: false, error: '获取用户信息失败，请稍后重试。' }, { status: 500 })
  }
}
