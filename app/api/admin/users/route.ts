import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

type ProfileRow = {
  id: string
  email?: string | null
  credits?: number | null
  created_at?: string | null
  banned?: boolean | null
  vip_level?: number | null
  username?: string | null
}

async function fetchProfilesWithFallback() {
  if (!supabaseAdmin) {
    return { data: null, error: new Error('Supabase admin not configured') }
  }

  const queries = [
    'id, email, credits, created_at, banned, vip_level, username',
    'id, email, credits, created_at, banned, username',
    'id, email, credits, created_at, username',
    'id, credits, created_at',
  ]

  for (const selectClause of queries) {
    const result = await supabaseAdmin
      .from('profiles')
      .select(selectClause)
      .order('created_at', { ascending: false })

    if (!result.error) {
      return { data: ((result.data || []) as unknown) as ProfileRow[], error: null }
    }
  }

  return { data: null, error: new Error('Unable to query profiles with current schema') }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const [profilesResult, generationsResult] = await Promise.all([
      fetchProfilesWithFallback(),
      supabaseAdmin.from('generation_records').select('user_id, model, image_count'),
    ])

    const profiles = profilesResult.data
    const profilesError = profilesResult.error
    const { data: generations } = generationsResult

    if (profilesError || !profiles) {
      return NextResponse.json(
        {
          success: false,
          error: '获取用户失败。',
        },
        { status: 500 },
      )
    }

    const userGenerationStats: Record<string, { count: number; totalImages: number; models: Record<string, number> }> =
      {}

    generations?.forEach((item) => {
      const userId = item.user_id || 'unknown'
      const model = item.model || 'unknown'
      const imageCount = item.image_count || 1

      userGenerationStats[userId] = userGenerationStats[userId] || { count: 0, totalImages: 0, models: {} }
      userGenerationStats[userId].count += 1
      userGenerationStats[userId].totalImages += imageCount
      userGenerationStats[userId].models[model] = (userGenerationStats[userId].models[model] || 0) + 1
    })

    const users = profiles.map((profile) => ({
      id: profile.id,
      email: profile.email || '未设置邮箱',
      username: profile.username || null,
      credits: profile.credits || 0,
      created_at: profile.created_at || new Date(0).toISOString(),
      banned: profile.banned || false,
      vip_level: profile.vip_level || 0,
      generationCount: userGenerationStats[profile.id]?.count || 0,
      totalImages: userGenerationStats[profile.id]?.totalImages || 0,
      usedModels: userGenerationStats[profile.id]?.models || {},
    }))

    return NextResponse.json({
      success: true,
      users,
    })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取用户失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
