import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAuthenticatedUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser(request)
    if (auth.response || !auth.user) return auth.response

    const userId = auth.user.id
    const userEmail = auth.user.email

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const { data: existingProfile, error: selectError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingProfile) {
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          credits: 6,
          created_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Failed to create profile:', insertError)
        return NextResponse.json({
          success: false,
          error: '创建用户信息失败'
        }, { status: 500 })
      }

      try {
        const dingtalkWebhookUrl = process.env.DINGTALK_WEBHOOK_URL || 'https://oapi.dingtalk.com/robot/send?access_token=bd98916c7436bbbf24f547cf095e5cba28a10b7ca1837e3eb35b9e76e10cc98f'
        
        await fetch(dingtalkWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
              title: 'AI画堂·新用户注册通知',
              text: `### 🤖 AI画堂·新用户注册通知\n\n> 👤 **新用户邮箱**：${userEmail}\n\n> ⏰ **注册时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n> 💡 **初始积分**：6 积分\n\n*请主理人注意及时核对微信/QQ私域账号状态。*\n\n---\n\n*安全关键字：AI画堂*`
            }
          })
        })
      } catch (err) {
        console.log('DingTalk notification failed:', err)
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
