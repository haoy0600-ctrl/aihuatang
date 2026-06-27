import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试',
      }, { status: 500 })
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    if (!id) {
      return NextResponse.json({
        success: false,
        error: '参数错误',
      }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('generation_records')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.user.id)

    if (error) {
      console.error('Delete record error:', error)
      return NextResponse.json({
        success: false,
        error: '删除失败',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error('Delete record API error:', error)
    return NextResponse.json({
      success: false,
      error: '删除失败，请稍后重试',
    }, { status: 500 })
  }
}
