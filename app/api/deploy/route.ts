import { NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function POST(request: Request) {
  try {
    const deploySecret = process.env.DEPLOY_SECRET
    const deployScriptPath = process.env.DEPLOY_SCRIPT_PATH

    if (!deploySecret) {
      return NextResponse.json({ success: false, message: '部署密钥未配置。' }, { status: 500 })
    }

    if (!deployScriptPath) {
      return NextResponse.json({ success: false, message: '部署脚本路径未配置。' }, { status: 500 })
    }

    const headerSecret = request.headers.get('x-deploy-secret')
    if (headerSecret !== deploySecret) {
      return NextResponse.json({ success: false, message: '无权部署。' }, { status: 401 })
    }

    const { ref } = await request.json()
    if (ref !== 'refs/heads/main') {
      return NextResponse.json({ success: false, message: '仅允许部署 main 分支。' })
    }

    const { stdout, stderr } = await execFileAsync(deployScriptPath, [])

    console.log('Deploy stdout:', stdout)
    if (stderr) {
      console.error('Deploy stderr:', stderr)
    }

    return NextResponse.json({ success: true, message: '部署成功。', stdout })
  } catch (error) {
    console.error('Deploy failed:', error)
    return NextResponse.json({ success: false, message: '部署失败。' }, { status: 500 })
  }
}
