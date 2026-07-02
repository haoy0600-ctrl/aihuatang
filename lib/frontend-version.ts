export const FRONTEND_VERSION_KEY = 'ai_huatang_frontend_revision'
export const FRONTEND_BUNDLE_KEY = 'ai_huatang_frontend_bundle'
export const CURRENT_FRONTEND_BUNDLE = '2026-07-02-hard-nav-v2'

const VERSIONED_PATHS = new Set([
  '/',
  '/dashboard',
  '/records',
  '/recharge',
  '/profile',
  '/announcements',
  '/login',
])

export function shouldVersionPathname(pathname: string) {
  return VERSIONED_PATHS.has(pathname) || pathname === '/admin' || pathname.startsWith('/admin/')
}
