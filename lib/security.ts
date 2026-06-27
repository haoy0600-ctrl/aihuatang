import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type LogSecurityEventParams = {
  type: string
  userId?: string | null
  ipAddress?: string | null
  prompt?: string | null
}

type CountSecurityEventsParams = {
  type: string
  since: Date
  userId?: string | null
  ipAddress?: string | null
}

type RecordSensitiveWordViolationParams = {
  userId: string
  ipAddress: string
  prompt: string
  maxViolations?: number
  windowMs?: number
  banHours?: number
  reason?: string
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return request.headers.get('x-real-ip') || 'unknown'
}

export async function logSecurityEvent({
  type,
  userId,
  ipAddress,
  prompt,
}: LogSecurityEventParams): Promise<void> {
  if (!supabaseAdmin) return

  try {
    await supabaseAdmin.from('security_logs').insert({
      type,
      user_id: userId || null,
      ip_address: ipAddress || null,
      prompt: prompt ? prompt.substring(0, 500) : null,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Security] Failed to log event:', error)
  }
}

export async function countSecurityEvents({
  type,
  since,
  userId,
  ipAddress,
}: CountSecurityEventsParams): Promise<number> {
  if (!supabaseAdmin) return 0

  let query = supabaseAdmin
    .from('security_logs')
    .select('id', { count: 'exact', head: true })
    .eq('type', type)
    .gte('created_at', since.toISOString())

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (ipAddress) {
    query = query.eq('ip_address', ipAddress)
  }

  const { count, error } = await query

  if (error) {
    console.error('[Security] Failed to count events:', error)
    return 0
  }

  return count || 0
}

export async function banUser(userId: string, reason: string, banHours = 24): Promise<void> {
  if (!supabaseAdmin) return

  const bannedUntil = new Date(Date.now() + banHours * 60 * 60 * 1000).toISOString()

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      banned: true,
      banned_until: bannedUntil,
      banned_reason: reason,
    })
    .eq('id', userId)

  if (error) {
    console.error('[Security] Failed to ban user:', error)
  }
}

export async function isUserCurrentlyBanned(userId: string): Promise<boolean> {
  if (!supabaseAdmin) return false

  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('banned, banned_until')
      .eq('id', userId)
      .single()

    if (error || !profile?.banned) {
      return false
    }

    if (!profile.banned_until) {
      return true
    }

    const banEnd = new Date(profile.banned_until)
    if (Number.isNaN(banEnd.getTime())) {
      return true
    }

    if (new Date() <= banEnd) {
      return true
    }

    await supabaseAdmin
      .from('profiles')
      .update({ banned: false, banned_until: null, banned_reason: null })
      .eq('id', userId)

    return false
  } catch (error) {
    console.error('[Security] Failed to check ban status:', error)
    return false
  }
}

export async function recordSensitiveWordViolation({
  userId,
  ipAddress,
  prompt,
  maxViolations = 3,
  windowMs = 5 * 60 * 1000,
  banHours = 24,
  reason = '恶意刷词触发安全锁',
}: RecordSensitiveWordViolationParams): Promise<boolean> {
  await logSecurityEvent({
    type: 'sensitive_word',
    userId,
    ipAddress,
    prompt,
  })

  const since = new Date(Date.now() - windowMs)
  const [userCount, ipCount] = await Promise.all([
    countSecurityEvents({
      type: 'sensitive_word',
      userId,
      since,
    }),
    countSecurityEvents({
      type: 'sensitive_word',
      ipAddress,
      since,
    }),
  ])

  if (userCount >= maxViolations || ipCount >= maxViolations) {
    await banUser(userId, reason, banHours)
    console.error('[Security] User banned:', { userId, ipAddress, userCount, ipCount })
    return true
  }

  return false
}

export async function countRecentIpEvents(type: string, ipAddress: string, windowMs: number): Promise<number> {
  return countSecurityEvents({
    type,
    ipAddress,
    since: new Date(Date.now() - windowMs),
  })
}
