import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// QQ邮箱初始赠送积分配置
const QQ_EMAIL_BONUS = 3 // QQ邮箱额外赠送3积分
const DEFAULT_CREDITS = 6 // 普通邮箱初始积分
const QQ_EMAIL_BONUS_CREDITS = DEFAULT_CREDITS + QQ_EMAIL_BONUS // QQ邮箱总积分 = 9

// 检查是否为QQ邮箱
function isQQEmail(email: string): boolean {
  const emailLower = email.toLowerCase()
  return emailLower.endsWith('@qq.com')
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    // 检查邮箱是否已注册
    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .limit(1)

    if (existingUsers && existingUsers.length > 0) {
      return NextResponse.json({
        success: false,
        error: '该邮箱已注册，请直接登录'
      }, { status: 400 })
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
      // 根据邮箱类型决定初始积分
      const isQQ = isQQEmail(email)
      const initialCredits = isQQ ? QQ_EMAIL_BONUS_CREDITS : DEFAULT_CREDITS
      const bonusInfo = isQQ ? `（含QQ邮箱专属赠送${QQ_EMAIL_BONUS}积分）` : ''

      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: data.user.email || email,
          credits: initialCredits,
          created_at: new Date().toISOString(),
        })

      // 钉钉通知
      try {
        const dingtalkWebhookUrl = process.env.DINGTALK_WEBHOOK_URL || 'https://oapi.dingtalk.com/robot/send?access_token=bd98916c7436bbbf24f547cf095e5cba28a10b7ca1837e3eb35b9e76e10cc98f'
        
        const emailType = isQQ ? '📧 QQ邮箱' : '📮 普通邮箱'
        const bonusText = isQQ ? `\n> 🎁 **专属赠送**：+${QQ_EMAIL_BONUS} 积分` : ''
        
        await fetch(dingtalkWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msgtype: 'markdown',
            markdown: {
              title: 'AI画堂·新用户注册通知',
              text: `### 🤖 AI画堂·新用户注册通知\n\n> 👤 **用户邮箱**：${data.user.email || email}\n> 📧 **邮箱类型**：${emailType}\n> ⏰ **注册时间**：${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n> 💰 **初始积分**：${initialCredits} 积分${bonusText}\n\n*请主理人注意及时核对微信/QQ私域账号状态。*\n\n---\n\n*安全关键字：AI画堂*`
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
      message: '注册成功！请登录',
      isQQEmail: isQQEmail(email)
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({
      success: false,
      error: '注册失败，请稍后重试'
    }, { status: 500 })
  }
}
