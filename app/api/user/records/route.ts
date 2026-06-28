import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { status, page, limit } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const pageNum = Number(page) || 1
    const limitNum = Number(limit) || 20
    const offset = (pageNum - 1) * limitNum

    let query = supabaseAdmin
      .from('generation_records')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (status === 'success') {
      query = query.in('status', ['success', 'completed'])
    } else if (status === 'failed') {
      query = query.in('status', ['failed', 'error'])
    }

    const { data: records, error, count } = await query.range(offset, offset + limitNum - 1)

    if (error) {
      console.error('[Records] Fetch records failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: '获取记录失败。',
        },
        { status: 500 },
      )
    }

    const total = count || 0
    const currentCount = records?.length || 0

    return NextResponse.json({
      success: true,
      records: records || [],
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: offset + currentCount < total,
    })
  } catch (error) {
    console.error('[Records] API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取记录失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
