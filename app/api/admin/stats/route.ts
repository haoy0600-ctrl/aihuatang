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

    const [
      { count: userCount },
      { count: generationCount },
      { data: generations },
      { data: queues }
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact' }).limit(0),
      supabaseAdmin.from('generation_records').select('id', { count: 'exact' }).limit(0),
      supabaseAdmin.from('generation_records').select('status, image_count'),
      supabaseAdmin.from('generation_records').select('*').eq('status', 'processing').order('created_at', { ascending: true })
    ])

    const successCount = generations?.filter(g => g.status === 'success' || g.status === 'completed').length || 0
    const totalConsumed = generations?.reduce((sum, g) => {
      const imageCount = g.image_count || 1
      return sum + 3 * imageCount
    }, 0) || 0

    const successRate = generationCount != null && generationCount > 0 ? ((successCount / generationCount) * 100).toFixed(1) : '0.0'

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: userCount || 0,
        totalGenerations: generationCount || 0,
        totalConsumed: totalConsumed,
        successRate: successRate,
        queueCount: queues?.length || 0,
        queue: queues || []
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
