import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { DEFAULT_AVATAR_URL } from '@/lib/avatar'

const DEFAULT_CREDITS = 8

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
      .maybeSingle()

    if (profileError) {
      console.error('[Auth/Me] Profile query error:', profileError)
      return NextResponse.json({ success: false, error: '读取用户资料失败。' }, { status: 500 })
    }

    let profile = profileData

    if (!profile) {
      const { data: insertedProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: auth.user.id,
          email: auth.user.email,
          credits: DEFAULT_CREDITS,
          avatar_url: DEFAULT_AVATAR_URL,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single()

      if (insertError || !insertedProfile) {
        console.error('[Auth/Me] Create profile error:', insertError)
        return NextResponse.json({ success: false, error: '创建用户资料失败。' }, { status: 500 })
      }

      profile = insertedProfile
    } else if (!profile.avatar_url) {
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ avatar_url: DEFAULT_AVATAR_URL })
        .eq('id', auth.user.id)
        .select('*')
        .single()

      if (!updateError && updatedProfile) {
        profile = updatedProfile
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: auth.user.id,
        email: auth.user.email,
        createdAt: profile.created_at,
      },
      profile,
    })
  } catch (error: any) {
    console.error('[Auth/Me] Error:', error?.message || error)
    return NextResponse.json(
      { success: false, error: '获取用户信息失败，请稍后重试。' },
      { status: 500 },
    )
  }
}
