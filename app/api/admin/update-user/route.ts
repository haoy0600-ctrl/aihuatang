import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const { userId, action, amount } = await request.json()

    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) return auth.response

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: '用户ID不能为空'
      }, { status: 400 })
    }

    if (action === 'add_credits') {
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      if (fetchError || !profile) {
        return NextResponse.json({
          success: false,
          error: '用户不存在'
        }, { status: 404 })
      }

      const newCredits = (profile.credits || 0) + (amount || 0)

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId)

      if (updateError) {
        console.error('Update credits error:', updateError)
        return NextResponse.json({
          success: false,
          error: '更新积分失败'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `成功添加 ${amount} 积分`,
        newCredits: newCredits
      })
    } else if (action === 'subtract_credits') {
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()

      if (fetchError || !profile) {
        return NextResponse.json({
          success: false,
          error: '用户不存在'
        }, { status: 404 })
      }

      const newCredits = Math.max(0, (profile.credits || 0) - (amount || 0))

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits })
        .eq('id', userId)

      if (updateError) {
        console.error('Update credits error:', updateError)
        return NextResponse.json({
          success: false,
          error: '更新积分失败'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `成功扣除 ${amount} 积分`,
        newCredits: newCredits
      })
    } else if (action === 'toggle_status') {
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('is_active')
        .eq('id', userId)
        .single()

      if (fetchError || !profile) {
        return NextResponse.json({
          success: false,
          error: '用户不存在'
        }, { status: 404 })
      }

      const newStatus = !(profile.is_active ?? true)

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userId)

      if (updateError) {
        console.error('Update status error:', updateError)
        return NextResponse.json({
          success: false,
          error: '更新状态失败'
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: newStatus ? '用户已解禁' : '用户已禁用',
        isActive: newStatus
      })
    } else {
      return NextResponse.json({
        success: false,
        error: '无效操作'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({
      success: false,
      error: '操作失败，请稍后重试'
    }, { status: 500 })
  }
}
