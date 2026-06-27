import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/auth'

// GET: 获取公告列表
// POST: 创建公告（仅管理员）
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Supabase 未配置'
      }, { status: 500 })
    }

    const { data: announcements, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get announcements error:', error)
      return NextResponse.json({
        success: false,
        error: '获取公告列表失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      announcements: announcements || []
    })
  } catch (error) {
    console.error('Announcements API error:', error)
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

    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) return auth.response

    const body = await request.json()
    const { title, content, type, is_pinned } = body

    if (!title || !content) {
      return NextResponse.json({
        success: false,
        error: '标题和内容不能为空'
      }, { status: 400 })
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert({
        title,
        content,
        type: type || 'system',
        is_pinned: is_pinned || false,
        is_active: true,
        created_by: auth.user.email
      })
      .select()
      .single()

    if (error) {
      console.error('Create announcement error:', error)
      return NextResponse.json({
        success: false,
        error: '创建公告失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      announcement
    })
  } catch (error) {
    console.error('Announcements POST error:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}
