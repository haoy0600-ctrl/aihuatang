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

    const [profilesResult, generationsResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, email, credits, created_at, banned, vip_level, username').order('created_at', { ascending: false }),
      supabaseAdmin.from('generation_records').select('user_id, model, image_count')
    ])

    const { data: profiles, error: profilesError } = profilesResult
    const { data: generations } = generationsResult

    if (profilesError || !profiles) {
      return NextResponse.json({
        success: false,
        error: '获取用户失败'
      }, { status: 500 })
    }

    const userGenerationStats: Record<string, { count: number; totalImages: number; models: Record<string, number> }> = {}
    generations?.forEach(gen => {
      const userId = gen.user_id || 'unknown'
      const model = gen.model || 'unknown'
      const imageCount = gen.image_count || 1
      
      userGenerationStats[userId] = userGenerationStats[userId] || { count: 0, totalImages: 0, models: {} }
      userGenerationStats[userId].count++
      userGenerationStats[userId].totalImages += imageCount
      userGenerationStats[userId].models[model] = (userGenerationStats[userId].models[model] || 0) + 1
    })

    const userProfiles = profiles.map(profile => ({
      id: profile.id,
      email: profile.email || '未知邮箱',
      username: profile.username || null,
      credits: profile.credits || 0,
      created_at: profile.created_at,
      banned: profile.banned || false,
      vip_level: profile.vip_level || 0,
      generationCount: userGenerationStats[profile.id]?.count || 0,
      totalImages: userGenerationStats[profile.id]?.totalImages || 0,
      usedModels: userGenerationStats[profile.id]?.models || {}
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
