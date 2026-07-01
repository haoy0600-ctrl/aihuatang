'use client'

import { useEffect } from 'react'
import { REMEMBERED_ACCOUNT_KEY, SESSION_STORAGE_KEY } from '@/lib/session'

const FRONTEND_VERSION_KEY = 'ai_huatang_frontend_revision'
const KEEP_LOCAL_STORAGE_KEYS = new Set([SESSION_STORAGE_KEY, REMEMBERED_ACCOUNT_KEY, FRONTEND_VERSION_KEY])
const VERSIONED_PATHS = new Set(['/dashboard', '/records', '/recharge', '/profile', '/announcements'])

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

export function ClientVersionGuard() {
  useEffect(() => {
    let cancelled = false

    const verifyVersion = async () => {
      try {
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
        const currentUrl = new URL(window.location.href)
        const urlRevision = currentUrl.searchParams.get('v')
        const shouldVersionPage = VERSIONED_PATHS.has(window.location.pathname)

        if (currentRevision && currentRevision !== nextRevision) {
          clearClientCaches(nextRevision)
          currentUrl.searchParams.set('v', nextRevision)
          window.location.replace(currentUrl.toString())
          return
        }

        if (shouldVersionPage && urlRevision !== nextRevision) {
          clearClientCaches(nextRevision)
          currentUrl.searchParams.set('v', nextRevision)
          window.location.replace(currentUrl.toString())
          return
        }

        localStorage.setItem(FRONTEND_VERSION_KEY, nextRevision)
      } catch (error) {
        console.error('Failed to verify frontend version:', error)
      }
    }

    void verifyVersion()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
