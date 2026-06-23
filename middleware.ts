import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_EMAIL = '50923561@qq.com'

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = request.cookies.get('ai_handdrawn_login_session')?.value
    
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    try {
      const parsedSession = JSON.parse(session)
      if (!parsedSession.email || parsedSession.email !== ADMIN_EMAIL) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    } catch {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}