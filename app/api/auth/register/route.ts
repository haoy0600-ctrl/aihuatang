import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://aihuatang.top'}/login`
      }
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 400 })
    }

    if (data.user) {
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email || email,
          credits: 6,
          created_at: new Date().toISOString(),
        })

      try {
        const dingtalkWebhookUrl = process.env.DINGTALK_WEBHOOK_URL || 'https://oapi.dingtalk.com/robot/send?access_token=bd98916c7436bbbf24f547cf095e5cba28a10b7ca1837e3eb35b9e76e10cc98f'
        
        await fetch(dingtalkWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
              title: 'AI画堂·新用户注册通知',
              text: `### 🤖 AI画堂·新用户注册通知\n\n> 👤 **新用户邮箱**：${data.user.email || email}\n\n> ⏰ **注册时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n> 💡 **初始积分**：6 积分\n\n*请主理人注意及时核对微信/QQ私域账号状态。*\n\n---\n\n*安全关键字：AI画堂*`
            }
          })
        })
        console.log('DingTalk notification sent successfully for:', email)
      } catch (err) {
        console.error('DingTalk notification failed:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: '注册成功！请登录'
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({
      success: false,
      error: '注册失败，请稍后重试'
    }, { status: 500 })
  }
}