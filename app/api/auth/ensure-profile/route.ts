import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'
import { DEFAULT_AVATAR_URL } from '@/lib/avatar'

const DEFAULT_CREDITS = 8

async function sendDingTalkNotification(userEmail: string, username?: string) {
  const dingtalkWebhookUrl = process.env.DINGTALK_WEBHOOK_URL

  if (!dingtalkWebhookUrl) {
    console.log('[DingTalk] No webhook URL configured, skipping notification')
    return
  }

  try {
    const response = await fetch(dingtalkWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: 'AI画堂新用户注册通知',
          text: `### AI画堂新用户注册通知

> 用户邮箱：${userEmail}
> 用户名：${username || '未设置'}
> 注册时间：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
> 初始积分：${DEFAULT_CREDITS} 积分

请管理员留意账户状态与渠道来源。`,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[DingTalk] Notification failed:', response.status, errorText)
    } else {
      console.log('[DingTalk] Notification sent successfully for:', userEmail)
    }
  } catch (error: any) {
    console.error('[DingTalk] Notification error:', error?.message || error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const userId = auth.user.id
    const userEmail = auth.user.email
    const body = await request.json().catch(() => ({}))
    const username = typeof body.username === 'string' ? body.username.trim() : ''

    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error('[Ensure Profile] Query profile failed:', profileError)
      return NextResponse.json(
        {
          success: false,
          error: '读取用户资料失败。',
        },
        { status: 500 },
      )
    }

    if (!existingProfile) {
      const { error: insertError } = await supabaseAdmin.from('profiles').insert({
        id: userId,
        email: userEmail,
        username: username || null,
        credits: DEFAULT_CREDITS,
        avatar_url: DEFAULT_AVATAR_URL,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('[Ensure Profile] Failed to create profile:', insertError)
        return NextResponse.json(
          {
            success: false,
            error: '创建用户资料失败。',
          },
          { status: 500 },
        )
      }

      await sendDingTalkNotification(userEmail, username)
      return NextResponse.json({ success: true })
    }

    const updatePayload: Record<string, string> = {}
    if (username && !existingProfile.username) {
      updatePayload.username = username
    }
    if (!existingProfile.avatar_url) {
      updatePayload.avatar_url = DEFAULT_AVATAR_URL
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin.from('profiles').update(updatePayload).eq('id', userId)

      if (updateError) {
        console.error('[Ensure Profile] Failed to update profile:', updateError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Ensure Profile] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '创建用户资料失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
