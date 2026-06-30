import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_PROFILE_CREDITS, ensureProfileRecord, isUsernameTaken, USERNAME_PATTERN } from '@/lib/profile'
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
    if (username) {
      if (!USERNAME_PATTERN.test(username)) {
        return NextResponse.json(
          { success: false, error: '用户名只能使用 3-20 位字母、数字、下划线或短横线。' },
          { status: 400 },
        )
      }

      const usernameStatus = await isUsernameTaken(username, auth.user.id)
      if (usernameStatus.taken) {
        return NextResponse.json({ success: false, error: '该用户名已被使用，请换一个。' }, { status: 400 })
      }
      if (!usernameStatus.supported) {
        return NextResponse.json(
          { success: false, error: '系统尚未启用用户名字段，请管理员先执行数据库修复脚本。' },
          { status: 500 },
        )
      }
      if (usernameStatus.error) {
        console.error('[EnsureProfile] Username check failed:', usernameStatus.error)
        return NextResponse.json({ success: false, error: '用户名检查失败，请稍后重试。' }, { status: 500 })
      }
    }

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

    const shouldNotify = !(await hasSentRegisterNotification(auth.user.id))
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
