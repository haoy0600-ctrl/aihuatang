import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchMergedAdminUsers } from '@/lib/admin-user-data'

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

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString()

    const [{ data: mergedUsers, error: mergedUsersError }, generationsResult] = await Promise.all([
      fetchMergedAdminUsers(),
      supabaseAdmin.from('generation_records').select('user_id, model, image_count, created_at'),
    ])

    if (mergedUsersError || !mergedUsers) {
      return NextResponse.json(
        {
          success: false,
          error: '获取用户失败。',
        },
        { status: 500 },
      )
    }

    const userGenerationStats: Record<
      string,
      { count: number; totalImages: number; models: Record<string, number>; lastActiveAt?: string }
    > = {}

    generationsResult.data?.forEach((item) => {
      const userId = item.user_id || 'unknown'
      const model = item.model || 'unknown'
      const imageCount = item.image_count || 1

      userGenerationStats[userId] = userGenerationStats[userId] || {
        count: 0,
        totalImages: 0,
        models: {},
        lastActiveAt: item.created_at || undefined,
      }

      userGenerationStats[userId].count += 1
      userGenerationStats[userId].totalImages += imageCount
      userGenerationStats[userId].models[model] = (userGenerationStats[userId].models[model] || 0) + 1

      if (
        item.created_at &&
        (!userGenerationStats[userId].lastActiveAt || item.created_at > userGenerationStats[userId].lastActiveAt!)
      ) {
        userGenerationStats[userId].lastActiveAt = item.created_at
      }
    })

    const users = mergedUsers.map((profile) => {
      const lastActiveAt = userGenerationStats[profile.id]?.lastActiveAt || null
      const isActiveRecently = Boolean(lastActiveAt && lastActiveAt >= sevenDaysAgoStr)

      return {
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
        lastActiveAt,
        isActiveRecently,
      }
    })

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
