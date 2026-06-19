import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('=== Supabase Configuration ===')
console.log('URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey ? '***configured***' : 'NOT SET')
console.log('Service Key:', supabaseServiceRoleKey ? '***configured***' : 'NOT SET')

const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const createSafeClient = (url: string, key: string, options: Parameters<typeof createClient>[2] = {}): SupabaseClient | null => {
  if (!isValidUrl(url) || !key || key.startsWith('your_')) {
    console.warn('Supabase credentials not configured. Using demo mode.')
    return null
  }
  try {
    console.log('Creating Supabase client with URL:', url)
    return createClient(url, key, options)
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

export const supabase = createSafeClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Version': 'v1.0.0',
    },
  },
})

export const supabaseAdmin = createSafeClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})