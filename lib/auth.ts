import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '50923561@qq.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

type AuthUser = {
  id: string
  email: string
}

export function unauthorized(message = '请先登录。') {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbidden(message = '权限不足。') {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice('Bearer '.length).trim() || null
}

export async function getAuthenticatedUser(request: NextRequest): Promise<AuthUser | null> {
  if (!supabaseAdmin) return null

  const token = getBearerToken(request)
  if (!token) return null

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  const user = data?.user
  if (error || !user?.id || !user.email) return null

  return {
    id: user.id,
    email: user.email,
  }
}

export async function requireAuthenticatedUser(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return { user: null, response: unauthorized() }
  }

  return { user, response: null }
}

export async function requireAdminUser(request: NextRequest) {
  const auth = await requireAuthenticatedUser(request)
  if (auth.response || !auth.user) return auth

  if (!isAdminEmail(auth.user.email)) {
    return { user: null, response: forbidden() }
  }

  return { user: auth.user, response: null }
}
