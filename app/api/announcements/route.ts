import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase 未配置，公告服务暂时不可用。' },
        { status: 500 },
      )
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get announcements error:', error)
      return NextResponse.json(
        {
          success: false,
          error:
            '获取公告列表失败。请检查 Supabase 中是否已创建 announcements 表，并确认服务端环境变量已生效。',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      announcements: data || [],
    })
  } catch (error) {
    console.error('Announcements GET error:', error)
    return NextResponse.json({ success: false, error: '服务器开小差了，请稍后重试。' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase 未配置，公告服务暂时不可用。' },
        { status: 500 },
      )
    }

    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const body = await request.json()
    const title = String(body.title || '').trim()
    const content = String(body.content || '').trim()
    const type = ['system', 'activity', 'maintenance', 'important'].includes(body.type) ? body.type : 'system'
    const isPinned = Boolean(body.is_pinned)

    if (!title || !content) {
      return NextResponse.json({ success: false, error: '公告标题和内容不能为空。' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content,
        type,
        is_pinned: isPinned,
        is_active: true,
        created_by: auth.user.email,
      })
      .select()
      .single()

    if (error) {
      console.error('Create announcement error:', error)
      return NextResponse.json({ success: false, error: '发布公告失败，请稍后再试。' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '公告发布成功。',
      announcement: data,
    })
  } catch (error) {
    console.error('Announcements POST error:', error)
    return NextResponse.json({ success: false, error: '服务器开小差了，请稍后重试。' }, { status: 500 })
  }
}
