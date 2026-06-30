import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { HANDDRAWN_STYLES } from '@/config/styles'
import { RECHARGE_PLANS } from '@/lib/recharge-plans'

export const dynamic = 'force-dynamic'

function readFileIfExists(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf8').trim()
    }
  } catch {
    return ''
  }

  return ''
}

export async function GET() {
  const cwd = process.cwd()
  const candidates = [
    cwd,
    path.resolve(cwd, '..'),
    path.resolve(cwd, '..', '..'),
  ]

  let appRoot = cwd
  let deployedRevision = ''
  let buildInfo: string | null = null

  for (const candidate of candidates) {
    const revision = readFileIfExists(path.join(candidate, '.deployed-rev'))
    const info = readFileIfExists(path.join(candidate, 'public', 'build-info.json'))
    if (revision || info) {
      appRoot = candidate
      deployedRevision = revision
      buildInfo = info || null
      break
    }
  }

  return NextResponse.json(
    {
      ok: true,
      appRoot,
      revision: deployedRevision || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      buildInfo: buildInfo ? JSON.parse(buildInfo) : null,
      styleCount: HANDDRAWN_STYLES.length,
      rechargePlanCount: RECHARGE_PLANS.length,
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    },
  )
}
