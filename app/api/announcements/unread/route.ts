import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'

// GET: 获取用户未读公告数量
// POST: 标记公告为已读
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase 未配置'
      }, { status: 500 })
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const userId = auth.user.id

    // 获取用户已读的公告 ID
    const { data: reads } = await supabaseAdmin
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', userId)

    const readIds = reads?.map(r => r.announcement_id) || []

    // 获取公告列表，排除已读的
    let query = supabaseAdmin
      .from('announcements')
      .select('id, title, type, is_pinned, created_at')
      .eq('is_active', true)

    if (readIds.length > 0) {
      query = query.not('id', 'in', `(${readIds.join(',')})`)
    }

    const { data: unreadAnnouncements, error } = await query
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get unread announcements error:', error)
      return NextResponse.json({
        success: false,
        error: '获取未读公告失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      unreadCount: unreadAnnouncements?.length || 0,
      unreadAnnouncements: unreadAnnouncements || []
    })
  } catch (error) {
    console.error('Unread announcements API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase 未配置'
      }, { status: 500 })
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const userId = auth.user.id
    const body = await request.json()
    const { announcement_id } = body

    if (!announcement_id) {
      return NextResponse.json({
        success: false,
        error: '公告ID不能为空'
      }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('announcement_reads')
      .upsert({
        announcement_id,
        user_id: userId,
        read_at: new Date().toISOString()
      }, {
        onConflict: 'announcement_id,user_id'
      })

    if (error) {
      console.error('Mark read error:', error)
      return NextResponse.json({
        success: false,
        error: '标记已读失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Mark read API error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
