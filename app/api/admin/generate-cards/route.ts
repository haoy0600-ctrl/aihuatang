import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const generateRandomCard = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
    if ((i + 1) % 4 === 0 && i < 15) {
      result += '-'
    }
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: '系统配置未完成，请稍后重试'
      }, { status: 500 })
    }

    const { adminEmail, count, credits } = await request.json()

    if (!adminEmail || adminEmail !== '50923561@qq.com') {
      return NextResponse.json({
        success: false,
        error: '权限不足'
      }, { status: 403 })
    }

    if (!count || count <= 0 || count > 100) {
      return NextResponse.json({
        success: false,
        error: '生成数量必须在1-100之间'
      }, { status: 400 })
    }

    if (!credits || credits <= 0) {
      return NextResponse.json({
        success: false,
        error: '卡密积分必须大于0'
      }, { status: 400 })
    }

    const cards = []
    const batchSize = 20

    for (let i = 0; i < count; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, count - i)
      const batchCards = []

      for (let j = 0; j < currentBatchSize; j++) {
        let cardCode = generateRandomCard()
        
        let exists = true
        let attempts = 0
        while (exists && attempts < 10) {
          const { count: existingCount } = await supabaseAdmin
            .from('cards')
            .select('id', { count: 'exact' })
            .eq('code', cardCode)
            .limit(0)
          
          if (existingCount === 0) {
            exists = false
          } else {
            cardCode = generateRandomCard()
            attempts++
          }
        }

        if (exists) {
          return NextResponse.json({
            success: false,
            error: '生成卡密失败，尝试次数过多'
          }, { status: 500 })
        }

        batchCards.push({
          code: cardCode,
          credits: credits,
          is_used: false,
          created_at: new Date().toISOString()
        })
      }

      const { error } = await supabaseAdmin
        .from('cards')
        .insert(batchCards)

      if (error) {
        console.error('Insert cards error:', error)
        return NextResponse.json({
          success: false,
          error: '生成卡密失败'
        }, { status: 500 })
      }

      cards.push(...batchCards)
    }

    return NextResponse.json({
      success: true,
      message: `成功生成 ${count} 张卡密`,
      cards: cards
    })
  } catch (error) {
    console.error('Admin generate cards error:', error)
    return NextResponse.json({
      success: false,
      error: '生成卡密失败，请稍后重试'
    }, { status: 500 })
  }
}