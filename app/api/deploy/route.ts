import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const deploySecret = process.env.DEPLOY_SECRET
    if (!deploySecret) {
      return NextResponse.json({ success: false, message: '部署密钥未配置' }, { status: 500 })
    }

    const headerSecret = request.headers.get('x-deploy-secret')
    if (headerSecret !== deploySecret) {
      return NextResponse.json({ success: false, message: '无权部署' }, { status: 401 })
    }

    const { ref } = await request.json()
    
    if (ref !== 'refs/heads/main') {
      return NextResponse.json({ success: false, message: '只处理 main 分支' })
    }

    const { stdout, stderr } = await execAsync('/www/wwwroot/aihuatang/deploy.sh')
    
    console.log('部署输出:', stdout)
    if (stderr) console.error('部署错误:', stderr)
    
    return NextResponse.json({ success: true, message: '部署成功', stdout })
  } catch (error) {
    console.error('部署失败:', error)
    return NextResponse.json({ success: false, message: '部署失败' }, { status: 500 })
  }
}
