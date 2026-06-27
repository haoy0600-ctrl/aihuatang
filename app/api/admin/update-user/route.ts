import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试',
      }, { status: 500 })
    }

    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    const { userId, action, amount } = await request.json()

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户 ID 不能为空',
      }, { status: 400 })
    }

    if (action === 'add_credits' || action === 'subtract_credits') {
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      if (fetchError || !profile) {
        return NextResponse.json({
          success: false,
          error: '用户不存在',
        }, { status: 404 })
      }

      const delta = Math.max(0, Number(amount) || 0)
      const nextCredits =
        action === 'add_credits'
          ? (profile.credits || 0) + delta
          : Math.max(0, (profile.credits || 0) - delta)

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: nextCredits })
        .eq('id', userId)

      if (updateError) {
        console.error('Update credits error:', updateError)
        return NextResponse.json({
          success: false,
          error: '更新积分失败',
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: action === 'add_credits' ? `已增加 ${delta} 积分` : `已扣除 ${delta} 积分`,
        newCredits: nextCredits,
      })
    }

    if (action === 'toggle_status') {
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('banned')
        .eq('id', userId)
        .single()

      if (fetchError || !profile) {
        return NextResponse.json({
          success: false,
          error: '用户不存在',
        }, { status: 404 })
      }

      const banned = !(profile.banned ?? false)

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ banned })
        .eq('id', userId)

      if (updateError) {
        console.error('Update status error:', updateError)
        return NextResponse.json({
          success: false,
          error: '更新状态失败',
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: banned ? '用户已被禁用' : '用户已恢复正常',
        banned,
      })
    }

    if (action === 'delete') {
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (fetchError || !profile) {
        return NextResponse.json({
          success: false,
          error: '用户不存在',
        }, { status: 404 })
      }

      const { error: deleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (deleteError) {
        console.error('Delete user error:', deleteError)
        return NextResponse.json({
          success: false,
          error: '删除用户失败',
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: '用户已成功删除',
      })
    }

    return NextResponse.json({
      success: false,
      error: '无效操作',
    }, { status: 400 })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({
      success: false,
      error: '操作失败，请稍后重试',
    }, { status: 500 })
  }
}
