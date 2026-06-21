import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户ID不能为空'
      }, { status: 400 })
    }

    const { data: records, error } = await supabaseAdmin
      .from('generation_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Fetch records error:', error)
      return NextResponse.json({
        success: false,
        error: '获取记录失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      records: records || []
    })
  } catch (error) {
    console.error('Records API error:', error)
    return NextResponse.json({
      success: false,
      error: '获取记录失败，请稍后重试'
    }, { status: 500 })
  }
}