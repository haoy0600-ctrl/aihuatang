import { NextRequest, NextResponse } from 'next/server'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase 未配置，公告服务暂不可用。' },
        { status: 500 },
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const { data: reads, error: readsError } = await supabaseAdmin
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', auth.user.id)

    if (readsError) {
      console.error('Get announcement reads error:', readsError)
      return NextResponse.json({ success: false, error: '读取已读公告记录失败。' }, { status: 500 })
    }

    const readIds = (reads || []).map((item) => item.announcement_id)

    let query = supabaseAdmin.from('announcements').select('id, title, type, is_pinned, created_at').eq('is_active', true)

    if (readIds.length > 0) {
      query = query.not('id', 'in', `(${readIds.join(',')})`)
    }

    const { data, error } = await query.order('is_pinned', { ascending: false }).order('created_at', { ascending: false })

    if (error) {
      console.error('Get unread announcements error:', error)
      return NextResponse.json({ success: false, error: '获取未读公告失败。' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      unreadCount: data?.length || 0,
      unreadAnnouncements: data || [],
    })
  } catch (error) {
    console.error('Unread announcements GET error:', error)
    return NextResponse.json({ success: false, error: '服务器开小差了，请稍后重试。' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase 未配置，公告服务暂不可用。' },
        { status: 500 },
      )
    }

    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const body = await request.json()
    const announcementId = String(body.announcement_id || '').trim()

    if (!announcementId) {
      return NextResponse.json({ success: false, error: '公告 ID 无效。' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('announcement_reads').upsert(
      {
        announcement_id: announcementId,
        user_id: auth.user.id,
        read_at: new Date().toISOString(),
      },
      { onConflict: 'announcement_id,user_id' },
    )

    if (error) {
      console.error('Mark announcement as read error:', error)
      return NextResponse.json({ success: false, error: '标记公告已读失败。' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '公告已标记为已读。',
    })
  } catch (error) {
    console.error('Unread announcements POST error:', error)
    return NextResponse.json({ success: false, error: '服务器开小差了，请稍后重试。' }, { status: 500 })
  }
}
