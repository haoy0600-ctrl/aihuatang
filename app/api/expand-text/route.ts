import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入课程线索' },
        { status: 400 }
      );
    }

    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json(
        { error: 'DeepSeek API Key 未配置' },
        { status: 500 }
      );
    }

    const systemPrompt = `你是一个顶级视觉信息设计师与知识提炼专家。请将用户输入的任何领域的粗糙、冗长文本（涵盖教育、建筑工程、数码、职场、生活等），重构为适合在 9:16 自媒体图卡上展示的高密度、规整排版文本。
【硬性排版要求】：
1. 提炼出核心主题，并使用 markdown 语法（如 ### 小标题、**核心词粗体**、- 列表形式）进行模块化解构。
2. 保持语言精炼致命，信息密度极高。
3. 严格禁止输出任何客套话、解释或前导词，直接输出优化后的排版正文。`;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'DeepSeek API 调用失败' },
        { status: response.status }
      );
    }

    const expandedText = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      expandedText
    });

  } catch (error) {
    console.error('DeepSeek API Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}