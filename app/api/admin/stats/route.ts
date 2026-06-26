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
      { count: activeUsersCount }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact' }).limit(0),
      supabaseAdmin.from('generation_records').select('id', { count: 'exact' }).limit(0),
      supabaseAdmin.from('generation_records').select('status, image_count, model, resolution, user_id, created_at'),
      supabaseAdmin.from('generation_records').select('*').eq('status', 'processing').order('created_at', { ascending: true }),
      supabaseAdmin.from('profiles').select('id, email, credits, created_at, banned, vip_level, username'),
      supabaseAdmin.from('generation_records').select('id, user_id, model, resolution, image_count, status, created_at')
        .order('created_at', { ascending: false })
        .limit(20),
      supabaseAdmin.from('generation_records')
        .select('user_id', { count: 'distinct' })
        .gte('created_at', sevenDaysAgoStr)
        .limit(0)
    ])

    const successCount = generations?.filter(g => g.status === 'success' || g.status === 'completed').length || 0
    
    const totalConsumed = generations?.reduce((sum, g) => {
      const imageCount = g.image_count || 1
      const resolution = g.resolution || '1K'
      let price = 2
      if (resolution === '2K') price = 4
      if (resolution === '4K') price = 8
      return sum + price * imageCount
    }, 0) || 0

    const modelStats: Record<string, { count: number; totalImages: number }> = {}
    const resolutionStats: Record<string, { count: number; totalImages: number }> = {}
    const userGenerationStats: Record<string, { count: number; totalImages: number; models: Record<string, number> }> = {}
    
    generations?.forEach(g => {
      const model = g.model || 'unknown'
      const res = g.resolution || '1K'
      const imageCount = g.image_count || 1
      const userId = g.user_id || 'unknown'
      
      modelStats[model] = modelStats[model] || { count: 0, totalImages: 0 }
      modelStats[model].count++
      modelStats[model].totalImages += imageCount
      
      resolutionStats[res] = resolutionStats[res] || { count: 0, totalImages: 0 }
      resolutionStats[res].count++
      resolutionStats[res].totalImages += imageCount

      userGenerationStats[userId] = userGenerationStats[userId] || { count: 0, totalImages: 0, models: {} }
      userGenerationStats[userId].count++
      userGenerationStats[userId].totalImages += imageCount
      userGenerationStats[userId].models[model] = (userGenerationStats[userId].models[model] || 0) + 1
    })

    const recentGenerations = recentGenerationsWithUser
      ?.slice(0, 10)
      .map(gen => {
        const user = profiles?.find(p => p.id === gen.user_id)
        return {
          ...gen,
          userEmail: user?.email || '未知用户',
          username: user?.username || null
        }
      })

    const topUsers = profiles
      ?.filter(p => !p.banned)
      .map(p => ({
        ...p,
        generationCount: userGenerationStats[p.id]?.count || 0,
        totalImages: userGenerationStats[p.id]?.totalImages || 0,
        usedModels: userGenerationStats[p.id]?.models || {}
      }))
      .sort((a, b) => (b.generationCount || 0) - (a.generationCount || 0))
      .slice(0, 10)

    const successRate = generationCount != null && generationCount > 0 ? ((successCount / generationCount) * 100).toFixed(1) : '0.0'

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: userCount || 0,
        totalGenerations: generationCount || 0,
        totalConsumed: totalConsumed,
        successRate: successRate,
        queueCount: queues?.length || 0,
        queue: queues || [],
        modelStats: modelStats,
        resolutionStats: resolutionStats,
        recentGenerations: recentGenerations || [],
        topUsers: topUsers || [],
        activeUsers: activeUsersCount || 0
      }
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({
      success: false,
      error: '获取统计数据失败，请稍后重试'
    }, { status: 500 })
  }
}
