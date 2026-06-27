import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = request.cookies.get('ai_handdrawn_login_session')?.value

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(session)) as {
        email?: string
        expiresAt?: number
      }

      if (!parsed.email || !parsed.expiresAt || parsed.expiresAt < Date.now()) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
