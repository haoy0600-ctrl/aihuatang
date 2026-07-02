'use client'

import {
  CURRENT_FRONTEND_BUNDLE,
  FRONTEND_VERSION_KEY,
  shouldVersionPathname,
} from '@/lib/frontend-version'

export function getStoredFrontendRevision() {
  try {
    return localStorage.getItem(FRONTEND_VERSION_KEY) || ''
  } catch {
    return ''
  }
}

export function buildFreshUrl(rawHref: string, nextRevision?: string) {
  const url = new URL(rawHref, window.location.origin)
  const revision = nextRevision || getStoredFrontendRevision() || String(Date.now())

  url.searchParams.set('v', revision)
  url.searchParams.set('ui', CURRENT_FRONTEND_BUNDLE)
  url.searchParams.set('t', String(Date.now()))

  return url.toString()
}

export function hardNavigate(rawHref: string) {
  const url = new URL(rawHref, window.location.origin)
  if (!shouldVersionPathname(url.pathname)) {
    window.location.assign(url.toString())
    return
  }

  window.location.assign(buildFreshUrl(url.toString()))
}
