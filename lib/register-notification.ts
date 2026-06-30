import nodemailer from 'nodemailer'
import { DEFAULT_PROFILE_CREDITS } from '@/lib/profile'

export type RegisterNotificationChannel = 'email' | 'dingtalk' | 'wechat_work'

function getRegisterTime() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

export function getRegisterNotificationText(userEmail: string, username?: string) {
  return [
    '### AI画堂新用户注册通知',
    '',
    `- 用户邮箱：${userEmail}`,
    `- 用户名：${username || '未设置'}`,
    `- 注册时间：${getRegisterTime()}`,
    `- 初始积分：${DEFAULT_PROFILE_CREDITS}`,
  ].join('\n')
}

function getRegisterNotificationHtml(userEmail: string, username?: string) {
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.7;color:#111827">',
    '<h2 style="margin:0 0 12px;color:#059669">AI画堂新用户注册通知</h2>',
    '<table style="border-collapse:collapse;width:100%;max-width:560px">',
    `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">用户邮箱</td><td style="padding:8px;border:1px solid #e5e7eb">${userEmail}</td></tr>`,
    `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">用户名</td><td style="padding:8px;border:1px solid #e5e7eb">${username || '未设置'}</td></tr>`,
    `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">注册时间</td><td style="padding:8px;border:1px solid #e5e7eb">${getRegisterTime()}</td></tr>`,
    `<tr><td style="padding:8px;border:1px solid #e5e7eb;background:#f9fafb">初始积分</td><td style="padding:8px;border:1px solid #e5e7eb">${DEFAULT_PROFILE_CREDITS}</td></tr>`,
    '</table>',
    '</div>',
  ].join('')
}

async function sendEmailNotification(userEmail: string, username?: string) {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const to = process.env.NOTIFY_EMAIL_TO || process.env.ADMIN_EMAILS || '50923561@qq.com'
  const from = process.env.SMTP_FROM || user

  if (!host || !user || !pass || !from || !to) {
    return false
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || 'true') !== 'false',
    auth: { user, pass },
  })

  await transporter.sendMail({
    from,
    to,
    subject: `AI画堂新用户注册：${userEmail}`,
    text: getRegisterNotificationText(userEmail, username).replace(/^###\s*/m, ''),
    html: getRegisterNotificationHtml(userEmail, username),
  })

  return true
}

async function sendDingTalkNotification(userEmail: string, username?: string) {
  const webhookUrl = process.env.DINGTALK_WEBHOOK_URL
  if (!webhookUrl) {
    return false
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        title: 'AI画堂新用户注册通知',
        text: getRegisterNotificationText(userEmail, username),
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[RegisterNotification] DingTalk send failed:', response.status, text)
    return false
  }

  return true
}

async function sendWechatWorkNotification(userEmail: string, username?: string) {
  const webhookUrl = process.env.WECHAT_WORK_WEBHOOK_URL || process.env.WECOM_WEBHOOK_URL
  if (!webhookUrl) {
    return false
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgtype: 'markdown',
      markdown: {
        content: getRegisterNotificationText(userEmail, username),
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[RegisterNotification] WeChat Work send failed:', response.status, text)
    return false
  }

  return true
}

export async function sendRegisterNotifications(userEmail: string, username?: string) {
  const channels: RegisterNotificationChannel[] = []

  const senders: Array<[RegisterNotificationChannel, () => Promise<boolean>]> = [
    ['email', () => sendEmailNotification(userEmail, username)],
    ['dingtalk', () => sendDingTalkNotification(userEmail, username)],
    ['wechat_work', () => sendWechatWorkNotification(userEmail, username)],
  ]

  for (const [channel, sender] of senders) {
    try {
      if (await sender()) {
        channels.push(channel)
      }
    } catch (error) {
      console.error(`[RegisterNotification] ${channel} send error:`, error)
    }
  }

  if (channels.length === 0) {
    console.log('[RegisterNotification] No notification channel configured or all channels failed')
  }

  return channels
}
