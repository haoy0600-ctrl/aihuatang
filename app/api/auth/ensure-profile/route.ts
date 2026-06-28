import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'
import { DEFAULT_AVATAR_URL } from '@/lib/avatar'

const DEFAULT_CREDITS = 8

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
            `- 初始积分：${DEFAULT_CREDITS}`,
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
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const username = typeof body.username === 'string' ? body.username.trim() : ''

    const { data: existingProfile, error: queryError } = await supabaseAdmin
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', auth.user.id)
      .maybeSingle()

    if (queryError) {
      console.error('[EnsureProfile] Query failed:', queryError)
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
        id: auth.user.id,
        email: auth.user.email,
        username: username || null,
        credits: DEFAULT_CREDITS,
        avatar_url: DEFAULT_AVATAR_URL,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error('[EnsureProfile] Insert failed:', insertError)
        return NextResponse.json(
          {
            success: false,
            error: '创建用户资料失败。',
          },
          { status: 500 },
        )
      }

      await sendDingTalkNotification(auth.user.email, username)
      return NextResponse.json({ success: true })
    }

    const updatePayload: Record<string, any> = {}

    if (username && !existingProfile.username) {
      updatePayload.username = username
    }

    if (!existingProfile.avatar_url) {
      updatePayload.avatar_url = DEFAULT_AVATAR_URL
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin.from('profiles').update(updatePayload).eq('id', auth.user.id)
      if (updateError) {
        console.error('[EnsureProfile] Update failed:', updateError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[EnsureProfile] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '创建用户资料失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
