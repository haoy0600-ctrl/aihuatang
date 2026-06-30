import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import crypto from 'crypto'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

type ExecError = Error & {
  stdout?: string
  stderr?: string
  code?: number | string
}

function isAllowedRequest(request: Request, rawBody: string, deploySecret: string) {
  const manualSecret = request.headers.get('x-deploy-secret')
  if (manualSecret && manualSecret === deploySecret) {
    return true
  }

  const githubSignature = request.headers.get('x-hub-signature-256')
  if (!githubSignature) {
    return false
  }

  const expectedSignature =
    'sha256=' + crypto.createHmac('sha256', deploySecret).update(rawBody).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(githubSignature), Buffer.from(expectedSignature))
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const deploySecret = process.env.DEPLOY_SECRET
  const deployScriptPath = process.env.DEPLOY_SCRIPT_PATH

  if (!deploySecret) {
    return NextResponse.json({ success: false, message: 'DEPLOY_SECRET is not configured' }, { status: 500 })
  }

  if (!deployScriptPath) {
    return NextResponse.json({ success: false, message: 'DEPLOY_SCRIPT_PATH is not configured' }, { status: 500 })
  }

  const rawBody = await request.text()

  if (!isAllowedRequest(request, rawBody, deploySecret)) {
    return NextResponse.json({ success: false, message: 'Invalid deploy secret' }, { status: 401 })
  }

  let payload: { ref?: string } = {}
  try {
    payload = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    payload = {}
  }

  if (payload.ref && payload.ref !== 'refs/heads/main') {
    return NextResponse.json({ success: true, message: 'Ignored non-main branch' })
  }

  try {
    const { stdout, stderr } = await execFileAsync(deployScriptPath, [], {
      timeout: 1000 * 60 * 10,
      maxBuffer: 1024 * 1024 * 10,
    })

    return NextResponse.json({
      success: true,
      message: 'Deploy completed',
      stdout,
      stderr,
    })
  } catch (error) {
    const execError = error as ExecError

    console.error('Deploy failed:', execError)
    return NextResponse.json(
      {
        success: false,
        message: execError.message || 'Deploy failed',
        code: execError.code,
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      },
      { status: 500 },
    )
  }
}
