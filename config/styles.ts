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
    styleKeywords: '可爱卡通手绘插画，鲜艳色彩，清晰矢量线条',
    layoutDirectives: '有趣的漫画分镜，圆角方框分隔'
  },
  {
    id: 2,
    name: '3D黏土膨胀风',
    category: '顶级爆款',
    purpose: '潮玩立体感图文',
    styleKeywords: '3D黏土膨胀风格，充气柔软形状，可爱微型模型',
    layoutDirectives: '厚实3D网格布局，柔和阴影块状边距'
  },
  {
    id: 3,
    name: '毛玻璃磨砂质感',
    category: '顶级爆款',
    purpose: '现代高级科技图表',
    styleKeywords: '毛玻璃磨砂效果，模糊哑光质感，半透明叠加',
    layoutDirectives: '简洁UI卡片容器，霓虹微妙发光分隔线'
  },
  {
    id: 4,
    name: '便当盒网格风',
    category: '顶级爆款',
    purpose: '多模块复杂信息整理',
    styleKeywords: '便当盒网格布局风格，整齐的矩形分区',
    layoutDirectives: '严格不对称网格框架，完美边界对称'
  },
  {
    id: 5,
    name: '剪纸层叠风',
    category: '顶级爆款',
    purpose: '情绪疗愈立体绘本',
    styleKeywords: '层叠剪纸工艺风格，多层阴影深度，剪影形状',
    layoutDirectives: '3D折纸模板线条，深阴影分隔线'
  },
  {
    id: 6,
    name: '3D极简C4D',
    category: '顶级爆款',
    purpose: '大厂大牌视觉提案',
    styleKeywords: '极简3D C4D渲染，干净几何形状，光滑黏土材质',
    layoutDirectives: '等轴测模块化网格，抽象几何占位符'
  },
  {
    id: 7,
    name: '柔和矢量插画',
    category: '顶级爆款',
    purpose: '优雅文青短文配图',
    styleKeywords: '柔和矢量插画，温暖扁平色彩，有机流畅线条',
    layoutDirectives: '极简美学构图，充足呼吸留白'
  },
  {
    id: 8,
    name: '极简风',
    category: '特色极简',
    purpose: '信息精炼核心突出',
    styleKeywords: '极简平面设计，超干净线条，单色配色',
    layoutDirectives: '最大化留白，单一焦点，居中构图'
  },
  {
    id: 9,
    name: '现代简约风',
    category: '特色极简',
    purpose: '商务演示专业报告',
    styleKeywords: '现代简约设计，几何抽象，以排版为核心',
    layoutDirectives: '网格布局，平衡分栏，结构化层次'
  },
  {
    id: 10,
    name: '北欧极简风',
    category: '特色极简',
    purpose: '生活方式自然主题',
    styleKeywords: '北欧极简主义，柔和低调色调，有机手绘元素',
    layoutDirectives: '通透间距，自然流动，有机网格放置'
  },
  {
    id: 11,
    name: '瑞士国际主义风',
    category: '特色极简',
    purpose: '国际品牌系统设计',
    styleKeywords: '瑞士风格设计，大胆排版，非对称平衡',
    layoutDirectives: '严格模块化网格，数学比例，干净对齐'
  },
  {
    id: 12,
    name: '包豪斯风',
    category: '特色极简',
    purpose: '设计教育艺术启蒙',
    styleKeywords: '包豪斯设计，原色，几何抽象',
    layoutDirectives: '几何网格，色块，功能构图'
  },
  {
    id: 13,
    name: '高级留白风',
    category: '特色极简',
    purpose: '奢侈品高端展示',
    styleKeywords: '奢华极简，精致优雅，高级留白',
    layoutDirectives: '宽大边距，精致排版，呼吸空间构图'
  },
  {
    id: 14,
    name: '杂志排版风',
    category: '特色极简',
    purpose: '时尚内容图文混排',
    styleKeywords: '杂志编辑设计，动态排版，视觉叙事',
    layoutDirectives: '不对称跨页，引用文字，图文分层整合'
  },
  {
    id: 15,
    name: '编辑设计风',
    category: '特色极简',
    purpose: '新闻资讯深度报道',
    styleKeywords: '编辑设计，新闻排版，信息层次',
    layoutDirectives: '分栏文本流，标题层次，侧边栏元素'
  },
  {
    id: 16,
    name: 'iPad Goodnotes手账风',
    category: '现代数码手账',
    purpose: '个人笔记学习记录',
    styleKeywords: '数码手写，粉彩荧光笔，圆点笔记本页面',
    layoutDirectives: '子弹日记格式，装饰性标题，彩色编码分区'
  },
  {
    id: 17,
    name: 'Notion简约插画风',
    category: '现代数码手账',
    purpose: '工作协作知识管理',
    styleKeywords: 'Notion风格插画，干净线条艺术，柔和低调色彩',
    layoutDirectives: '块状布局，可折叠分区，数据库表格框架'
  },
  {
    id: 18,
    name: '墨水屏电子书风',
    category: '现代数码手账',
    purpose: '阅读批注深度思考',
    styleKeywords: '电子墨水屏风格，灰度色调，纸张质感',
    layoutDirectives: '电子书阅读器布局，页边批注，高亮标注'
  },
  {
    id: 19,
    name: '拟物化便签风',
    category: '现代数码手账',
    purpose: '快速记录随手贴',
    styleKeywords: '拟物化便利贴，逼真纸张纹理，胶带边缘',
    layoutDirectives: '重叠便利贴，钉板排列，阴影深度'
  },
  {
    id: 20,
    name: '日系胶片轻笔记',
    category: '现代数码手账',
    purpose: '生活记录文艺清新',
    styleKeywords: '日系胶片美学，柔和颗粒感，粉彩配色',
    layoutDirectives: '相册布局，时间戳批注，记忆框架'
  },
  {
    id: 21,
    name: 'Procreate水彩涂鸦风',
    category: '现代数码手账',
    purpose: '创意绘画灵感记录',
    styleKeywords: '数码水彩，画笔纹理，混合水洗效果',
    layoutDirectives: '画布布局，图层堆叠，颜料飞溅边框'
  },
  {
    id: 22,
    name: '多巴胺拼贴风',
    category: '现代数码手账',
    purpose: '活力满满的灵感板',
    styleKeywords: '彩色拼贴，混合媒介，鲜艳剪贴',
    layoutDirectives: '不对称排列，重叠元素，胶带效果'
  },
  {
    id: 23,
    name: '机能风黑客笔记',
    category: '现代数码手账',
    purpose: '技术笔记代码记录',
    styleKeywords: '机能赛博朋克，电路图案，深色主题',
    layoutDirectives: '终端风格布局，代码块，系统状态指示器'
  },
  {
    id: 24,
    name: '全息UI图表风',
    category: '现代数码手账',
    purpose: '数据可视化科技感',
    styleKeywords: '全息UI，未来界面，发光数据流',
    layoutDirectives: '全息叠加层，数据面板，科幻网格背景'
  },
  {
    id: 25,
    name: '美式复古报纸风',
    category: '传统复古美学',
    purpose: '新闻资讯复古呈现',
    styleKeywords: '复古报纸，旧印刷，棕褐色调，做旧纸张',
    layoutDirectives: '报纸分栏，标题横幅，风化边框'
  },
  {
    id: 26,
    name: '老旧羊皮纸炼金术风',
    category: '传统复古美学',
    purpose: '神秘知识古老典籍',
    styleKeywords: '老旧羊皮纸，炼金术符号，中世纪手稿',
    layoutDirectives: '华丽边框，装饰性首字母，染色边缘'
  },
  {
    id: 27,
    name: '中式水墨留白风',
    category: '传统复古美学',
    purpose: '东方美学文化传承',
    styleKeywords: '中国水墨画，笔触，留白',
    layoutDirectives: '不对称平衡，诗意间距，书法整合'
  },
  {
    id: 28,
    name: '复古连环画小人书风',
    category: '传统复古美学',
    purpose: '故事讲述怀旧情怀',
    styleKeywords: '中国连环画，复古插画，粗线条',
    layoutDirectives: '漫画分栏，对话框，面板边框'
  },
  {
    id: 29,
    name: '黑白木刻版画风',
    category: '传统复古美学',
    purpose: '经典艺术严肃表达',
    styleKeywords: '木刻版画，黑白，强烈对比',
    layoutDirectives: '纹理背景，浮雕效果，印刷边框'
  },
  {
    id: 30,
    name: '工业蓝图设计风',
    category: '传统复古美学',
    purpose: '工程图纸技术文档',
    styleKeywords: '蓝图氰版印刷，技术绘图，工程图纸',
    layoutDirectives: '正交投影，尺寸标注，比例尺'
  },
  {
    id: 31,
    name: '波普艺术波点风',
    category: '传统复古美学',
    purpose: '潮流文化视觉冲击',
    styleKeywords: '波普艺术，半色调圆点，鲜艳色彩，粗线条',
    layoutDirectives: '漫画书面板，本戴点，图形元素'
  },
  {
    id: 32,
    name: '蒸汽朋克机械风',
    category: '传统复古美学',
    purpose: '机械美学复古未来',
    styleKeywords: '蒸汽朋克机械，黄铜齿轮，维多利亚工程',
    layoutDirectives: '机械爆炸视图，黄铜板标签，齿轮图表'
  },
  {
    id: 33,
    name: '大正浪漫复古风',
    category: '传统复古美学',
    purpose: '昭和年代怀旧氛围',
    styleKeywords: '大正浪漫风格，日式复古，怀旧氛围',
    layoutDirectives: '复古海报布局，樱花图案，复古排版'
  },
  {
    id: 34,
    name: '大学教授黑板粉笔风',
    category: '教育与学术板书',
    purpose: '课堂教学知识讲解',
    styleKeywords: '黑板绘画，黑色背景白色粉笔，手写文字',
    layoutDirectives: '居中粉笔文字，图解插图，橡皮擦涂抹效果'
  },
  {
    id: 35,
    name: '白板马克笔思维导图风',
    category: '教育与学术板书',
    purpose: '思维梳理知识架构',
    styleKeywords: '白板马克笔，彩色图表，思维导图结构',
    layoutDirectives: '放射状思维导图，分支连接，彩色编码节点'
  },
  {
    id: 36,
    name: '麦肯锡商业PPT风',
    category: '教育与学术板书',
    purpose: '商业分析战略规划',
    styleKeywords: '咨询演示，专业图表，干净信息图',
    layoutDirectives: '幻灯片布局，议程分区，数据可视化网格'
  },
  {
    id: 37,
    name: '精装教科书插页风',
    category: '教育与学术板书',
    purpose: '教材插图知识图解',
    styleKeywords: '教科书插图，雕刻线条艺术，科学准确性',
    layoutDirectives: '带框插图，标题位置，学术文字环绕'
  },
  {
    id: 38,
    name: '儿童简笔画涂鸦风',
    category: '教育与学术板书',
    purpose: '儿童教育启蒙认知',
    styleKeywords: '儿童涂鸦，简单形状，彩色蜡笔画',
    layoutDirectives: '大文本块，有趣排列，简单边框'
  },
  {
    id: 39,
    name: '达芬奇手稿复古风',
    category: '教育与学术板书',
    purpose: '科学探索创意草图',
    styleKeywords: '达芬奇手稿，解剖草图，机械绘图',
    layoutDirectives: '双栏布局，页边笔记，草图批注'
  },
  {
    id: 40,
    name: '医学解剖精细素描风',
    category: '教育与学术板书',
    purpose: '医学教育人体结构',
    styleKeywords: '医学解剖，精确铅笔绘图，科学插图',
    layoutDirectives: '带标签图表，横截面视图，术语位置'
  },
  {
    id: 41,
    name: '地理探险手绘地图风',
    category: '教育与学术板书',
    purpose: '地理探索自然考察',
    styleKeywords: '手绘地图，地形插图，野外日志',
    layoutDirectives: '地图标注，坐标网格，图例框'
  },
  {
    id: 42,
    name: '考研结构框架风',
    category: '教育与学术板书',
    purpose: '考试复习知识体系',
    styleKeywords: '学习笔记，结构化框架，层次图',
    layoutDirectives: '树形结构，知识点，编号列表'
  },
  {
    id: 43,
    name: 'Pixel Art像素知识图谱',
    category: '潮流前沿艺术',
    purpose: '复古游戏知识可视化',
    styleKeywords: '像素艺术，8位图形，复古游戏美学，像素完美',
    layoutDirectives: '像素网格布局，复古UI元素，块状设计'
  },
  {
    id: 44,
    name: '赛博朋克霓虹线框风',
    category: '潮流前沿艺术',
    purpose: '科幻未来科技感',
    styleKeywords: '赛博朋克霓虹，发光线框，深色背景，全息',
    layoutDirectives: '霓虹网格，数据流，故障效果，未来面板'
  },
  {
    id: 45,
    name: '低多边形Low-Poly风',
    category: '潮流前沿艺术',
    purpose: '几何抽象科技感',
    styleKeywords: '低多边形艺术，几何形状，切面表面，鲜艳色彩',
    layoutDirectives: '三角形网格布局，等轴测视角，几何构图'
  },
  {
    id: 46,
    name: '流体渐变全彩风',
    category: '潮流前沿艺术',
    purpose: '活力多彩年轻时尚',
    styleKeywords: '流体渐变，鲜艳色彩，抽象形状，动态流动',
    layoutDirectives: '渐变背景，浮动元素，有机布局'
  },
  {
    id: 47,
    name: '新丑风（New Ugly）拼贴',
    category: '潮流前沿艺术',
    purpose: '反传统创意表达',
    styleKeywords: '新丑风格，混乱拼贴，冲突元素，实验设计',
    layoutDirectives: '不对称排列，重叠元素，刻意不完美'
  },
  {
    id: 48,
    name: '立体主义几何抽象风',
    category: '潮流前沿艺术',
    purpose: '艺术表达多角度思考',
    styleKeywords: '立体主义，几何抽象，碎片化形式，多视角',
    layoutDirectives: '重叠几何形状，多视图构图，抽象网格'
  },
  {
    id: 49,
    name: '未来主义极速线条风',
    category: '潮流前沿艺术',
    purpose: '速度与科技感',
    styleKeywords: '未来主义速度线，运动模糊，动态构图，流线型设计',
    layoutDirectives: '对角线布局，运动轨迹，速度指示器，未来框架'
  },
  {
    id: 50,
    name: '莫兰迪色系治愈风',
    category: '潮流前沿艺术',
    purpose: '温柔治愈舒缓情绪',
    styleKeywords: '莫兰迪色系，低调色调，柔和和谐，温和氛围',
    layoutDirectives: '柔和渐变，圆角，舒适间距，平和构图'
  }
]
