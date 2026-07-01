import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '50923561@qq.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

const CLIENT_CACHE_BUSTER = '2026-07-01-cache-fix-v3'

function applyNoStoreHeaders(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  response.headers.set('Surrogate-Control', 'no-store')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === '/recharge') {
    const uiVersion = request.nextUrl.searchParams.get('ui')
    if (uiVersion !== CLIENT_CACHE_BUSTER) {
      const nextUrl = request.nextUrl.clone()
      nextUrl.searchParams.set('ui', CLIENT_CACHE_BUSTER)
      nextUrl.searchParams.set('t', String(Date.now()))
      return applyNoStoreHeaders(NextResponse.redirect(nextUrl))
    }
  }

  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = request.cookies.get('ai_handdrawn_login_session')?.value

    if (!session) {
      return applyNoStoreHeaders(NextResponse.redirect(new URL('/login', request.url)))
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(session)) as {
        email?: string
        expiresAt?: number
      }

      if (!parsed.email || !parsed.expiresAt || parsed.expiresAt < Date.now()) {
        return applyNoStoreHeaders(NextResponse.redirect(new URL('/login', request.url)))
      }

      if (!ADMIN_EMAILS.includes(parsed.email.trim().toLowerCase())) {
        return applyNoStoreHeaders(NextResponse.redirect(new URL('/', request.url)))
      }
    } catch {
      return applyNoStoreHeaders(NextResponse.redirect(new URL('/login', request.url)))
    }
  }

  return applyNoStoreHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.svg|default-avatar.svg|wechat-qrcode.png).*)',
  ],
}
