import { DEFAULT_AVATAR_URL } from '@/lib/avatar'
import { supabaseAdmin } from '@/lib/supabase'

export const DEFAULT_PROFILE_CREDITS = 8

export type SafeProfile = {
  id: string
  email?: string | null
  username?: string | null
  avatar_url?: string | null
  credits?: number | null
  created_at?: string | null
  banned?: boolean | null
  vip_level?: number | null
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/

const PROFILE_SELECT_VARIANTS = [
  'id, email, username, avatar_url, credits, created_at, banned, vip_level',
  'id, email, username, credits, created_at, banned, vip_level',
  'id, email, avatar_url, credits, created_at, banned, vip_level',
  'id, email, credits, created_at, banned, vip_level',
] as const

function buildProfileInsertVariants(params: {
  userId: string
  email: string
  username?: string
  credits?: number
}) {
  const createdAt = new Date().toISOString()
  const username = params.username?.trim() || null
  const credits = typeof params.credits === 'number' ? params.credits : DEFAULT_PROFILE_CREDITS

  return [
    {
      id: params.userId,
      email: params.email,
      username,
      credits,
      avatar_url: DEFAULT_AVATAR_URL,
      created_at: createdAt,
    },
    {
      id: params.userId,
      email: params.email,
      username,
      credits,
      created_at: createdAt,
    },
    {
      id: params.userId,
      email: params.email,
      credits,
      avatar_url: DEFAULT_AVATAR_URL,
      created_at: createdAt,
    },
    {
      id: params.userId,
      email: params.email,
      credits,
      created_at: createdAt,
    },
  ]
}

function buildProfileUpdateVariants(payload: Record<string, any>) {
  const entries = Object.entries(payload).filter(([, value]) => value !== undefined)
  const full = Object.fromEntries(entries)
  const noAvatar = Object.fromEntries(entries.filter(([key]) => key !== 'avatar_url'))
  const noUsername = Object.fromEntries(entries.filter(([key]) => key !== 'username'))
  const noOptional = Object.fromEntries(entries.filter(([key]) => key !== 'avatar_url' && key !== 'username'))

  return [full, noAvatar, noUsername, noOptional].filter((variant, index, list) => {
    if (Object.keys(variant).length === 0) return false
    return list.findIndex((item) => JSON.stringify(item) === JSON.stringify(variant)) === index
  })
}

function hasColumn(profile: SafeProfile, key: keyof SafeProfile) {
  return Object.prototype.hasOwnProperty.call(profile, key)
}

export async function getProfileById(userId: string) {
  if (!supabaseAdmin) return { profile: null as SafeProfile | null, error: new Error('Supabase admin not configured') }

  let lastError: any = null

  for (const select of PROFILE_SELECT_VARIANTS) {
    const { data, error } = await supabaseAdmin.from('profiles').select(select).eq('id', userId).maybeSingle()
    if (!error) {
      return { profile: (data as SafeProfile | null) || null, error: null }
    }
    lastError = error
  }

  return { profile: null as SafeProfile | null, error: lastError }
}

export async function findEmailByUsername(username: string) {
  if (!supabaseAdmin) return { email: null as string | null, error: new Error('Supabase admin not configured') }

  const { data, error } = await supabaseAdmin.from('profiles').select('email').eq('username', username).maybeSingle()
  if (error) {
    return { email: null as string | null, error }
  }

  return { email: typeof data?.email === 'string' ? data.email : null, error: null }
}

export async function isUsernameTaken(username: string, exceptUserId?: string) {
  if (!supabaseAdmin) return { taken: false, supported: false, error: new Error('Supabase admin not configured') }

  const normalized = username.trim()
  if (!normalized) return { taken: false, supported: true, error: null }

  let query = supabaseAdmin.from('profiles').select('id').eq('username', normalized).limit(1)
  if (exceptUserId) {
    query = query.neq('id', exceptUserId)
  }

  const { data, error } = await query
  if (error) {
    const message = `${error.message || ''} ${error.details || ''}`.toLowerCase()
    const missingColumn = message.includes('username') && (message.includes('column') || message.includes('schema'))
    return { taken: false, supported: !missingColumn, error }
  }

  return { taken: Boolean(data && data.length > 0), supported: true, error: null }
}

export async function updateProfileWithFallback(userId: string, payload: Record<string, any>) {
  if (!supabaseAdmin) return { success: false, error: new Error('Supabase admin not configured') }

  const variants = buildProfileUpdateVariants(payload)
  if (variants.length === 0) {
    return { success: true, error: null }
  }

  let lastError: any = null

  for (const variant of variants) {
    const { error } = await supabaseAdmin.from('profiles').update(variant as any).eq('id', userId)
    if (!error) {
      return { success: true, error: null }
    }
    lastError = error
  }

  return { success: false, error: lastError }
}

export async function ensureProfileRecord(params: {
  userId: string
  email: string
  username?: string
  credits?: number
}) {
  if (!supabaseAdmin) return { success: false, profile: null as SafeProfile | null, error: new Error('Supabase admin not configured') }

  const { profile, error } = await getProfileById(params.userId)
  if (error) {
    return { success: false, profile: null as SafeProfile | null, error }
  }

  if (!profile) {
    let lastError: any = null

    for (const variant of buildProfileInsertVariants(params)) {
      const { error: insertError } = await supabaseAdmin.from('profiles').insert(variant as any)
      if (!insertError) {
        const next = await getProfileById(params.userId)
        return { success: true, profile: next.profile, error: null }
      }
      lastError = insertError
    }

    return { success: false, profile: null as SafeProfile | null, error: lastError }
  }

  const updatePayload: Record<string, any> = {}

  if (!profile.email) {
    updatePayload.email = params.email
  }

  if (typeof profile.credits !== 'number') {
    updatePayload.credits = typeof params.credits === 'number' ? params.credits : DEFAULT_PROFILE_CREDITS
  }

  if (params.username && hasColumn(profile, 'username') && !profile.username) {
    const username = params.username.trim()
    const usernameStatus = await isUsernameTaken(username, params.userId)
    if (usernameStatus.taken) {
      return { success: false, profile, error: new Error('用户名已被使用。') }
    }
    updatePayload.username = username
  }

  if (hasColumn(profile, 'avatar_url') && !profile.avatar_url) {
    updatePayload.avatar_url = DEFAULT_AVATAR_URL
  }

  const updateVariants = buildProfileUpdateVariants(updatePayload)
  if (updateVariants.length === 0) {
    return { success: true, profile, error: null }
  }

  const updated = await updateProfileWithFallback(params.userId, updatePayload)
  if (updated.success) {
    const next = await getProfileById(params.userId)
    return { success: true, profile: next.profile, error: null }
  }

  return { success: false, profile, error: updated.error }
}
