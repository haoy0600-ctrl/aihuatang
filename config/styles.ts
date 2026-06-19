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
    purpose: '趣味生动知识科普',
    styleKeywords: 'Cute cartoon hand-drawn illustration, vibrant saturated colors, clean vector lines, playful character designs, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, cinematic lighting, masterpiece quality',
    layoutDirectives: 'Fun comic panel layout, rounded square frames, speech bubbles, staggered grid composition, soft drop shadows'
  },
  {
    id: 2,
    name: '3D黏土膨胀风',
    category: '顶级爆款',
    purpose: '潮玩立体感图文',
    styleKeywords: '3D claymorphism style, inflated soft shapes, adorable miniature models, matte finish materials, soft ambient occlusion, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, warm studio lighting, Pixar-style rendering',
    layoutDirectives: 'Thick 3D grid layout, soft shadow block margins, isometric perspective, layered depth composition'
  },
  {
    id: 3,
    name: '毛玻璃磨砂质感',
    category: '顶级爆款',
    purpose: '现代高级科技图表',
    styleKeywords: 'Frosted glass blur effect, translucent matte texture, layered semi-transparent overlays, subtle neon glow edges, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, futuristic minimalism, clean tech aesthetic',
    layoutDirectives: 'Clean UI card containers, neon subtle glow dividers, glass morphism panels, soft light refractions'
  },
  {
    id: 4,
    name: '便当盒网格风',
    category: '顶级爆款',
    purpose: '多模块复杂信息整理',
    styleKeywords: 'Bento box grid layout style, neatly organized rectangular partitions, food-inspired color coding, fresh and appetizing visual hierarchy, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, vibrant yet balanced palette',
    layoutDirectives: 'Strict asymmetrical grid framework, perfect boundary symmetry, modular compartmentalization, white space breathing room'
  },
  {
    id: 5,
    name: '剪纸层叠风',
    category: '顶级爆款',
    purpose: '情绪疗愈立体绘本',
    styleKeywords: 'Layered paper cut craft style, multi-layer shadow depth, intricate silhouette shapes, delicate paper texture, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, warm storytelling atmosphere, soft ambient glow',
    layoutDirectives: '3D origami template lines, deep shadow dividers, layered depth composition, paper edge details'
  },
  {
    id: 6,
    name: '3D极简C4D',
    category: '顶级爆款',
    purpose: '大厂大牌视觉提案',
    styleKeywords: 'Minimalist 3D C4D rendering, clean geometric shapes, smooth clay materials, studio lighting setup, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, premium brand aesthetic, hyper-realistic reflections',
    layoutDirectives: 'Isometric modular grid, abstract geometric placeholders, floating elements, clean composition'
  },
  {
    id: 7,
    name: '柔和矢量插画',
    category: '顶级爆款',
    purpose: '优雅文青短文配图',
    styleKeywords: 'Soft vector illustration, warm flat colors, organic flowing lines, gentle gradients, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, calm and peaceful atmosphere, refined minimalism',
    layoutDirectives: 'Minimalist aesthetic composition, ample breathing white space, centered focal point, elegant typography integration'
  },
  {
    id: 8,
    name: '极简风',
    category: '特色极简',
    purpose: '信息精炼核心突出',
    styleKeywords: 'Ultra-minimalist flat design, super clean lines, monochromatic color scheme, refined simplicity, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, premium luxury feel, negative space mastery',
    layoutDirectives: 'Maximized white space, single focal point, centered composition, essential elements only'
  },
  {
    id: 9,
    name: '现代简约风',
    category: '特色极简',
    purpose: '商务演示专业报告',
    styleKeywords: 'Modern minimalist design, geometric abstraction, typography-centric layout, corporate sophistication, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, professional presentation aesthetic, clean data visualization',
    layoutDirectives: 'Grid-based layout, balanced columns, structured hierarchy, professional data grids'
  },
  {
    id: 10,
    name: '北欧极简风',
    category: '特色极简',
    purpose: '生活方式自然主题',
    styleKeywords: 'Nordic minimalism, soft muted tones, organic hand-drawn elements, Scandinavian hygge feel, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, natural textures, light-filled atmosphere',
    layoutDirectives: 'Airy spacing, natural flow, organic grid placement, botanical accents'
  },
  {
    id: 11,
    name: '瑞士国际主义风',
    category: '特色极简',
    purpose: '国际品牌系统设计',
    styleKeywords: 'Swiss style design, bold typography, asymmetric balance, editorial excellence, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, international brand standard, precision layout',
    layoutDirectives: 'Strict modular grid, mathematical proportions, clean alignment, sans-serif typography focus'
  },
  {
    id: 12,
    name: '包豪斯风',
    category: '特色极简',
    purpose: '设计教育艺术启蒙',
    styleKeywords: 'Bauhaus design, primary colors, geometric abstraction, functional beauty, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, art school aesthetic, constructivist principles',
    layoutDirectives: 'Geometric grid, color blocks, functional composition, asymmetric balance'
  },
  {
    id: 13,
    name: '高级留白风',
    category: '特色极简',
    purpose: '奢侈品高端展示',
    styleKeywords: 'Luxury minimalism, refined elegance, premium white space, haute couture aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, high-end brand quality, impeccable craftsmanship',
    layoutDirectives: 'Generous margins, exquisite typography, breathing space composition, luxury spacing'
  },
  {
    id: 14,
    name: '杂志排版风',
    category: '特色极简',
    purpose: '时尚内容图文混排',
    styleKeywords: 'Magazine editorial design, dynamic typography, visual storytelling, fashion publication quality, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, glossy magazine aesthetic, professional layout',
    layoutDirectives: 'Asymmetric spreads, quote highlights, layered text-image integration, bold headlines'
  },
  {
    id: 15,
    name: '编辑设计风',
    category: '特色极简',
    purpose: '新闻资讯深度报道',
    styleKeywords: 'Editorial design, newspaper typography, information hierarchy, journalistic excellence, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, news publication quality, credible visual language',
    layoutDirectives: 'Column text flow, headline hierarchy, sidebar elements, pull quotes'
  },
  {
    id: 16,
    name: 'iPad Goodnotes手账风',
    category: '现代数码手账',
    purpose: '个人笔记学习记录',
    styleKeywords: 'Digital handwriting, pastel highlighters, dotted notebook page, realistic Apple Pencil texture, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, authentic digital note-taking, personal diary feel',
    layoutDirectives: 'Bullet journal format, decorative headers, color-coded sections, margin notes'
  },
  {
    id: 17,
    name: 'Notion简约插画风',
    category: '现代数码手账',
    purpose: '工作协作知识管理',
    styleKeywords: 'Notion-style illustration, clean line art, soft muted colors, productivity app aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, minimalist workspace, organized information architecture',
    layoutDirectives: 'Block-based layout, collapsible sections, database table frames, toggle elements'
  },
  {
    id: 18,
    name: '墨水屏电子书风',
    category: '现代数码手账',
    purpose: '阅读批注深度思考',
    styleKeywords: 'E-ink screen style, grayscale tones, realistic paper texture, Kindle-like reading experience, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, eye-friendly reading, scholarly atmosphere',
    layoutDirectives: 'E-reader layout, margin annotations, highlight markers, page turn effect'
  },
  {
    id: 19,
    name: '拟物化便签风',
    category: '现代数码手账',
    purpose: '快速记录随手贴',
    styleKeywords: 'Photorealistic sticky notes, realistic paper texture, tape edges, office memo aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, tactile paper feel, organized chaos',
    layoutDirectives: 'Overlapping sticky notes, corkboard arrangement, shadow depth, pushpin details'
  },
  {
    id: 20,
    name: '日系胶片轻笔记',
    category: '现代数码手账',
    purpose: '生活记录文艺清新',
    styleKeywords: 'Japanese film photography aesthetic, soft grain texture, pastel color palette, nostalgic diary feel, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, analog warmth, dreamy atmosphere',
    layoutDirectives: 'Photo album layout, timestamp annotations, memory frames, polaroid-style photos'
  },
  {
    id: 21,
    name: 'Procreate水彩涂鸦风',
    category: '现代数码手账',
    purpose: '创意绘画灵感记录',
    styleKeywords: 'Digital watercolor painting, brush texture, blended wash effects, Procreate art style, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, artistic freedom, expressive brushstrokes',
    layoutDirectives: 'Canvas layout, layer stacking, paint splatter borders, artistic composition'
  },
  {
    id: 22,
    name: '多巴胺拼贴风',
    category: '现代数码手账',
    purpose: '活力满满的灵感板',
    styleKeywords: 'Dopamine collage, mixed media, vibrant cutouts, energetic visual explosion, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, joyful colors, maximalist expression',
    layoutDirectives: 'Asymmetric arrangement, overlapping elements, tape effects, magazine cutout aesthetic'
  },
  {
    id: 23,
    name: '机能风黑客笔记',
    category: '现代数码手账',
    purpose: '技术笔记代码记录',
    styleKeywords: 'Techwear cyberpunk, circuit patterns, dark theme, terminal aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, hacker workspace, matrix-style coding',
    layoutDirectives: 'Terminal-style layout, code blocks, system status indicators, green text on black'
  },
  {
    id: 24,
    name: '全息UI图表风',
    category: '现代数码手账',
    purpose: '数据可视化科技感',
    styleKeywords: 'Holographic UI, futuristic interface, glowing data streams, sci-fi HUD elements, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, cyberpunk aesthetic, advanced data visualization',
    layoutDirectives: 'Holographic overlays, data panels, sci-fi grid backgrounds, floating information'
  },
  {
    id: 25,
    name: '美式复古报纸风',
    category: '传统复古美学',
    purpose: '新闻资讯复古呈现',
    styleKeywords: 'Vintage newspaper style, old printing texture, sepia tones, aged paper, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, retro journalism, nostalgic publication',
    layoutDirectives: 'Newspaper columns, banner headlines, weathered borders, vintage typography'
  },
  {
    id: 26,
    name: '老旧羊皮纸炼金术风',
    category: '传统复古美学',
    purpose: '神秘知识古老典籍',
    styleKeywords: 'Antique parchment, alchemy symbols, medieval manuscript, occult aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, aged paper texture, mystical atmosphere',
    layoutDirectives: 'Ornate borders, decorative initials, stained edges, magical symbols'
  },
  {
    id: 27,
    name: '中式水墨留白风',
    category: '传统复古美学',
    purpose: '东方美学文化传承',
    styleKeywords: 'Traditional Chinese ink wash painting, expressive brushstrokes, masterful negative space, Zen philosophy, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, East Asian art excellence, spiritual tranquility',
    layoutDirectives: 'Asymmetric balance, poetic spacing, calligraphy integration, minimalist zen composition'
  },
  {
    id: 28,
    name: '复古连环画小人书风',
    category: '传统复古美学',
    purpose: '故事讲述怀旧情怀',
    styleKeywords: 'Chinese comic book style, vintage illustration, bold outlines, nostalgic storytelling, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, classic comic art, cultural heritage',
    layoutDirectives: 'Comic strip panels, dialogue bubbles, panel borders, sequential art layout'
  },
  {
    id: 29,
    name: '黑白木刻版画风',
    category: '传统复古美学',
    purpose: '经典艺术严肃表达',
    styleKeywords: 'Woodcut printmaking, black and white, strong contrasts, expressive texture, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, fine art print, powerful visual impact',
    layoutDirectives: 'Textured backgrounds, embossed effects, print borders, high-contrast composition'
  },
  {
    id: 30,
    name: '工业蓝图设计风',
    category: '传统复古美学',
    purpose: '工程图纸技术文档',
    styleKeywords: 'Blueprint cyanotype, technical drawing, engineering schematics, precise drafting, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, industrial documentation, technical accuracy',
    layoutDirectives: 'Orthographic projections, dimension annotations, scale bars, technical grids'
  },
  {
    id: 31,
    name: '波普艺术波点风',
    category: '传统复古美学',
    purpose: '潮流文化视觉冲击',
    styleKeywords: 'Pop art style, halftone dots, vibrant colors, bold outlines, Andy Warhol aesthetic, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, cultural iconography, mass media art',
    layoutDirectives: 'Comic book panels, Ben-Day dots, graphic elements, bold composition'
  },
  {
    id: 32,
    name: '蒸汽朋克机械风',
    category: '传统复古美学',
    purpose: '机械美学复古未来',
    styleKeywords: 'Steampunk machinery, brass gears, Victorian engineering, retro-futurism, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, industrial nostalgia, mechanical complexity',
    layoutDirectives: 'Exploded mechanical views, brass plate labels, gear diagrams, vintage technical drawings'
  },
  {
    id: 33,
    name: '大正浪漫复古风',
    category: '传统复古美学',
    purpose: '昭和年代怀旧氛围',
    styleKeywords: 'Taisho romantic style, Japanese retro, nostalgic atmosphere, vintage elegance, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, Meiji-Taisho era charm, cherry blossom motifs',
    layoutDirectives: 'Vintage poster layout, cherry blossom patterns, retro typography, nostalgic composition'
  },
  {
    id: 34,
    name: '大学教授黑板粉笔风',
    category: '教育与学术板书',
    purpose: '课堂教学知识讲解',
    styleKeywords: 'Chalkboard drawing, black background white chalk, handwritten text, academic lecture feel, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, university classroom atmosphere, authentic chalk texture',
    layoutDirectives: 'Centered chalk text, diagram illustrations, eraser smudge effects, lecture-style layout'
  },
  {
    id: 35,
    name: '白板马克笔思维导图风',
    category: '教育与学术板书',
    purpose: '思维梳理知识架构',
    styleKeywords: 'Whiteboard marker, colorful diagrams, mind map structure, brainstorming session, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, collaborative workspace, vibrant markers',
    layoutDirectives: 'Radial mind map, branch connections, color-coded nodes, organic flow'
  },
  {
    id: 36,
    name: '麦肯锡商业PPT风',
    category: '教育与学术板书',
    purpose: '商业分析战略规划',
    styleKeywords: 'Consulting presentation, professional charts, clean infographics, corporate strategy, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, executive presentation quality, data-driven design',
    layoutDirectives: 'Slide layout, agenda sections, data visualization grids, professional typography'
  },
  {
    id: 37,
    name: '精装教科书插页风',
    category: '教育与学术板书',
    purpose: '教材插图知识图解',
    styleKeywords: 'Textbook illustration, engraved line art, scientific accuracy, educational excellence, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, scholarly publication, detailed technical drawings',
    layoutDirectives: 'Framed illustrations, caption placement, academic text wrapping, technical diagram layout'
  },
  {
    id: 38,
    name: '儿童简笔画涂鸦风',
    category: '教育与学术板书',
    purpose: '儿童教育启蒙认知',
    styleKeywords: 'Children\'s doodle art, simple shapes, colorful crayon strokes, innocent creativity, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, playful learning, childlike wonder',
    layoutDirectives: 'Large text blocks, fun arrangement, simple borders, playful composition'
  },
  {
    id: 39,
    name: '达芬奇手稿复古风',
    category: '教育与学术板书',
    purpose: '科学探索创意草图',
    styleKeywords: 'Da Vinci manuscript, anatomical sketches, mechanical drawings, Renaissance genius, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, scientific curiosity, master draftsman quality',
    layoutDirectives: 'Two-column layout, margin notes, sketch annotations, scientific diagram composition'
  },
  {
    id: 40,
    name: '医学解剖精细素描风',
    category: '教育与学术板书',
    purpose: '医学教育人体结构',
    styleKeywords: 'Medical anatomy, precise pencil drawing, scientific illustration, anatomical accuracy, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, medical textbook quality, detailed biological art',
    layoutDirectives: 'Labeled diagrams, cross-section views, terminology placement, scientific notation'
  },
  {
    id: 41,
    name: '地理探险手绘地图风',
    category: '教育与学术板书',
    purpose: '地理探索自然考察',
    styleKeywords: 'Hand-drawn map, terrain illustrations, field journal, exploration adventure, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, cartographic art, vintage exploration',
    layoutDirectives: 'Map annotations, coordinate grids, legend boxes, compass rose, terrain features'
  },
  {
    id: 42,
    name: '考研结构框架风',
    category: '教育与学术板书',
    purpose: '考试复习知识体系',
    styleKeywords: 'Study notes, structured framework, hierarchical diagrams, exam preparation, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, academic excellence, systematic learning',
    layoutDirectives: 'Tree structures, knowledge points, numbered lists, hierarchical layout'
  },
  {
    id: 43,
    name: 'Pixel Art像素知识图谱',
    category: '潮流前沿艺术',
    purpose: '复古游戏知识可视化',
    styleKeywords: 'Pixel art, 8-bit graphics, retro gaming aesthetic, pixel-perfect design, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, nostalgic gaming, digital retro art',
    layoutDirectives: 'Pixel grid layout, retro UI elements, block-based design, game interface aesthetic'
  },
  {
    id: 44,
    name: '赛博朋克霓虹线框风',
    category: '潮流前沿艺术',
    purpose: '科幻未来科技感',
    styleKeywords: 'Cyberpunk neon, glowing wireframes, dark backgrounds, holographic elements, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, futuristic dystopia, Blade Runner aesthetic',
    layoutDirectives: 'Neon grids, data streams, glitch effects, futuristic panels, sci-fi composition'
  },
  {
    id: 45,
    name: '低多边形Low-Poly风',
    category: '潮流前沿艺术',
    purpose: '几何抽象科技感',
    styleKeywords: 'Low poly art, geometric shapes, faceted surfaces, vibrant colors, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, abstract modernity, digital geometry',
    layoutDirectives: 'Triangle mesh layout, isometric perspective, geometric composition, angular design'
  },
  {
    id: 46,
    name: '流体渐变全彩风',
    category: '潮流前沿艺术',
    purpose: '活力多彩年轻时尚',
    styleKeywords: 'Fluid gradients, vibrant colors, abstract shapes, dynamic flow, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, youthful energy, Instagram-worthy design',
    layoutDirectives: 'Gradient backgrounds, floating elements, organic layout, colorful composition'
  },
  {
    id: 47,
    name: '新丑风（New Ugly）拼贴',
    category: '潮流前沿艺术',
    purpose: '反传统创意表达',
    styleKeywords: 'New ugly style, chaotic collage, conflicting elements, experimental design, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, avant-garde expression, rule-breaking aesthetics',
    layoutDirectives: 'Asymmetric arrangement, overlapping elements, deliberate imperfection, experimental composition'
  },
  {
    id: 48,
    name: '立体主义几何抽象风',
    category: '潮流前沿艺术',
    purpose: '艺术表达多角度思考',
    styleKeywords: 'Cubism, geometric abstraction, fragmented forms, multi-perspective, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, Picasso-inspired, intellectual art',
    layoutDirectives: 'Overlapping geometric shapes, multi-view composition, abstract grids, fragmented layout'
  },
  {
    id: 49,
    name: '未来主义极速线条风',
    category: '潮流前沿艺术',
    purpose: '速度与科技感',
    styleKeywords: 'Futurist speed lines, motion blur, dynamic composition, streamlined design, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, cinema-grade contrast, technological advancement, kinetic energy',
    layoutDirectives: 'Diagonal layout, motion trails, speed indicators, futuristic framing, dynamic composition'
  },
  {
    id: 50,
    name: '莫兰迪色系治愈风',
    category: '潮流前沿艺术',
    purpose: '温柔治愈舒缓情绪',
    styleKeywords: 'Morandi color palette, muted tones, soft harmony, gentle atmosphere, 8K resolution, Hasselblad H6D medium format rendering, 85mm fixed-focus lens effects, sketchbook aesthetic, calming colors, peaceful composition, poetic minimalism',
    layoutDirectives: 'Soft gradients, rounded corners, comfortable spacing, serene composition, gentle layout'
  }
]
