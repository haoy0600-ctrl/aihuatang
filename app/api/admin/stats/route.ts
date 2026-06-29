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

    const [
      { data: mergedUsers, error: mergedUsersError },
      { count: generationCount },
      { data: generations },
      { data: queue },
      { data: recentGenerationsWithUser },
    ] = await Promise.all([
      fetchMergedAdminUsers(),
      supabaseAdmin.from('generation_records').select('id', { count: 'exact' }).limit(0),
      supabaseAdmin.from('generation_records').select('status, image_count, model, resolution, user_id, created_at'),
      supabaseAdmin.from('generation_records').select('*').eq('status', 'processing').order('created_at', { ascending: true }),
      supabaseAdmin
        .from('generation_records')
        .select('id, user_id, model, resolution, image_count, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (mergedUsersError || !mergedUsers) {
      return NextResponse.json(
        {
          success: false,
          error: '获取统计数据失败。',
        },
        { status: 500 },
      )
    }

    const mergedUserMap = new Map(mergedUsers.map((item) => [item.id, item]))
    const successCount =
      generations?.filter((item) => item.status === 'success' || item.status === 'completed').length || 0

    const totalConsumed =
      generations?.reduce((sum, item) => {
        const imageCount = item.image_count || 1
        const resolution = item.resolution || '1K'
        let price = 2
        if (resolution === '2K') price = 4
        if (resolution === '4K') price = 8
        return sum + price * imageCount
      }, 0) || 0

    const modelStats: Record<string, { count: number; totalImages: number }> = {}
    const resolutionStats: Record<string, { count: number; totalImages: number }> = {}
    const userGenerationStats: Record<string, { count: number; totalImages: number; models: Record<string, number>; lastCreatedAt?: string }> =
      {}

    generations?.forEach((item) => {
      const model = item.model || 'unknown'
      const resolution = item.resolution || '1K'
      const imageCount = item.image_count || 1
      const userId = item.user_id || 'unknown'

      modelStats[model] = modelStats[model] || { count: 0, totalImages: 0 }
      modelStats[model].count += 1
      modelStats[model].totalImages += imageCount

      resolutionStats[resolution] = resolutionStats[resolution] || { count: 0, totalImages: 0 }
      resolutionStats[resolution].count += 1
      resolutionStats[resolution].totalImages += imageCount

      userGenerationStats[userId] = userGenerationStats[userId] || {
        count: 0,
        totalImages: 0,
        models: {},
        lastCreatedAt: item.created_at || undefined,
      }
      userGenerationStats[userId].count += 1
      userGenerationStats[userId].totalImages += imageCount
      userGenerationStats[userId].models[model] = (userGenerationStats[userId].models[model] || 0) + 1

      if (item.created_at && (!userGenerationStats[userId].lastCreatedAt || item.created_at > userGenerationStats[userId].lastCreatedAt!)) {
        userGenerationStats[userId].lastCreatedAt = item.created_at
      }
    })

    const recentGenerations =
      recentGenerationsWithUser?.slice(0, 10).map((item) => {
        const user = mergedUserMap.get(item.user_id)
        return {
          ...item,
          userEmail: user?.email || '未知用户',
          username: user?.username || null,
        }
      }) || []

    const topUsers =
      mergedUsers
        .filter((profile) => !profile.banned)
        .map((profile) => ({
          ...profile,
          email: profile.email || '未设置邮箱',
          generationCount: userGenerationStats[profile.id]?.count || 0,
          totalImages: userGenerationStats[profile.id]?.totalImages || 0,
          usedModels: userGenerationStats[profile.id]?.models || {},
        }))
        .sort((left, right) => (right.generationCount || 0) - (left.generationCount || 0))
        .slice(0, 10) || []

    const activeUsers = mergedUsers.filter((profile) => {
      const lastCreatedAt = userGenerationStats[profile.id]?.lastCreatedAt
      return Boolean(lastCreatedAt && lastCreatedAt >= sevenDaysAgoStr)
    }).length

    const successRate =
      generationCount != null && generationCount > 0 ? ((successCount / generationCount) * 100).toFixed(1) : '0.0'

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: mergedUsers.length,
        totalGenerations: generationCount || 0,
        totalConsumed,
        successRate,
        queueCount: queue?.length || 0,
        queue: queue || [],
        modelStats,
        resolutionStats,
        recentGenerations,
        topUsers,
        activeUsers,
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取统计数据失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
