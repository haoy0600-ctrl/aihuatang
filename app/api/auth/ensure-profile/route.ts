import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_PROFILE_CREDITS, ensureProfileRecord, getProfileById } from '@/lib/profile'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { RegisterNotificationChannel, sendRegisterNotifications } from '@/lib/register-notification'

async function hasSentRegisterNotification(userId: string) {
  if (!supabaseAdmin) return true

  const { count, error } = await supabaseAdmin
    .from('security_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('type', ['register_notification_sent', 'register_dingtalk_sent'])

  if (error) {
    console.error('[RegisterNotification] Query sent marker failed:', error)
    return true
  }

  return Boolean(count && count > 0)
}

async function markRegisterNotificationSent(userId: string, email: string, channels: RegisterNotificationChannel[]) {
  if (!supabaseAdmin || channels.length === 0) return

  const { error } = await supabaseAdmin.from('security_logs').insert({
    user_id: userId,
    type: 'register_notification_sent',
    prompt: JSON.stringify({ email, channels }),
    created_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[RegisterNotification] Mark sent failed:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) {
      return auth.response
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '系统配置未完成，请稍后重试。' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const username = typeof body.username === 'string' ? body.username.trim() : ''
    const before = await getProfileById(auth.user.id)

    const ensured = await ensureProfileRecord({
      userId: auth.user.id,
      email: auth.user.email,
      username,
      credits: DEFAULT_PROFILE_CREDITS,
    })

    if (!ensured.success) {
      console.error('[EnsureProfile] Ensure failed:', ensured.error)
      return NextResponse.json({ success: false, error: '创建用户资料失败。' }, { status: 500 })
    }

    const shouldNotify = !before.profile || !(await hasSentRegisterNotification(auth.user.id))
    if (shouldNotify) {
      const channels = await sendRegisterNotifications(auth.user.email, username)
      await markRegisterNotificationSent(auth.user.id, auth.user.email, channels)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EnsureProfile] Error:', error)
    return NextResponse.json({ success: false, error: '创建用户资料失败，请稍后重试。' }, { status: 500 })
  }
}
