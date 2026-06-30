import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import crypto from 'crypto'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

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
    return NextResponse.json({ success: false, message: 'DEPLOY_SECRET 未配置' }, { status: 500 })
  }

  if (!deployScriptPath) {
    return NextResponse.json({ success: false, message: 'DEPLOY_SCRIPT_PATH 未配置' }, { status: 500 })
  }

  const rawBody = await request.text()

  if (!isAllowedRequest(request, rawBody, deploySecret)) {
    return NextResponse.json({ success: false, message: '部署密钥校验失败' }, { status: 401 })
  }

  let payload: { ref?: string } = {}
  try {
    payload = rawBody ? JSON.parse(rawBody) : {}
  } catch {
    payload = {}
  }

  if (payload.ref && payload.ref !== 'refs/heads/main') {
    return NextResponse.json({ success: true, message: '非 main 分支，已忽略' })
  }

  try {
    const { stdout, stderr } = await execFileAsync(deployScriptPath, [], {
      timeout: 1000 * 60 * 10,
      maxBuffer: 1024 * 1024 * 5,
    })

    return NextResponse.json({
      success: true,
      message: '部署完成',
      stdout,
      stderr,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误'
    console.error('Deploy failed:', error)
    return NextResponse.json({ success: false, message: `部署失败：${message}` }, { status: 500 })
  }
}
