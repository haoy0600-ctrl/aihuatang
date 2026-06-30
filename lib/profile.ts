import { DEFAULT_AVATAR_URL } from '@/lib/avatar'
import { supabaseAdmin } from '@/lib/supabase'

export const DEFAULT_PROFILE_CREDITS = 8
export const USERNAME_PATTERN = /^[a-zA-Z0-9_-]{3,20}$/

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

const PROFILE_SELECT_VARIANTS = [
  'id, email, username, avatar_url, credits, created_at, banned, vip_level',
  'id, email, username, credits, created_at, banned, vip_level',
  'id, email, avatar_url, credits, created_at, banned, vip_level',
  'id, email, credits, created_at, banned, vip_level',
] as const

function hasColumn(profile: SafeProfile, key: keyof SafeProfile) {
  return Object.prototype.hasOwnProperty.call(profile, key)
}

function isDuplicateUsernameError(error: any) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()
  return (
    error?.code === '23505' &&
    (message.includes('username') ||
      message.includes('idx_profiles_username') ||
      message.includes('profiles_username'))
  )
}

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

export async function getProfileById(userId: string) {
  if (!supabaseAdmin) {
    return { profile: null as SafeProfile | null, error: new Error('Supabase admin not configured') }
  }

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
  if (!supabaseAdmin) {
    return { email: null as string | null, error: new Error('Supabase admin not configured') }
  }

  const normalized = username.trim()
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .ilike('username', normalized)
    .maybeSingle()

  if (error) {
    return { email: null as string | null, error }
  }

  return { email: typeof data?.email === 'string' ? data.email : null, error: null }
}

export async function isUsernameTaken(username: string, exceptUserId?: string) {
  if (!supabaseAdmin) {
    return { taken: false, supported: false, error: new Error('Supabase admin not configured') }
  }

  const normalized = username.trim()
  if (!normalized) return { taken: false, supported: true, error: null }

  let query = supabaseAdmin.from('profiles').select('id').ilike('username', normalized).limit(1)
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
  if (!supabaseAdmin) {
    return { success: false, error: new Error('Supabase admin not configured') }
  }

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
    if (isDuplicateUsernameError(error)) {
      return { success: false, error: new Error('该用户名已被使用，请换一个。') }
    }
  }

  return { success: false, error: lastError }
}

export async function ensureProfileRecord(params: {
  userId: string
  email: string
  username?: string
  credits?: number
}) {
  if (!supabaseAdmin) {
    return { success: false, profile: null as SafeProfile | null, error: new Error('Supabase admin not configured') }
  }

  const { profile, error } = await getProfileById(params.userId)
  if (error) {
    return { success: false, profile: null as SafeProfile | null, error }
  }

  const username = params.username?.trim()
  if (username) {
    const usernameStatus = await isUsernameTaken(username, params.userId)
    if (usernameStatus.taken) {
      return { success: false, profile, error: new Error('该用户名已被使用，请换一个。') }
    }
    if (!usernameStatus.supported) {
      return { success: false, profile, error: new Error('系统尚未启用用户名字段，请管理员先执行数据库修复脚本。') }
    }
    if (usernameStatus.error) {
      return { success: false, profile, error: usernameStatus.error }
    }
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
      if (username && isDuplicateUsernameError(insertError)) {
        return { success: false, profile: null, error: new Error('该用户名已被使用，请换一个。') }
      }
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

  if (username && hasColumn(profile, 'username') && !profile.username) {
    updatePayload.username = username
  }

  if (hasColumn(profile, 'avatar_url') && !profile.avatar_url) {
    updatePayload.avatar_url = DEFAULT_AVATAR_URL
  }

  const updated = await updateProfileWithFallback(params.userId, updatePayload)
  if (updated.success) {
    const next = await getProfileById(params.userId)
    return { success: true, profile: next.profile, error: null }
  }

  return { success: false, profile, error: updated.error }
}
