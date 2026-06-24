import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { status, page, limit } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const pageNum = page || 1
    const limitNum = limit || 20
    const offset = (pageNum - 1) * limitNum

    let query = supabaseAdmin
      .from('generation_records')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: records, error, count } = await query
      .range(offset, offset + limitNum - 1)

    if (error) {
      console.error('Fetch records error:', error)
      return NextResponse.json({
        success: false,
        error: '获取记录失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      records: records || [],
      total: count || 0,
      page: pageNum,
      limit: limitNum,
      hasMore: ((pageNum - 1) * limitNum + (records?.length || 0)) < (count || 0)
    })
  } catch (error) {
    console.error('Records API error:', error)
    return NextResponse.json({
      success: false,
      error: '获取记录失败，请稍后重试'
    }, { status: 500 })
  }
}
