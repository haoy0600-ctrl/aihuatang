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
    name: '卡通手绘',
    category: '顶级爆款',
    purpose: '趣味生动的知识科普',
    styleKeywords:
      'Cute cartoon hand-drawn illustration, vibrant saturated colors, clean vector lines, playful character designs, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, cinematic lighting, masterpiece quality',
    layoutDirectives:
      'Fun comic panel layout, rounded square frames, speech bubbles, staggered grid composition, soft drop shadows',
  },
  {
    id: 2,
    name: '3D 黏土膨胀风',
    category: '顶级爆款',
    purpose: '潮玩立体感图解',
    styleKeywords:
      '3D claymorphism style, inflated soft shapes, adorable miniature models, matte finish materials, soft ambient occlusion, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, warm studio lighting, Pixar-style rendering',
    layoutDirectives:
      'Thick 3D grid layout, soft shadow block margins, isometric perspective, layered depth composition',
  },
  {
    id: 3,
    name: '毛玻璃磨砂质感',
    category: '顶级爆款',
    purpose: '现代高级科技图表',
    styleKeywords:
      'Frosted glass blur effect, translucent matte texture, layered semi-transparent overlays, subtle neon glow edges, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, futuristic minimalism, clean tech aesthetic',
    layoutDirectives:
      'Clean UI card containers, neon subtle glow dividers, glass morphism panels, soft light refractions',
  },
  {
    id: 4,
    name: '便当盒网格风',
    category: '顶级爆款',
    purpose: '多模块复杂信息整理',
    styleKeywords:
      'Bento box grid layout style, neatly organized rectangular partitions, food-inspired color coding, fresh and appetizing visual hierarchy, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, vibrant yet balanced palette',
    layoutDirectives:
      'Strict asymmetrical grid framework, perfect boundary symmetry, modular compartmentalization, white space breathing room',
  },
  {
    id: 5,
    name: '剪纸层叠风',
    category: '顶级爆款',
    purpose: '情绪疗愈立体绘本',
    styleKeywords:
      'Layered paper cut craft style, multi-layer shadow depth, intricate silhouette shapes, delicate paper texture, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, warm storytelling atmosphere, soft ambient glow',
    layoutDirectives:
      '3D origami template lines, deep shadow dividers, layered depth composition, paper edge details',
  },
  {
    id: 6,
    name: '3D 极简 C4D',
    category: '顶级爆款',
    purpose: '大厂品牌视觉提案',
    styleKeywords:
      'Minimalist 3D C4D rendering, clean geometric shapes, smooth clay materials, studio lighting setup, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, premium brand aesthetic, hyper-realistic reflections',
    layoutDirectives:
      'Isometric modular grid, abstract geometric placeholders, floating elements, clean composition',
  },
  {
    id: 7,
    name: '柔和矢量插画',
    category: '顶级爆款',
    purpose: '优雅文青短文配图',
    styleKeywords:
      'Soft vector illustration, warm flat colors, organic flowing lines, gentle gradients, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, calm and peaceful atmosphere, refined minimalism',
    layoutDirectives:
      'Minimalist aesthetic composition, ample breathing white space, centered focal point, elegant typography integration',
  },
  {
    id: 8,
    name: '极简风',
    category: '特色极简',
    purpose: '信息精炼核心突出',
    styleKeywords:
      'Ultra-minimalist flat design, super clean lines, monochromatic color scheme, refined simplicity, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, premium luxury feel, negative space mastery',
    layoutDirectives:
      'Maximized white space, single focal point, centered composition, essential elements only',
  },
  {
    id: 9,
    name: '现代简约风',
    category: '特色极简',
    purpose: '商务演示专业报告',
    styleKeywords:
      'Modern minimalist design, geometric abstraction, typography-centric layout, corporate sophistication, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, professional presentation aesthetic, clean data visualization',
    layoutDirectives: 'Grid-based layout, balanced columns, structured hierarchy, professional data grids',
  },
  {
    id: 10,
    name: '北欧极简风',
    category: '特色极简',
    purpose: '生活方式自然主题',
    styleKeywords:
      'Nordic minimalism, soft muted tones, organic hand-drawn elements, Scandinavian hygge feel, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, natural textures, light-filled atmosphere',
    layoutDirectives: 'Airy spacing, natural flow, organic grid placement, botanical accents',
  },
  {
    id: 11,
    name: '瑞士国际主义风',
    category: '特色极简',
    purpose: '国际品牌系统设计',
    styleKeywords:
      'Swiss style design, bold typography, asymmetric balance, editorial excellence, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, international brand standard, precision layout',
    layoutDirectives:
      'Strict modular grid, mathematical proportions, clean alignment, sans-serif typography focus',
  },
  {
    id: 12,
    name: '包豪斯风',
    category: '特色极简',
    purpose: '设计教育艺术启蒙',
    styleKeywords:
      'Bauhaus design, primary colors, geometric abstraction, functional beauty, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, art school aesthetic, constructivist principles',
    layoutDirectives: 'Geometric grid, color blocks, functional composition, asymmetric balance',
  },
  {
    id: 13,
    name: '高级留白风',
    category: '特色极简',
    purpose: '奢侈品高端展示',
    styleKeywords:
      'Luxury minimalism, refined elegance, premium white space, haute couture aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, high-end brand quality, impeccable craftsmanship',
    layoutDirectives: 'Generous margins, exquisite typography, breathing space composition, luxury spacing',
  },
  {
    id: 14,
    name: '杂志排版风',
    category: '特色极简',
    purpose: '时尚内容图文混排',
    styleKeywords:
      'Magazine editorial design, dynamic typography, visual storytelling, fashion publication quality, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, glossy magazine aesthetic, professional layout',
    layoutDirectives:
      'Asymmetric spreads, quote highlights, layered text-image integration, bold headlines',
  },
  {
    id: 15,
    name: '编辑设计风',
    category: '特色极简',
    purpose: '新闻资讯深度报道',
    styleKeywords:
      'Editorial design, newspaper typography, information hierarchy, journalistic excellence, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, news publication quality, credible visual language',
    layoutDirectives: 'Column text flow, headline hierarchy, sidebar elements, pull quotes',
  },
  {
    id: 16,
    name: 'iPad Goodnotes 手账风',
    category: '现代数码手账',
    purpose: '个人笔记学习记录',
    styleKeywords:
      'Digital handwriting, pastel highlighters, dotted notebook page, realistic Apple Pencil texture, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, authentic digital note-taking, personal diary feel',
    layoutDirectives: 'Bullet journal format, decorative headers, color-coded sections, margin notes',
  },
  {
    id: 17,
    name: 'Notion 简约插画风',
    category: '现代数码手账',
    purpose: '工作协作知识管理',
    styleKeywords:
      'Notion-style illustration, clean line art, soft muted colors, productivity app aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, minimalist workspace, organized information architecture',
    layoutDirectives: 'Block-based layout, collapsible sections, database table frames, toggle elements',
  },
  {
    id: 18,
    name: '墨水屏电子书风',
    category: '现代数码手账',
    purpose: '阅读批注深度思考',
    styleKeywords:
      'E-ink screen style, grayscale tones, realistic paper texture, Kindle-like reading experience, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, eye-friendly reading, scholarly atmosphere',
    layoutDirectives: 'E-reader layout, margin annotations, highlight markers, page turn effect',
  },
  {
    id: 19,
    name: '拟物便签风',
    category: '现代数码手账',
    purpose: '快速记录随手贴',
    styleKeywords:
      'Photorealistic sticky notes, realistic paper texture, tape edges, office memo aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, tactile paper feel, organized chaos',
    layoutDirectives: 'Overlapping sticky notes, corkboard arrangement, shadow depth, pushpin details',
  },
  {
    id: 20,
    name: '日系胶片轻笔记',
    category: '现代数码手账',
    purpose: '生活记录文艺清新',
    styleKeywords:
      'Japanese film photography aesthetic, soft grain texture, pastel color palette, nostalgic diary feel, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, analog warmth, dreamy atmosphere',
    layoutDirectives: 'Photo album layout, timestamp annotations, memory frames, polaroid-style photos',
  },
  {
    id: 21,
    name: 'Procreate 水彩涂鸦风',
    category: '现代数码手账',
    purpose: '创意绘画灵感记录',
    styleKeywords:
      'Digital watercolor painting, brush texture, blended wash effects, Procreate art style, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, artistic freedom, expressive brushstrokes',
    layoutDirectives: 'Canvas layout, layer stacking, paint splatter borders, artistic composition',
  },
  {
    id: 22,
    name: '多巴胺拼贴风',
    category: '现代数码手账',
    purpose: '活力满满的灵感板',
    styleKeywords:
      'Dopamine collage, mixed media, vibrant cutouts, energetic visual explosion, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, joyful colors, maximalist expression',
    layoutDirectives: 'Asymmetric arrangement, overlapping elements, tape effects, magazine cutout aesthetic',
  },
  {
    id: 23,
    name: '机能风黑客笔记',
    category: '现代数码手账',
    purpose: '技术笔记代码记录',
    styleKeywords:
      'Techwear cyberpunk, circuit patterns, dark theme, terminal aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, hacker workspace, matrix-style coding',
    layoutDirectives: 'Terminal-style layout, code blocks, system status indicators, green text on black',
  },
  {
    id: 24,
    name: '全息 UI 图表风',
    category: '现代数码手账',
    purpose: '数据可视化科技感',
    styleKeywords:
      'Holographic UI, futuristic interface, glowing data streams, sci-fi HUD elements, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, cyberpunk aesthetic, advanced data visualization',
    layoutDirectives: 'Holographic overlays, data panels, sci-fi grid backgrounds, floating information',
  },
  {
    id: 25,
    name: '美式复古报纸风',
    category: '传统复古美学',
    purpose: '新闻资讯复古呈现',
    styleKeywords:
      'Vintage newspaper style, old printing texture, sepia tones, aged paper, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, retro journalism, nostalgic publication',
    layoutDirectives: 'Newspaper columns, banner headlines, weathered borders, vintage typography',
  },
  {
    id: 26,
    name: '老旧羊皮纸炼金术风',
    category: '传统复古美学',
    purpose: '神秘知识古老典籍',
    styleKeywords:
      'Antique parchment, alchemy symbols, medieval manuscript, occult aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, aged paper texture, mystical atmosphere',
    layoutDirectives: 'Ornate borders, decorative initials, stained edges, magical symbols',
  },
  {
    id: 27,
    name: '中式水墨留白风',
    category: '传统复古美学',
    purpose: '东方美学文化传承',
    styleKeywords:
      'Traditional Chinese ink wash painting, expressive brushstrokes, masterful negative space, Zen philosophy, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, East Asian art excellence, spiritual tranquility',
    layoutDirectives: 'Asymmetric balance, poetic spacing, calligraphy integration, minimalist zen composition',
  },
  {
    id: 28,
    name: '复古连环画小人书风',
    category: '传统复古美学',
    purpose: '故事讲述怀旧情怀',
    styleKeywords:
      'Chinese comic book style, vintage illustration, bold outlines, nostalgic storytelling, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, classic comic art, cultural heritage',
    layoutDirectives: 'Comic strip panels, dialogue bubbles, panel borders, sequential art layout',
  },
  {
    id: 29,
    name: '黑白木刻版画风',
    category: '传统复古美学',
    purpose: '经典艺术严肃表达',
    styleKeywords:
      'Woodcut printmaking, black and white, strong contrasts, expressive texture, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, fine art print, powerful visual impact',
    layoutDirectives: 'Textured backgrounds, embossed effects, print borders, high-contrast composition',
  },
  {
    id: 30,
    name: '工业蓝图设计风',
    category: '传统复古美学',
    purpose: '工程图纸技术文档',
    styleKeywords:
      'Blueprint cyanotype, technical drawing, engineering schematics, precise drafting, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, industrial documentation, technical accuracy',
    layoutDirectives: 'Orthographic projections, dimension annotations, scale bars, technical grids',
  },
  {
    id: 31,
    name: '波普艺术波点风',
    category: '传统复古美学',
    purpose: '潮流文化视觉冲击',
    styleKeywords:
      'Pop art style, halftone dots, vibrant colors, bold outlines, Andy Warhol aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, cultural iconography, mass media art',
    layoutDirectives: 'Comic book panels, Ben-Day dots, graphic elements, bold composition',
  },
  {
    id: 32,
    name: '蒸汽朋克机械风',
    category: '传统复古美学',
    purpose: '复古未来机械设定',
    styleKeywords:
      'Steampunk aesthetics, brass machinery, Victorian sci-fi, gears and cogs, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, retro-futuristic engineering, ornate detail',
    layoutDirectives: 'Mechanical blueprints, riveted frames, gear motifs, industrial ornament',
  },
  {
    id: 33,
    name: '大正浪漫复古风',
    category: '传统复古美学',
    purpose: '怀旧文艺人物叙事',
    styleKeywords:
      'Taisho Roman aesthetic, Japanese retro poster design, elegant nostalgia, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, vintage romance, decorative print',
    layoutDirectives: 'Retro poster layout, ornamental borders, elegant typography, period styling',
  },
  {
    id: 34,
    name: '大学教授黑板粉笔风',
    category: '学术与知识图解',
    purpose: '课程讲解板书推导',
    styleKeywords:
      'Classroom chalkboard style, chalk sketching, teaching notes, hand-drawn formulas, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, academic atmosphere, authentic lecture style',
    layoutDirectives: 'Blackboard layout, chalk diagrams, side notes, topic-by-topic teaching flow',
  },
  {
    id: 35,
    name: '白板马克笔思维导图风',
    category: '学术与知识图解',
    purpose: '结构化拆解与脑图',
    styleKeywords:
      'Whiteboard marker sketch, colorful mind map, brainstorming flow, hand-drawn note clusters, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, workshop collaboration, visual thinking',
    layoutDirectives: 'Mind-map branches, connecting arrows, sticky note clusters, workshop whiteboard structure',
  },
  {
    id: 36,
    name: '麦肯锡商务 PPT 风',
    category: '学术与知识图解',
    purpose: '咨询汇报结论先行',
    styleKeywords:
      'Consulting slide design, McKinsey-style chart deck, executive summary visuals, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, premium business presentation, insight-driven structure',
    layoutDirectives: 'Top-down pyramid structure, structured slides, consulting charts, conclusion-first hierarchy',
  },
  {
    id: 37,
    name: '精装教科书插页风',
    category: '学术与知识图解',
    purpose: '系统知识讲解与归纳',
    styleKeywords:
      'Hardcover textbook insert, academic illustration, didactic page design, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, classroom publishing quality, rigorous educational tone',
    layoutDirectives: 'Textbook chapter layout, labeled diagrams, summary blocks, structured pedagogy',
  },
  {
    id: 38,
    name: '儿童简笔画涂鸦风',
    category: '学术与知识图解',
    purpose: '低龄启蒙与轻松表达',
    styleKeywords:
      'Childlike doodle drawing, simple marker strokes, playful educational visuals, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, kindergarten warmth, friendly learning',
    layoutDirectives: 'Simple panels, rounded labels, playful arrows, easy-to-read educational cards',
  },
  {
    id: 39,
    name: '达芬奇手稿复古风',
    category: '学术与知识图解',
    purpose: '跨学科研究与发明草图',
    styleKeywords:
      'Leonardo da Vinci manuscript style, renaissance sketches, invention notebook, sepia technical drawing, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, historical genius notes, cross-disciplinary thinking',
    layoutDirectives: 'Notebook margins, mirrored note feel, invention sketches, annotation-heavy pages',
  },
  {
    id: 40,
    name: '医学解剖精细素描风',
    category: '学术与知识图解',
    purpose: '专业结构示意与标注',
    styleKeywords:
      'Medical anatomical illustration, scientific pencil rendering, precise cross-sectional detail, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, research-grade clarity, educational realism',
    layoutDirectives: 'Annotated diagrams, sectional breakdowns, numbered labels, clinical reference layout',
  },
  {
    id: 41,
    name: '地理探险手绘地图风',
    category: '学术与知识图解',
    purpose: '空间路线与知识探索',
    styleKeywords:
      'Illustrated exploration map, hand-drawn cartography, travel journal aesthetics, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, adventure narrative, educational geography',
    layoutDirectives: 'Map routes, compass markers, terrain callouts, exploration legend blocks',
  },
  {
    id: 42,
    name: '考研结构框架风',
    category: '学术与知识图解',
    purpose: '考试复习重点归纳',
    styleKeywords:
      'Exam revision framework, structured study notes, high-yield summary visual, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, efficient learning, memory-oriented organization',
    layoutDirectives: 'Hierarchical outlines, key-point callouts, memory anchors, exam-focused blocks',
  },
  {
    id: 43,
    name: 'Pixel Art 像素图解风',
    category: '未来潮流实验',
    purpose: '复古数码趣味表达',
    styleKeywords:
      'Pixel art infographic, retro game UI, blocky low-resolution iconography, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, nostalgic digital culture, playful structure',
    layoutDirectives: 'Pixel grid, retro HUD boxes, 8-bit icons, game-like stat cards',
  },
  {
    id: 44,
    name: '赛博朋克霓虹线框风',
    category: '未来潮流实验',
    purpose: '未来科技视觉演绎',
    styleKeywords:
      'Cyberpunk neon wireframe, glowing outlines, futuristic city-data aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, electric nightlife atmosphere, digital dystopia',
    layoutDirectives: 'Wireframe overlays, neon grids, luminous callouts, high-contrast HUD panels',
  },
  {
    id: 45,
    name: '低多边形 Low-Poly 风',
    category: '未来潮流实验',
    purpose: '几何抽象信息演示',
    styleKeywords:
      'Low-poly geometric illustration, faceted planes, stylized 3D abstraction, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, clean polygon artistry, modern digital craft',
    layoutDirectives: 'Polygon blocks, faceted sections, geometry-led composition, crystalline structure',
  },
  {
    id: 46,
    name: '流体渐变全彩风',
    category: '未来潮流实验',
    purpose: '高饱和流行视觉冲击',
    styleKeywords:
      'Fluid gradient visuals, iridescent transitions, vivid contemporary color movement, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, modern digital poster aesthetic, immersive color flow',
    layoutDirectives: 'Gradient backdrops, soft blobs, chromatic transitions, modern poster layering',
  },
  {
    id: 47,
    name: '新丑风拼贴',
    category: '未来潮流实验',
    purpose: '前卫表达与态度输出',
    styleKeywords:
      'Neo-brutal collage, anti-design energy, harsh contrast, rebellious internet-native visuals, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, subculture aesthetics, expressive disruption',
    layoutDirectives: 'Offset blocks, rough cutouts, bold labels, intentionally disruptive composition',
  },
  {
    id: 48,
    name: '立体主义几何抽象风',
    category: '未来潮流实验',
    purpose: '艺术化抽象表达',
    styleKeywords:
      'Cubist abstraction, fragmented geometry, layered planes, modern art reinterpretation, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, gallery-level composition, intellectual expression',
    layoutDirectives: 'Angular sections, fragmented perspectives, geometric overlaps, abstract framing',
  },
  {
    id: 49,
    name: '未来主义极速线条风',
    category: '未来潮流实验',
    purpose: '速度感与趋势表达',
    styleKeywords:
      'Futurist speed lines, motion-driven graphics, dynamic directional energy, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, advanced momentum visuals, sleek modern aggression',
    layoutDirectives: 'Directional streaks, kinetic diagonals, speed markers, motion-oriented hierarchy',
  },
  {
    id: 50,
    name: '莫兰迪色系治愈风',
    category: '未来潮流实验',
    purpose: '温柔克制的高级氛围',
    styleKeywords:
      'Morandi color palette, muted sophistication, calm editorial softness, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, understated elegance, emotional healing aesthetics',
    layoutDirectives: 'Soft blocks, muted tonal layering, gentle spacing, calm premium composition',
  },
]
