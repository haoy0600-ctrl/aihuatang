import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = request.cookies.get('ai_handdrawn_login_session')?.value

    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      JSON.parse(decodeURIComponent(session))
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
