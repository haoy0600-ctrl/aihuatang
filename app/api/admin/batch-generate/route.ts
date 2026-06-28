import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdminUser } from '@/lib/auth'

const CARD_TIERS = [
  { id: '10', name: '尝鲜款', price: 10, credits: 100 },
  { id: '29', name: '自媒体高频款', price: 29, credits: 320 },
  { id: '59', name: '金牌教师大包款', price: 59, credits: 700 },
  { id: '99', name: '机构尊享大额款', price: 99, credits: 1300 },
  { id: '199', name: '工作室终极清仓款', price: 199, credits: 2800 },
]

function generateCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'AHT-'
  for (let i = 0; i < 4; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  code += '-'
  for (let i = 0; i < 4; i += 1) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

async function generateUniqueCardCode(): Promise<string> {
  let code = generateCardCode()

  if (!supabaseAdmin) {
    return code
  }

  for (let i = 0; i < 10; i += 1) {
    const { data } = await supabaseAdmin.from('card_codes').select('id').eq('code', code).limit(1)

    if (!data || data.length === 0) {
      return code
    }
    code = generateCardCode()
  }

  return `${code}-${Date.now().toString(36).toUpperCase()}`
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) return auth.response

    const { tierId, customCredits, count } = await request.json()

    const numCount = parseInt(count || '1', 10)
    if (numCount < 1 || numCount > 100) {
      return NextResponse.json({ success: false, error: '生成数量必须在 1 到 100 之间。' }, { status: 400 })
    }

    let credits = 0
    let selectedTierName = ''

    if (tierId && tierId !== 'custom') {
      const tier = CARD_TIERS.find((item) => item.id === tierId)
      if (!tier) {
        return NextResponse.json({ success: false, error: '无效的档位选择。' }, { status: 400 })
      }
      credits = tier.credits
      selectedTierName = tier.name
    } else if (customCredits) {
      const customAmount = parseInt(customCredits, 10)
      if (customAmount < 10 || customAmount > 100000) {
        return NextResponse.json({ success: false, error: '自定义积分必须在 10 到 100000 之间。' }, { status: 400 })
      }
      credits = customAmount
      selectedTierName = `自定义 ${customAmount} 积分`
    } else {
      return NextResponse.json({ success: false, error: '请选择档位或输入自定义积分。' }, { status: 400 })
    }

    const adminClient = supabaseAdmin
    if (!adminClient) {
      return NextResponse.json({ success: false, error: '系统配置未完成，请稍后重试。' }, { status: 500 })
    }

    const cardCodes = []
    for (let i = 0; i < numCount; i += 1) {
      const code = await generateUniqueCardCode()
      cardCodes.push({
        code,
        credits,
        status: 'unused',
        created_at: new Date().toISOString(),
      })
    }

    const { error } = await adminClient.from('card_codes').insert(cardCodes)

    if (error) {
      console.error('Failed to insert card codes:', error)
      return NextResponse.json({ success: false, error: '制卡失败，请重试。' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      cards: cardCodes,
      tierName: selectedTierName,
      totalCredits: credits * numCount,
      count: numCount,
    })
  } catch (error) {
    console.error('Batch generate error:', error)
    return NextResponse.json({ success: false, error: '服务器内部错误。' }, { status: 500 })
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      tiers: CARD_TIERS,
    })
  } catch {
    return NextResponse.json({ success: false, error: '服务器内部错误。' }, { status: 500 })
  }
}
