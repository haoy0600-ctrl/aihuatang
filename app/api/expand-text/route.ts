import { NextResponse } from 'next/server'

function sanitizeExpandedMarkdown(text: string) {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    const inputText = String(text || '').trim()

    if (!inputText) {
      return NextResponse.json({ error: '请输入需要优化的内容。' }, { status: 400 })
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY
    if (!deepseekApiKey) {
      return NextResponse.json({ error: 'DeepSeek API Key 未配置。' }, { status: 500 })
    }

    const systemPrompt = `
你是一位擅长“知识图卡文案重构”的中文内容编辑。
你的任务是：把用户输入的原始文字，整理成适合 9:16 自媒体知识图卡使用的高密度排版文案。
请严格遵守以下要求：
1. 只输出优化后的正文，不要解释，不要寒暄，不要加“当然可以”“以下是”等前导语。
2. 保留原意，但提升结构感、重点感和可读性。
3. 使用 Markdown 组织内容，例如：
   - 使用 \`###\` 作为小标题
   - 使用 \`- \` 作为要点列表
   - 对核心词使用 \`**加粗**\`
4. 语言要简洁、有节奏，尽量适合直接放进图片排版。
5. 如果原文信息太少，就在不捏造事实的前提下做合理归纳和表达优化。
6. 默认输出中文。`.trim()

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: inputText },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'DeepSeek 调用失败，请稍后重试。' },
        { status: response.status },
      )
    }

    const expandedText = sanitizeExpandedMarkdown(data.choices?.[0]?.message?.content?.trim() || '')

    return NextResponse.json({
      success: true,
      expandedText,
    })
  } catch (error) {
    console.error('DeepSeek expand-text error:', error)
    return NextResponse.json({ error: '服务器内部错误，请稍后重试。' }, { status: 500 })
  }
}
