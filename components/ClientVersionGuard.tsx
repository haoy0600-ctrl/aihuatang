'use client'

import { useEffect } from 'react'
import { REMEMBERED_ACCOUNT_KEY, SESSION_STORAGE_KEY } from '@/lib/session'

const FRONTEND_VERSION_KEY = 'ai_huatang_frontend_revision'
const FRONTEND_BUNDLE_KEY = 'ai_huatang_frontend_bundle'
const CURRENT_FRONTEND_BUNDLE = '2026-07-02-dynamic-v1'
const KEEP_LOCAL_STORAGE_KEYS = new Set([
  SESSION_STORAGE_KEY,
  REMEMBERED_ACCOUNT_KEY,
  FRONTEND_VERSION_KEY,
  FRONTEND_BUNDLE_KEY,
])
const VERSIONED_PATHS = new Set(['/', '/dashboard', '/records', '/recharge', '/profile', '/announcements', '/login'])

function shouldVersionPath(pathname: string) {
  return VERSIONED_PATHS.has(pathname) || pathname === '/admin' || pathname.startsWith('/admin/')
}

function buildVersionedUrl(rawHref: string, nextRevision?: string) {
  const url = new URL(rawHref, window.location.origin)
  const revision = nextRevision || localStorage.getItem(FRONTEND_VERSION_KEY) || String(Date.now())

  url.searchParams.set('v', revision)
  url.searchParams.set('ui', CURRENT_FRONTEND_BUNDLE)
  url.searchParams.set('t', String(Date.now()))

  return url.toString()
}

function clearClientCaches(nextRevision: string) {
  try {
    const keysToRemove: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key && !KEEP_LOCAL_STORAGE_KEYS.has(key)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key))
    localStorage.setItem(FRONTEND_VERSION_KEY, nextRevision)
    localStorage.setItem(FRONTEND_BUNDLE_KEY, CURRENT_FRONTEND_BUNDLE)
  } catch (error) {
    console.error('Failed to clear local storage cache:', error)
  }

  if ('caches' in window) {
    void caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch((error) => {
      console.error('Failed to clear browser caches:', error)
    })
  }

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    }).catch((error) => {
      console.error('Failed to unregister service workers:', error)
    })
  }
}

function syncSessionCookie() {
  try {
    const storedSession = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!storedSession) return

    const session = JSON.parse(storedSession) as {
      email?: string
      expiresAt?: number
    }
    if (!session.email || !session.expiresAt || session.expiresAt < Date.now()) return

    const cookieValue = encodeURIComponent(JSON.stringify({
      email: session.email,
      expiresAt: session.expiresAt,
    }))
    const secure = window.location.protocol === 'https:' ? '; secure' : ''
    document.cookie = `${SESSION_STORAGE_KEY}=${cookieValue}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax${secure}`
  } catch (error) {
    console.error('Failed to sync session cookie:', error)
  }
}

export function ClientVersionGuard() {
  useEffect(() => {
    let cancelled = false

    const verifyVersion = async () => {
      try {
        syncSessionCookie()

        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        })
        const data = await response.json()
        const nextRevision = String(data.revision || data.buildInfo?.revision || '')
        if (!nextRevision || cancelled) return

        const currentRevision = localStorage.getItem(FRONTEND_VERSION_KEY)
        const currentBundle = localStorage.getItem(FRONTEND_BUNDLE_KEY)
        const currentUrl = new URL(window.location.href)
        const urlRevision = currentUrl.searchParams.get('v')
        const urlBundle = currentUrl.searchParams.get('ui')
        const shouldVersionPage = shouldVersionPath(window.location.pathname)

        if (
          currentRevision !== nextRevision ||
          currentBundle !== CURRENT_FRONTEND_BUNDLE
        ) {
          clearClientCaches(nextRevision)
          window.location.replace(buildVersionedUrl(currentUrl.toString(), nextRevision))
          return
        }

        if (shouldVersionPage && (urlRevision !== nextRevision || urlBundle !== CURRENT_FRONTEND_BUNDLE)) {
          clearClientCaches(nextRevision)
          window.location.replace(buildVersionedUrl(currentUrl.toString(), nextRevision))
          return
        }

        localStorage.setItem(FRONTEND_VERSION_KEY, nextRevision)
        localStorage.setItem(FRONTEND_BUNDLE_KEY, CURRENT_FRONTEND_BUNDLE)
      } catch (error) {
        console.error('Failed to verify frontend version:', error)
      }
    }

    const enforceCurrentUrlVersion = () => {
      try {
        const currentUrl = new URL(window.location.href)
        if (!shouldVersionPath(currentUrl.pathname)) return

        const storedRevision = localStorage.getItem(FRONTEND_VERSION_KEY)
        const urlRevision = currentUrl.searchParams.get('v')
        const urlBundle = currentUrl.searchParams.get('ui')

        if (
          storedRevision &&
          (urlRevision !== storedRevision || urlBundle !== CURRENT_FRONTEND_BUNDLE)
        ) {
          window.location.replace(buildVersionedUrl(currentUrl.toString(), storedRevision))
        }
      } catch (error) {
        console.error('Failed to enforce frontend version URL:', error)
      }
    }

    void verifyVersion()
    const versionTimer = window.setInterval(enforceCurrentUrlVersion, 1000)

    const forceFreshAppNavigation = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return

      const url = new URL(anchor.href, window.location.origin)
      if (url.origin !== window.location.origin || !shouldVersionPath(url.pathname)) return

      event.preventDefault()
      event.stopPropagation()
      window.location.assign(buildVersionedUrl(url.toString()))
    }

    document.addEventListener('click', forceFreshAppNavigation, true)

    return () => {
      cancelled = true
      window.clearInterval(versionTimer)
      document.removeEventListener('click', forceFreshAppNavigation, true)
    }
  }, [])

  return null
}
