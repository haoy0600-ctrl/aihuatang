import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id, userId } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    if (!id || !userId) {
      return NextResponse.json({
        success: false,
        error: '参数错误'
      }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('generation_records')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Delete record error:', error)
      return NextResponse.json({
        success: false,
        error: '删除失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Delete record API error:', error)
    return NextResponse.json({
      success: false,
      error: '删除失败，请稍后重试'
    }, { status: 500 })
  }
}