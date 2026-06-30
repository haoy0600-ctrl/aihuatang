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
  const root = process.cwd()
  const deployedRevision = readFileIfExists(path.join(root, '.deployed-rev'))
  const buildInfoPath = path.join(root, 'public', 'build-info.json')
  const buildInfo = readFileIfExists(buildInfoPath)

  return NextResponse.json(
    {
      ok: true,
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
