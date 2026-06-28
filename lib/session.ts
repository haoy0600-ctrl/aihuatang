export const SESSION_STORAGE_KEY = 'ai_handdrawn_login_session'
export const REMEMBERED_ACCOUNT_KEY = 'ai_handdrawn_remembered_account'

export interface LoginSession {
  id: string
  email: string
  accessToken: string
  refreshToken?: string
  expiresAt: number
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
  return localStorage.getItem(REMEMBERED_ACCOUNT_KEY) || ''
}

export function saveRememberedAccount(account: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(REMEMBERED_ACCOUNT_KEY, account)
}

export function clearRememberedAccount() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REMEMBERED_ACCOUNT_KEY)
}
