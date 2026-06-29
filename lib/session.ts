export const SESSION_STORAGE_KEY = 'ai_handdrawn_login_session'
export const REMEMBERED_ACCOUNT_KEY = 'ai_handdrawn_remembered_account'

export interface LoginSession {
  id: string
  email: string
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

function getCookieValue(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

function setCookieValue(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax${secure}`
}

function clearCookieValue(name: string) {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${name}=; path=/; max-age=0; samesite=lax${secure}`
}

export function getStoredSession(): LoginSession | null {
  if (typeof window === 'undefined') return null

  try {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!storedSession) return null

    const session = JSON.parse(storedSession) as Partial<LoginSession>
    if (!session.email || !session.accessToken || !session.expiresAt) return null
    if (session.expiresAt < Date.now()) {
      clearStoredSession()
      return null
    }

    return session as LoginSession
  } catch {
    clearStoredSession()
    return null
  }
}

export function saveStoredSession(session: LoginSession) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))

  const cookieValue = encodeURIComponent(JSON.stringify({
    email: session.email,
    expiresAt: session.expiresAt,
  }))
  const secure = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${SESSION_STORAGE_KEY}=${cookieValue}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax${secure}`
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_STORAGE_KEY)
  const secure = window.location.protocol === 'https:' ? '; secure' : ''
  document.cookie = `${SESSION_STORAGE_KEY}=; path=/; max-age=0; samesite=lax${secure}`
}

export function authHeaders(contentType = true): HeadersInit {
  const session = getStoredSession()
  return {
    ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
  }
}

export function getRememberedAccount(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(REMEMBERED_ACCOUNT_KEY) || getCookieValue(REMEMBERED_ACCOUNT_KEY) || ''
}

export function saveRememberedAccount(account: string) {
  if (typeof window === 'undefined') return
  const normalized = account.trim().toLowerCase()
  localStorage.setItem(REMEMBERED_ACCOUNT_KEY, normalized)
  setCookieValue(REMEMBERED_ACCOUNT_KEY, normalized, 180 * 24 * 60 * 60)
}

export function clearRememberedAccount() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REMEMBERED_ACCOUNT_KEY)
  clearCookieValue(REMEMBERED_ACCOUNT_KEY)
}
