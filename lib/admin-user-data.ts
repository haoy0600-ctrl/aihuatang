import { supabaseAdmin } from '@/lib/supabase'

export type AdminProfileRow = {
  id: string
  email?: string | null
  credits?: number | null
  created_at?: string | null
  banned?: boolean | null
  vip_level?: number | null
  username?: string | null
}

export type MergedAdminUser = {
  id: string
  email: string | null
  credits: number
  created_at: string
  banned: boolean
  vip_level: number
  username: string | null
}

export async function fetchProfilesWithFallback() {
  if (!supabaseAdmin) {
    return { data: null, error: new Error('Supabase admin not configured') }
  }

  const queries = [
    'id, email, credits, created_at, banned, vip_level, username',
    'id, email, credits, created_at, banned, username',
    'id, email, credits, created_at, username',
    'id, credits, created_at',
  ]

  for (const selectClause of queries) {
    const result = await supabaseAdmin.from('profiles').select(selectClause).order('created_at', { ascending: false })
    if (!result.error) {
      return { data: ((result.data || []) as unknown) as AdminProfileRow[], error: null }
    }
  }

  return { data: null, error: new Error('Unable to query profiles with current schema') }
}

export async function fetchAuthUsersEmailMap() {
  const emailMap = new Map<string, { email: string | null; createdAt: string | null }>()

  if (!supabaseAdmin) {
    return emailMap
  }

  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[AdminUsers] listUsers error:', error)
      break
    }

    const users = data?.users || []
    users.forEach((user) => {
      emailMap.set(user.id, {
        email: user.email || null,
        createdAt: user.created_at || null,
      })
    })

    if (users.length < perPage) {
      break
    }

    page += 1
  }

  return emailMap
}

export async function fetchMergedAdminUsers() {
  const [profilesResult, authEmailMap] = await Promise.all([fetchProfilesWithFallback(), fetchAuthUsersEmailMap()])
  const profiles = profilesResult.data || []

  if (profilesResult.error && !profiles.length) {
    return { data: null, error: profilesResult.error }
  }

  const mergedMap = new Map<string, MergedAdminUser>()

  profiles.forEach((profile) => {
    const authUser = authEmailMap.get(profile.id)
    mergedMap.set(profile.id, {
      id: profile.id,
      email: profile.email || authUser?.email || null,
      credits: profile.credits || 0,
      created_at: profile.created_at || authUser?.createdAt || new Date(0).toISOString(),
      banned: Boolean(profile.banned),
      vip_level: profile.vip_level || 0,
      username: profile.username || null,
    })
  })

  authEmailMap.forEach((authUser, id) => {
    if (!mergedMap.has(id)) {
      mergedMap.set(id, {
        id,
        email: authUser.email,
        credits: 0,
        created_at: authUser.createdAt || new Date(0).toISOString(),
        banned: false,
        vip_level: 0,
        username: null,
      })
    }
  })

  return {
    data: Array.from(mergedMap.values()).sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    ),
    error: null,
  }
}
