export interface HanddrawnStyle {
  id: number
  name: string
  category: string
  purpose: string
  styleKeywords: string
  layoutDirectives: string
}

export const HANDDRAWN_STYLES: HanddrawnStyle[] = [
  // 🔥 顶级爆款 (7种)
  {
    id: 1,
    name: '卡通手绘',
    category: '顶级爆款',
    purpose: '趣味生动知识科普',
    styleKeywords: 'cute cartoon hand-drawn illustration, vibrant colors, clean vector lines',
    layoutDirectives: 'playful comic panels, rounded box dividers'
  },
  {
    id: 2,
    name: '3D黏土膨胀风',
    category: '顶级爆款',
    purpose: '潮玩立体感图文',
    styleKeywords: '3D claymation puffy style, inflated squishy shapes, cute miniature model',
    layoutDirectives: 'chunky 3D grid layout, soft shadow block margins'
  },
  {
    id: 3,
    name: '毛玻璃磨砂质感',
    category: '顶级爆款',
    purpose: '现代高级科技图表',
    styleKeywords: 'frosted glassmorphism effect, blur matte texture, translucent overlays',
    layoutDirectives: 'sleek UI card container, neon subtle glow dividers'
  },
  {
    id: 4,
    name: '便当盒网格风',
    category: '顶级爆款',
    purpose: '多模块复杂信息整理',
    styleKeywords: 'bento box grid layout style, neat rectangular compartments',
    layoutDirectives: 'strict asymmetric grid framework, perfect boundary symmetry'
  },
  {
    id: 5,
    name: '剪纸层叠风',
    category: '顶级爆款',
    purpose: '情绪疗愈立体绘本',
    styleKeywords: 'layered papercut craft style, multi-layered shadow depth, silhouette shapes',
    layoutDirectives: '3D paper folding template lines, deep shadow dividers'
  },
  {
    id: 6,
    name: '3D极简C4D',
    category: '顶级爆款',
    purpose: '大厂大牌视觉提案',
    styleKeywords: 'minimalist 3D Cinema4D render, clean geometry, smooth clay material',
    layoutDirectives: 'isometric modular grid, abstract geometric placeholders'
  },
  {
    id: 7,
    name: '柔和矢量插画',
    category: '顶级爆款',
    purpose: '优雅文青短文配图',
    styleKeywords: 'soft vector illustration, warm flat colors, organic flowing lines',
    layoutDirectives: 'minimal aesthetic composition, ample breathing negative space'
  },

  // ✨ 特色极简 (8种)
  {
    id: 8,
    name: '极简风',
    category: '特色极简',
    purpose: '信息精炼核心突出',
    styleKeywords: 'minimalist graphic design, ultra-clean lines, monochromatic palette',
    layoutDirectives: 'maximal white space, single focal point, centered composition'
  },
  {
    id: 9,
    name: '现代简约风',
    category: '特色极简',
    purpose: '商务演示专业报告',
    styleKeywords: 'modern minimalist design, geometric abstraction, typography-focused',
    layoutDirectives: 'grid-based layout, balanced columns, structured hierarchy'
  },
  {
    id: 10,
    name: '北欧极简风',
    category: '特色极简',
    purpose: '生活方式自然主题',
    styleKeywords: 'Nordic minimalism, soft muted tones, organic hand-drawn elements',
    layoutDirectives: 'airy spacing, natural flow, organic grid placement'
  },
  {
    id: 11,
    name: '瑞士国际主义风',
    category: '特色极简',
    purpose: '国际品牌系统设计',
    styleKeywords: 'Swiss style design, bold typography, asymmetric balance',
    layoutDirectives: 'strict modular grid, mathematical proportions, clean alignment'
  },
  {
    id: 12,
    name: '包豪斯风',
    category: '特色极简',
    purpose: '设计教育艺术启蒙',
    styleKeywords: 'Bauhaus design, primary colors, geometric abstraction',
    layoutDirectives: 'geometric grid, color blocking, functional composition'
  },
  {
    id: 13,
    name: '高级留白风',
    category: '特色极简',
    purpose: '奢侈品高端展示',
    styleKeywords: 'luxury minimalism, refined elegance, premium white space',
    layoutDirectives: 'expansive margins, refined typography, breathing room composition'
  },
  {
    id: 14,
    name: '杂志排版风',
    category: '特色极简',
    purpose: '时尚内容图文混排',
    styleKeywords: 'editorial magazine design, dynamic typography, visual storytelling',
    layoutDirectives: 'asymmetric spreads, pull quotes, layered image-text integration'
  },
  {
    id: 15,
    name: '编辑设计风',
    category: '特色极简',
    purpose: '新闻资讯深度报道',
    styleKeywords: 'editorial design, journalistic layout, information hierarchy',
    layoutDirectives: 'column-based text flow, headline hierarchy, sidebar elements'
  },

  // 📱 现代数码手账 (9种)
  {
    id: 16,
    name: 'iPad Goodnotes手账风',
    category: '现代数码手账',
    purpose: '个人笔记学习记录',
    styleKeywords: 'digital handwriting, pastel highlighters, dotted journal pages',
    layoutDirectives: 'bullet journal format, decorative headers, color-coded sections'
  },
  {
    id: 17,
    name: 'Notion简约插画风',
    category: '现代数码手账',
    purpose: '工作协作知识管理',
    styleKeywords: 'Notion-style illustration, clean line art, soft muted colors',
    layoutDirectives: 'block-based layout, toggle sections, database table frames'
  },
  {
    id: 18,
    name: '墨水屏电子书风',
    category: '现代数码手账',
    purpose: '阅读批注深度思考',
    styleKeywords: 'e-ink display style, grayscale tones, paper-like texture',
    layoutDirectives: 'ebook reader layout, margin notes, highlight annotations'
  },
  {
    id: 19,
    name: '拟物化便签风',
    category: '现代数码手账',
    purpose: '快速记录随手贴',
    styleKeywords: 'skeuomorphic sticky note, realistic paper texture, taped edges',
    layoutDirectives: 'overlapping sticky notes, pinned board arrangement, shadow depth'
  },
  {
    id: 20,
    name: '日系胶片轻笔记',
    category: '现代数码手账',
    purpose: '生活记录文艺清新',
    styleKeywords: 'Japanese film aesthetic, soft grain, pastel color palette',
    layoutDirectives: 'photo album layout, timestamp annotations, memory framing'
  },
  {
    id: 21,
    name: 'Procreate水彩涂鸦风',
    category: '现代数码手账',
    purpose: '创意绘画灵感记录',
    styleKeywords: 'digital watercolor, brush texture, blended washes',
    layoutDirectives: 'canvas layout, layer stacking, paint splatter borders'
  },
  {
    id: 22,
    name: '多巴胺拼贴风',
    category: '现代数码手账',
    purpose: '活力满满的灵感板',
    styleKeywords: 'colorful collage, mixed media, vibrant cutouts',
    layoutDirectives: 'asymmetric arrangement, overlapping elements, tape effects'
  },
  {
    id: 23,
    name: '机能风黑客笔记',
    category: '现代数码手账',
    purpose: '技术笔记代码记录',
    styleKeywords: 'techwear cyberpunk, circuit patterns, dark theme',
    layoutDirectives: 'terminal-style layout, code blocks, system status indicators'
  },
  {
    id: 24,
    name: '全息UI图表风',
    category: '现代数码手账',
    purpose: '数据可视化科技感',
    styleKeywords: 'holographic UI, futuristic interface, glowing data streams',
    layoutDirectives: 'holographic overlays, data panels, sci-fi grid background'
  },

  // 📜 传统复古美学 (9种)
  {
    id: 25,
    name: '美式复古报纸风',
    category: '传统复古美学',
    purpose: '新闻资讯复古呈现',
    styleKeywords: 'vintage newspaper, old print, sepia tones, distressed paper',
    layoutDirectives: 'newspaper columns, headline banners, weathered borders'
  },
  {
    id: 26,
    name: '老旧羊皮纸炼金术风',
    category: '传统复古美学',
    purpose: '神秘知识古老典籍',
    styleKeywords: 'aged parchment, alchemy symbols, medieval manuscript',
    layoutDirectives: 'ornate borders, decorative initials, stained edges'
  },
  {
    id: 27,
    name: '中式水墨留白风',
    category: '传统复古美学',
    purpose: '东方美学文化传承',
    styleKeywords: 'Chinese ink wash painting, brush strokes, negative space',
    layoutDirectives: 'asymmetric balance, poetic spacing, calligraphy integration'
  },
  {
    id: 28,
    name: '复古连环画小人书风',
    category: '传统复古美学',
    purpose: '故事讲述怀旧情怀',
    styleKeywords: 'Chinese comic book, retro illustration, bold outlines',
    layoutDirectives: 'comic strip layout, speech bubbles, panel borders'
  },
  {
    id: 29,
    name: '黑白木刻版画风',
    category: '传统复古美学',
    purpose: '经典艺术严肃表达',
    styleKeywords: 'woodcut print, black and white, sharp contrasts',
    layoutDirectives: 'textured background, embossed effects, print borders'
  },
  {
    id: 30,
    name: '工业蓝图设计风',
    category: '传统复古美学',
    purpose: '工程图纸技术文档',
    styleKeywords: 'blueprint cyanotype, technical drawing, engineering plans',
    layoutDirectives: 'orthographic projections, dimension annotations, scale bars'
  },
  {
    id: 31,
    name: '波普艺术波点风',
    category: '传统复古美学',
    purpose: '潮流文化视觉冲击',
    styleKeywords: 'pop art, halftone dots, vibrant colors, bold outlines',
    layoutDirectives: 'comic book panels, ben-day dots, graphic elements'
  },
  {
    id: 32,
    name: '蒸汽朋克机械风',
    category: '传统复古美学',
    purpose: '机械美学复古未来',
    styleKeywords: 'steampunk machinery, brass gears, Victorian engineering',
    layoutDirectives: 'exploded mechanical views, brass plate labels, gear diagrams'
  },
  {
    id: 33,
    name: '大正浪漫复古风',
    category: '传统复古美学',
    purpose: '昭和年代怀旧氛围',
    styleKeywords: 'Taisho romantic style, Japanese retro, nostalgic atmosphere',
    layoutDirectives: 'vintage poster layout, cherry blossom motifs, retro typography'
  },

  // 🎓 教育与学术板书 (9种)
  {
    id: 34,
    name: '大学教授黑板粉笔风',
    category: '教育与学术板书',
    purpose: '课堂教学知识讲解',
    styleKeywords: 'chalkboard drawing, white chalk on black, handwritten text',
    layoutDirectives: 'centered chalk text, diagram illustrations, eraser smudge effects'
  },
  {
    id: 35,
    name: '白板马克笔思维导图风',
    category: '教育与学术板书',
    purpose: '思维梳理知识架构',
    styleKeywords: 'whiteboard marker, colorful diagrams, mind map structure',
    layoutDirectives: 'radial mind map, branching connections, color-coded nodes'
  },
  {
    id: 36,
    name: '麦肯锡商业PPT风',
    category: '教育与学术板书',
    purpose: '商业分析战略规划',
    styleKeywords: 'consulting presentation, professional charts, clean infographics',
    layoutDirectives: 'slide layout, agenda sections, data visualization grids'
  },
  {
    id: 37,
    name: '精装教科书插页风',
    category: '教育与学术板书',
    purpose: '教材插图知识图解',
    styleKeywords: 'textbook illustration, engraved line art, scientific accuracy',
    layoutDirectives: 'framed illustrations, caption placement, academic text wrapping'
  },
  {
    id: 38,
    name: '儿童简笔画涂鸦风',
    category: '教育与学术板书',
    purpose: '儿童教育启蒙认知',
    styleKeywords: 'children scribble, simple shapes, colorful crayon drawing',
    layoutDirectives: 'large text blocks, playful arrangement, simple borders'
  },
  {
    id: 39,
    name: '达芬奇手稿复古风',
    category: '教育与学术板书',
    purpose: '科学探索创意草图',
    styleKeywords: 'Da Vinci manuscript, anatomical sketches, mechanical drawings',
    layoutDirectives: 'two-column layout, marginal notes, sketch annotations'
  },
  {
    id: 40,
    name: '医学解剖精细素描风',
    category: '教育与学术板书',
    purpose: '医学教育人体结构',
    styleKeywords: 'medical anatomy, precise pencil drawing, scientific illustration',
    layoutDirectives: 'labeled diagrams, cross-section views, terminology placement'
  },
  {
    id: 41,
    name: '地理探险手绘地图风',
    category: '教育与学术板书',
    purpose: '地理探索自然考察',
    styleKeywords: 'hand-drawn map, topographic illustration, field journal',
    layoutDirectives: 'map annotations, coordinate grid, legend boxes'
  },
  {
    id: 42,
    name: '考研结构框架风',
    category: '教育与学术板书',
    purpose: '考试复习知识体系',
    styleKeywords: 'study notes, structured framework, hierarchical diagrams',
    layoutDirectives: 'tree structure, knowledge points, numbered lists'
  },

  // 🚀 潮流前沿艺术 (8种)
  {
    id: 43,
    name: 'Pixel Art像素知识图谱',
    category: '潮流前沿艺术',
    purpose: '复古游戏知识可视化',
    styleKeywords: 'pixel art, 8-bit graphics, retro game aesthetic, pixel-perfect',
    layoutDirectives: 'pixel grid layout, retro UI elements, block-based design'
  },
  {
    id: 44,
    name: '赛博朋克霓虹线框风',
    category: '潮流前沿艺术',
    purpose: '科幻未来科技感',
    styleKeywords: 'cyberpunk neon, glowing wireframes, dark background, holographic',
    layoutDirectives: 'neon grid, data streams, glitch effects, futuristic panels'
  },
  {
    id: 45,
    name: '低多边形Low-Poly风',
    category: '潮流前沿艺术',
    purpose: '几何抽象科技感',
    styleKeywords: 'low-poly art, geometric shapes, faceted surfaces, vibrant colors',
    layoutDirectives: 'triangular mesh layout, isometric perspective, geometric composition'
  },
  {
    id: 46,
    name: '流体渐变全彩风',
    category: '潮流前沿艺术',
    purpose: '活力多彩年轻时尚',
    styleKeywords: 'fluid gradients, vibrant colors, abstract shapes, dynamic flow',
    layoutDirectives: 'gradient backgrounds, floating elements, organic layout'
  },
  {
    id: 47,
    name: '新丑风（New Ugly）拼贴',
    category: '潮流前沿艺术',
    purpose: '反传统创意表达',
    styleKeywords: 'new ugly style, chaotic collage, clashing elements, experimental design',
    layoutDirectives: 'asymmetric arrangement, overlapping elements, deliberate imperfection'
  },
  {
    id: 48,
    name: '立体主义几何抽象风',
    category: '潮流前沿艺术',
    purpose: '艺术表达多角度思考',
    styleKeywords: 'cubism, geometric abstraction, fragmented forms, multiple perspectives',
    layoutDirectives: 'overlapping geometric shapes, multi-view composition, abstract grids'
  },
  {
    id: 49,
    name: '未来主义极速线条风',
    category: '潮流前沿艺术',
    purpose: '速度与科技感',
    styleKeywords: 'futuristic speed lines, motion blur, dynamic composition, sleek design',
    layoutDirectives: 'diagonal layout, motion trails, speed indicators, futuristic frames'
  },
  {
    id: 50,
    name: '莫兰迪色系治愈风',
    category: '潮流前沿艺术',
    purpose: '温柔治愈舒缓情绪',
    styleKeywords: 'Morandi color palette, muted tones, soft harmony, gentle atmosphere',
    layoutDirectives: 'soft gradients, rounded corners, comfortable spacing, peaceful composition'
  }
]