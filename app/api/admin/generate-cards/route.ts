import { NextRequest, NextResponse } from 'next/server'
import { requireAdminUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const generateRandomCard = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''

  for (let i = 0; i < 16; i += 1) {
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
      return NextResponse.json(
        {
          success: false,
          error: '系统配置未完成，请稍后重试。',
        },
        { status: 500 },
      )
    }

    const { count, credits } = await request.json()

    const auth = await requireAdminUser(request)
    if (auth.response || !auth.user) return auth.response

    if (!count || count <= 0 || count > 100) {
      return NextResponse.json(
        {
          success: false,
          error: '生成数量必须在 1 到 100 之间。',
        },
        { status: 400 },
      )
    }

    if (!credits || credits <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: '卡密积分必须大于 0。',
        },
        { status: 400 },
      )
    }

    const cards: Array<{
      code: string
      credits: number
      status: 'unused'
      created_at: string
    }> = []

    const batchSize = 20

    for (let i = 0; i < count; i += batchSize) {
      const currentBatchSize = Math.min(batchSize, count - i)
      const batchCards = []

      for (let j = 0; j < currentBatchSize; j += 1) {
        let cardCode = generateRandomCard()
        let exists = true
        let attempts = 0

        while (exists && attempts < 10) {
          const { data: existingCards, error: checkError } = await supabaseAdmin
            .from('card_codes')
            .select('id')
            .eq('code', cardCode)
            .limit(1)

          if (checkError) {
            console.error('[GenerateCards] Check duplicate error:', checkError)
            attempts += 1
            cardCode = generateRandomCard()
            continue
          }

          if (!existingCards || existingCards.length === 0) {
            exists = false
          } else {
            attempts += 1
            cardCode = generateRandomCard()
          }
        }

        if (exists) {
          return NextResponse.json(
            {
              success: false,
              error: '生成卡密失败，重复校验次数过多。',
            },
            { status: 500 },
          )
        }

        batchCards.push({
          code: cardCode,
          credits,
          status: 'unused' as const,
          created_at: new Date().toISOString(),
        })
      }

      const { error } = await supabaseAdmin.from('card_codes').insert(batchCards)

      if (error) {
        console.error('Insert cards error:', error)
        return NextResponse.json(
          {
            success: false,
            error: '生成卡密失败。',
          },
          { status: 500 },
        )
      }

      cards.push(...batchCards)
    }

    return NextResponse.json({
      success: true,
      message: `成功生成 ${count} 张卡密。`,
      cards,
    })
  } catch (error) {
    console.error('Admin generate cards error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '生成卡密失败，请稍后重试。',
      },
      { status: 500 },
    )
  }
}
