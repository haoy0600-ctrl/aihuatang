import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_PROFILE_CREDITS, ensureProfileRecord, getProfileById } from '@/lib/profile'
import { requireAuthenticatedUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

async function sendDingTalkNotification(userEmail: string, username?: string) {
  const webhookUrl = process.env.DINGTALK_WEBHOOK_URL
  if (!webhookUrl) {
    console.log('[DingTalk] No webhook configured, skip notification')
    return
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: 'AI画堂新用户注册通知',
          text: [
            '### AI画堂新用户注册通知',
            '',
            `- 用户邮箱：${userEmail}`,
            `- 用户名：${username || '未设置'}`,
            `- 注册时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
            `- 初始积分：${DEFAULT_PROFILE_CREDITS}`,
          ].join('\n'),
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('[DingTalk] Send failed:', response.status, text)
    }
  } catch (error) {
    console.error('[DingTalk] Send error:', error)
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

    if (!before.profile) {
      await sendDingTalkNotification(auth.user.email, username)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EnsureProfile] Error:', error)
    return NextResponse.json({ success: false, error: '创建用户资料失败，请稍后重试。' }, { status: 500 })
  }
}
