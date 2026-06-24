import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_EMAIL = '50923561@qq.com'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成'
      }, { status: 500 })
    }

    const adminEmail = request.headers.get('x-admin-email')
    
    if (!adminEmail || adminEmail !== ADMIN_EMAIL) {
      return NextResponse.json({
        success: false,
        error: '权限不足'
      }, { status: 403 })
    }

    const { data: cards, error } = await supabaseAdmin
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      console.error('Fetch cards error:', error)
      return NextResponse.json({
        success: false,
        error: '获取卡密列表失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      cards: cards || [],
      total: cards?.length || 0
    })
  } catch (error) {
    console.error('Cards API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
