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

    const systemPrompt = `你是一个精通各大主流英语教材的顶级金牌教师。你的任务是根据用户输入的简短课程线索（如：新概念1第一课、小初高同步单词等），直接输出该课程对应的最标准、最完整的英文教材内容、生词词汇、国际音标及中文对照翻译。
【严格限制】：
1. 不要说任何一句客套话、解释或引言，直接输出排版后的正文。
2. 合理使用换行和小标题，使其排版紧凑、高密度，完美适合直接用于 9:16 自媒体图卡渲染。`;

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