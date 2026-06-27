import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const supabase: SupabaseClient | null =
  isValidUrl(supabaseUrl) && supabaseAnonKey && !supabaseAnonKey.startsWith('your_')
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          detectSessionInUrl: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            'X-Client-Version': 'v1.0.0',
          },
        },
      })
    : null

export const supabaseAdmin: SupabaseClient | null =
  isValidUrl(supabaseUrl) && supabaseServiceRoleKey && !supabaseServiceRoleKey.startsWith('your_')
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null
