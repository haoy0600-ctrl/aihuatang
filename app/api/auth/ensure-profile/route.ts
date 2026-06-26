import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'

// 钉钉通知函数
async function sendDingTalkNotification(userEmail: string, username?: string) {
  const dingtalkWebhookUrl = process.env.DINGTALK_WEBHOOK_URL

  if (!dingtalkWebhookUrl) {
    console.log('[DingTalk] No webhook URL configured, skipping notification')
    return
  }

  try {
    console.log('[DingTalk] Sending notification for:', userEmail)

    const response = await fetch(dingtalkWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        msgtype: 'markdown',
        markdown: {
          title: '🤖 AI画堂·新用户注册通知',
          text: `### 🤖 AI画堂·新用户注册通知

> 👤 **新用户邮箱**：${userEmail}

> 📝 **用户名**：${username || '未设置'}

> ⏰ **注册时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}

> 💡 **初始积分**：8 积分

*请主理人注意及时核对微信/QQ私域账号状态。*

---

*安全关键字：AI画堂*`
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[DingTalk] Notification failed:', response.status, errorText)
    } else {
      console.log('[DingTalk] Notification sent successfully for:', userEmail)
    }
  } catch (err: any) {
    console.error('[DingTalk] Notification error:', err.message)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const userId = auth.user.id
    const userEmail = auth.user.email

    // 从请求中获取 username（注册时传入）
    const body = await request.json()
    const { username } = body

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const { data: existingProfile, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('id, username')
      .eq('id', userId)
      .single()

    if (!existingProfile) {
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          username: username || null,
          credits: 8,
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Failed to create profile:', insertError)
        return NextResponse.json({
          success: false,
          error: '创建用户信息失败'
        }, { status: 500 })
      }

      // 发送钉钉通知（新用户注册）
      await sendDingTalkNotification(userEmail, username)
    } else if (username && !existingProfile.username) {
      // 如果用户已存在但没有用户名，更新用户名
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ username })
        .eq('id', userId)

      if (updateError) {
        console.error('Failed to update username:', updateError)
      }
    }

    return NextResponse.json({
      success: true
    })
  } catch (error) {
    console.error('Ensure profile error:', error)
    return NextResponse.json({
      success: false,
      error: '创建用户信息失败，请稍后重试'
    }, { status: 500 })
  }
}
