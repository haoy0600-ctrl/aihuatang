import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const ADMIN_EMAIL = '50923561@qq.com'

type AuthUser = {
  id: string
  email: string
}

export function unauthorized(message = '请先登录') {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbidden(message = '权限不足') {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
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

  if (auth.user.email !== ADMIN_EMAIL) {
    return { user: null, response: forbidden() }
  }

  return { user: auth.user, response: null }
}
