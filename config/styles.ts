export interface HanddrawnStyle {
  id: number
  name: string
  category: string
  purpose: string
  styleKeywords: string
  layoutDirectives: string
}

export const HANDDRAWN_STYLES: HanddrawnStyle[] = [
  {
    id: 1,
    name: '卡通知识图',
    category: '高转化热门',
    purpose: '适合课程总结、知识点拆解、儿童教育图卡。',
    styleKeywords:
      'Cute cartoon hand-drawn illustration, vibrant saturated colors, clean vector lines, playful character design, educational infographic, friendly facial expressions, bright classroom feeling, polished composition, premium quality',
    layoutDirectives:
      'Use comic-style modular panels, clear numbered sections, bold title banner, speech bubbles, rounded cards, strong hierarchy, keep text readable and tidy.',
  },
  {
    id: 2,
    name: '黏土立体卡片',
    category: '高转化热门',
    purpose: '适合封面图、卖点图、课程主视觉。',
    styleKeywords:
      '3D clay illustration, soft inflated shapes, adorable miniature scene, matte material, studio lighting, premium render, warm friendly mood, product-card visual, clean background',
    layoutDirectives:
      'Use layered depth, floating objects, strong focal object, large breathing space, premium showroom composition.',
  },
  {
    id: 3,
    name: '玻璃拟态信息卡',
    category: '科技产品',
    purpose: '适合科技、工具、效率类内容。',
    styleKeywords:
      'Glassmorphism interface, translucent frosted panels, subtle cyan glow, high-end UI design, futuristic but minimal, clean data-card presentation, elegant lighting, premium digital feel',
    layoutDirectives:
      'Use translucent cards, soft glow dividers, layered glass panels, clean spacing, concise typography, avoid clutter.',
  },
  {
    id: 4,
    name: '便签拼贴笔记',
    category: '内容种草',
    purpose: '适合清单、经验分享、复盘总结。',
    styleKeywords:
      'Sticky note collage, scrapbook style, hand-crafted notes, tape details, layered paper texture, cozy desk atmosphere, colorful but organized, lifestyle creator aesthetic',
    layoutDirectives:
      'Use overlapping memo blocks, pinned note layout, handwritten labels, playful separators, but maintain clean reading order.',
  },
  {
    id: 5,
    name: '课堂手账插画',
    category: '教育专用',
    purpose: '适合学生笔记、教师课件、课程导图。',
    styleKeywords:
      'Digital notebook illustration, pastel marker notes, classroom handout style, soft educational colors, clear labels, tidy study layout, friendly and practical',
    layoutDirectives:
      'Use notebook sections, highlighted key points, structured bullets, simple doodles, make educational content easy to scan.',
  },
  {
    id: 6,
    name: '杂志封面排版',
    category: '品牌内容',
    purpose: '适合公众号头图、小红书封面、栏目主图。',
    styleKeywords:
      'Editorial magazine cover, strong typography, stylish composition, modern visual hierarchy, commercial design, premium publication look, polished color contrast',
    layoutDirectives:
      'Use bold heading area, clean image-text split, visual rhythm, elegant margins, cover-like focal layout.',
  },
  {
    id: 7,
    name: '北欧清爽极简',
    category: '高级极简',
    purpose: '适合生活方式、美学、轻知识内容。',
    styleKeywords:
      'Nordic minimalist illustration, muted palette, airy white space, elegant soft shadows, calm and refined mood, tasteful editorial look, premium simplicity',
    layoutDirectives:
      'Use large margins, light blocks, clean symmetry, understated decoration, emphasize calm and readability.',
  },
  {
    id: 8,
    name: '科技蓝光看板',
    category: '高级极简',
    purpose: '适合产品介绍、数据图表、平台能力展示。',
    styleKeywords:
      'High-end tech dashboard, cool blue glow, digital analytics interface, futuristic panels, professional enterprise tone, crisp details, premium product visualization',
    layoutDirectives:
      'Use dashboard cards, glowing separators, chart placeholders, modular layout, clear data hierarchy, enterprise-grade polish.',
  },
  {
    id: 9,
    name: '绘本故事分镜',
    category: '情绪表达',
    purpose: '适合故事讲解、案例拆解、互动教学。',
    styleKeywords:
      'Picture book storytelling, warm illustrated scenes, expressive characters, soft cinematic light, emotional but clean, children-friendly narrative panels',
    layoutDirectives:
      'Use story panels, visual sequence, title ribbon, short dialog bubbles, clear beginning-middle-end composition.',
  },
  {
    id: 10,
    name: '高密度图文排版',
    category: '信息承载',
    purpose: '适合知识总结、课程归纳、长文拆解。',
    styleKeywords:
      'High-density infographic, structured information blocks, clear icons, educational layout, readable text zones, efficient content packing, polished creator template',
    layoutDirectives:
      'Use dense but tidy grid, numbered modules, strong contrast headings, consistent spacing, keep every block easy to scan.',
  },
  {
    id: 11,
    name: '治愈柔光插画',
    category: '情绪表达',
    purpose: '适合疗愈、情感、成长内容。',
    styleKeywords:
      'Soft healing illustration, warm ambient light, cozy atmosphere, dreamy palette, emotional storytelling, delicate character expressions, premium lifestyle visual',
    layoutDirectives:
      'Use soft rounded areas, glow accents, gentle contrast, warm visual center, breathing room around key copy.',
  },
  {
    id: 12,
    name: '黑金高级商业',
    category: '品牌内容',
    purpose: '适合高客单产品、会员权益、商业海报。',
    styleKeywords:
      'Luxury black and gold commercial design, premium contrast, rich texture, confident visual language, high-end product poster, elegant dramatic lighting',
    layoutDirectives:
      'Use bold focal layout, black base, gold accent lines, strong negative space, premium showcase composition.',
  },
]
