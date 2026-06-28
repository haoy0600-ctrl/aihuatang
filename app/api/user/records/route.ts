import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type RecordsRequest = {
  status?: 'all' | 'success' | 'failed'
  page?: number
  limit?: number
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

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const body = (await request.json()) as RecordsRequest
    const status = body.status || 'all'
    const page = Math.max(1, Number(body.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 20))
    const from = (page - 1) * limit
    const to = from + limit - 1

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

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('[Records] Query failed:', error)
      return NextResponse.json(
        {
          success: false,
          error: '获取生成记录失败，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const records = Array.isArray(data) ? data : []
    const total = count || 0

    return NextResponse.json({
      success: true,
      records,
      total,
      page,
      limit,
      hasMore: to + 1 < total,
    })
  } catch (error) {
    console.error('[Records] API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '获取生成记录失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
