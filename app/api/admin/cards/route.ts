import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdminUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type CardStatus = 'all' | 'unused' | 'used'

const toPositiveInt = (value: string | null, fallback: number, max: number) => {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

const fetchCardSummaryRows = async (client: SupabaseClient) => {
  const rows: Array<{ credits: number; status: string }> = []
  const pageSize = 1000
  const maxPages = 200

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await client
      .from('card_codes')
      .select('credits, status')
      .order('credits', { ascending: false })
      .range(from, to)

    if (error) {
      throw error
    }

    rows.push(...(data || []))

    if (!data || data.length < pageSize) {
      break
    }
  }

  return rows
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = toPositiveInt(searchParams.get('page'), 1, 10000)
    const pageSize = toPositiveInt(searchParams.get('pageSize'), 50, 200)
    const status = (searchParams.get('status') || 'all') as CardStatus
    const creditsParam = searchParams.get('credits')
    const credits = creditsParam && creditsParam !== 'all' ? Number.parseInt(creditsParam, 10) : null
    const keyword = (searchParams.get('keyword') || '').trim()
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_by, used_email, used_at, created_at', { count: 'exact' })

    if (status === 'unused' || status === 'used') {
      query = query.eq('status', status)
    }

    if (credits && Number.isFinite(credits)) {
      query = query.eq('credits', credits)
    }

    if (keyword) {
      query = query.or(`code.ilike.%${keyword}%,used_email.ilike.%${keyword}%`)
    }

    const { data: cards, error, count } = await query.order('created_at', { ascending: false }).range(from, to)

    if (error) {
      console.error('Fetch cards error:', error)
      return NextResponse.json(
        {
          success: false,
          error: '获取卡密列表失败。',
        },
        { status: 500 },
      )
    }

    let summaryRows: Array<{ credits: number; status: string }> = []
    try {
      summaryRows = await fetchCardSummaryRows(supabaseAdmin)
    } catch (summaryError) {
      console.error('Fetch card summary error:', summaryError)
    }

    const summaries = new Map<number, { credits: number; total: number; used: number; unused: number }>()
    summaryRows.forEach((row) => {
      const current = summaries.get(row.credits) || {
        credits: row.credits,
        total: 0,
        used: 0,
        unused: 0,
      }

      current.total += 1
      if (row.status === 'used') {
        current.used += 1
      } else {
        current.unused += 1
      }
      summaries.set(row.credits, current)
    })

    const summary = Array.from(summaries.values()).sort((a, b) => b.credits - a.credits)
    const totalCards = summary.reduce((sum, item) => sum + item.total, 0)
    const usedCards = summary.reduce((sum, item) => sum + item.used, 0)
    const unusedCards = summary.reduce((sum, item) => sum + item.unused, 0)

    return NextResponse.json({
      success: true,
      cards: (cards || []).map((card) => ({
        ...card,
        is_used: card.status === 'used',
      })),
      total: count || 0,
      page,
      pageSize,
      summary,
      totals: {
        total: totalCards,
        used: usedCards,
        unused: unusedCards,
      },
    })
  } catch (error) {
    console.error('Cards API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '服务器错误。',
      },
      { status: 500 },
    )
  }
}
