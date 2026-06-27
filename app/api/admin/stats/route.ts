import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试',
      }, { status: 500 })
    }

    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString()

    const [
      { count: userCount },
      { count: generationCount },
      { data: generations },
      { data: queues },
      { data: profiles },
      { data: recentGenerationsWithUser },
      { count: activeUsersCount },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact' }).limit(0),
      supabaseAdmin.from('generation_records').select('id', { count: 'exact' }).limit(0),
      supabaseAdmin.from('generation_records').select('status, image_count, model, resolution, user_id, created_at'),
      supabaseAdmin.from('generation_records').select('*').eq('status', 'processing').order('created_at', { ascending: true }),
      supabaseAdmin.from('profiles').select('id, email, credits, created_at, banned, vip_level, username'),
      supabaseAdmin
        .from('generation_records')
        .select('id, user_id, model, resolution, image_count, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin
        .from('generation_records')
        .select('user_id', { count: 'distinct' })
        .gte('created_at', sevenDaysAgoStr)
        .limit(0),
    ])

    const successCount = generations?.filter((item) => item.status === 'success' || item.status === 'completed').length || 0

    const totalConsumed = generations?.reduce((sum, item) => {
      const imageCount = item.image_count || 1
      const resolution = item.resolution || '1K'
      let price = 2

      if (resolution === '2K') price = 4
      if (resolution === '4K') price = 8

      return sum + price * imageCount
    }, 0) || 0

    const modelStats: Record<string, { count: number; totalImages: number }> = {}
    const resolutionStats: Record<string, { count: number; totalImages: number }> = {}
    const userGenerationStats: Record<string, { count: number; totalImages: number; models: Record<string, number> }> = {}

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

      userGenerationStats[userId] = userGenerationStats[userId] || { count: 0, totalImages: 0, models: {} }
      userGenerationStats[userId].count += 1
      userGenerationStats[userId].totalImages += imageCount
      userGenerationStats[userId].models[model] = (userGenerationStats[userId].models[model] || 0) + 1
    })

    const recentGenerations = recentGenerationsWithUser?.slice(0, 10).map((item) => {
      const user = profiles?.find((profile) => profile.id === item.user_id)
      return {
        ...item,
        userEmail: user?.email || '未知用户',
        username: user?.username || null,
      }
    })

    const topUsers = profiles
      ?.filter((profile) => !profile.banned)
      .map((profile) => ({
        ...profile,
        generationCount: userGenerationStats[profile.id]?.count || 0,
        totalImages: userGenerationStats[profile.id]?.totalImages || 0,
        usedModels: userGenerationStats[profile.id]?.models || {},
      }))
      .sort((left, right) => (right.generationCount || 0) - (left.generationCount || 0))
      .slice(0, 10)

    const successRate =
      generationCount != null && generationCount > 0
        ? ((successCount / generationCount) * 100).toFixed(1)
        : '0.0'

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: userCount || 0,
        totalGenerations: generationCount || 0,
        totalConsumed,
        successRate,
        queueCount: queues?.length || 0,
        queue: queues || [],
        modelStats,
        resolutionStats,
        recentGenerations: recentGenerations || [],
        topUsers: topUsers || [],
        activeUsers: activeUsersCount || 0,
      },
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({
      success: false,
      error: '获取统计数据失败，请稍后重试',
    }, { status: 500 })
  }
}
