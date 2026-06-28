import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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

    const { data: cards, error } = await supabaseAdmin
      .from('card_codes')
      .select('id, code, credits, status, used_by, used_email, used_at, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

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

    return NextResponse.json({
      success: true,
      cards: (cards || []).map((card) => ({
        ...card,
        is_used: card.status === 'used',
      })),
      total: cards?.length || 0,
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
