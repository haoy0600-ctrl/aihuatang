'use client'

import Link from 'next/link'

export default function HomePage() {
  const features = [
    {
      icon: '✨',
      title: '智能AI优化生成',
      description: '支持 GPT-Image-2 和 NanoBanana2 双通道。拒绝空洞口号，AI一键优化长文本，让每一张图卡都拥有高密度、高价值的硬核知识灵魂。',
    },
    {
      icon: '🎨',
      title: '拒绝廉价AI感',
      description: '内置现代极简、工业蓝图、极光视效等50+种自媒体爆款美术风格。文字绝对对齐，模块化错落有致，专为老师和创作者打造的高级视觉。',
    },
    {
      icon: '🔑',
      title: '极速卡密激活',
      description: '全面接入高强度卡密兑换系统，QQ邮箱注册即送初始积分。微信私域主理人秒级发卡，多激活码连续无缝叠加，无手续费，安全可靠。',
    },
  ]

  const steps = [
    {
      step: '01',
      title: '输入内容',
      description: '输入文本描述或上传参考图片',
    },
    {
      step: '02',
      title: '选择风格',
      description: '从50+种美术风格中选择心仪样式',
    },
    {
      step: '03',
      title: '生成下载',
      description: '一键生成高画质知识卡片并下载',
    },
  ]

  return (
    <div className="h-screen max-h-screen w-screen max-w-[100vw] overflow-hidden flex flex-col justify-between p-6 bg-[#040D0A] text-white">
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center select-none hover:opacity-80 transition-opacity">
          <img src="/logo.png?v=6" alt="AI画堂" className="h-10 sm:h-12 w-10 sm:w-12 object-contain rounded-xl" />
        </Link>

        <nav className="hidden md:flex items-center gap-4">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 bg-[#10B981] text-[#0B0D17] rounded-xl border border-[#202B3A] text-base font-semibold tracking-wide md:text-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all"
          >
            创作
          </Link>
          <Link
            href="/records"
            className="px-5 py-2.5 bg-[#141923] text-white rounded-xl border border-[#202B3A] text-base font-semibold tracking-wide md:text-lg hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all"
          >
            记录
          </Link>
          <Link
            href="/recharge"
            className="px-5 py-2.5 bg-[#141923] text-white rounded-xl border border-[#202B3A] text-base font-semibold tracking-wide md:text-lg hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all"
          >
            卡密兑换
          </Link>
        </nav>

        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-[#10B981] text-[#0B0D17] rounded-xl border border-[#202B3A] text-base font-semibold tracking-wide md:text-lg shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all"
        >
          开始创作
        </Link>
      </header>

      <main className="flex-1 flex flex-col justify-center items-center overflow-y-auto">
        <div className="max-w-4xl mx-auto text-center space-y-6 mb-8">
          {/* 主标题 */}
          <div className="w-full flex justify-center items-center px-4 py-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-200 to-green-500 drop-shadow-sm">
              AI画堂 · 自媒体全自动知识图卡生产线
            </h1>
          </div>
          
          {/* 副标题 */}
          <p className="text-sm sm:text-base md:text-lg text-[#94A3B8] max-w-3xl mx-auto leading-relaxed px-4">
            告别生硬的 AI 感，拒绝繁琐的排版。内置 DeepSeek 智能知识排版引擎，只需输入一句话，秒级重构为自媒体高密度爆款知识卡片与手绘板书。
          </p>
          
          {/* CTA按钮 */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#10B981] text-[#040D0A] rounded-xl text-lg font-bold shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] transition-all"
          >
            立即免费开启
            <span className="text-xl">→</span>
          </Link>
        </div>

        {/* 核心功能区 */}
        <div className="max-w-6xl mx-auto w-full mb-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white">核心功能</h2>
            <p className="text-sm text-[#10B981]">高效创作，一键生成</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#141923] rounded-xl border border-[#202B3A] p-5 hover:border-[#10B981] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all"
              >
                <div className="text-3xl mb-3">{feature.icon}</div>
                <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[#10B981] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 痛点对比面板 */}
        <div className="max-w-6xl mx-auto w-full mb-6">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white">为什么选择 AI画堂？</h2>
            <p className="text-sm text-[#10B981]">传统工具 vs AI画堂</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 左栏：传统工具痛点 */}
            <div className="bg-[#1a0a0a] border border-red-900/50 rounded-xl p-5">
              <h3 className="text-base font-bold text-red-400 mb-4">❌ 传统工具的痛点</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-lg">❌</span>
                  <div>
                    <p className="text-sm text-red-300 font-semibold">成本极高</p>
                    <p className="text-xs text-red-400/70">月费动辄上百，单张生图成本 1-2 元。</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-lg">❌</span>
                  <div>
                    <p className="text-sm text-red-300 font-semibold">廉价 AI 感</p>
                    <p className="text-xs text-red-400/70">排版死板，带有浓厚的一眼假糖水风。</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-lg">❌</span>
                  <div>
                    <p className="text-sm text-red-300 font-semibold">服务缺失</p>
                    <p className="text-xs text-red-400/70">大厂平台冰冷，无真人客服，无法定制。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 右栏：AI画堂优势 */}
            <div className="bg-gradient-to-br from-[#0a1a0a] to-[#0a1a15] border border-[#10B981]/50 rounded-xl p-5">
              <h3 className="text-base font-bold text-[#10B981] mb-4">✅ AI画堂的无敌优势</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-lg">✅</span>
                  <div>
                    <p className="text-sm text-[#10B981] font-semibold">价格屠夫</p>
                    <p className="text-xs text-[#10B981]/70">单张生成低至 1毛4分钱，29元生 160 张卡片。</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-lg">✅</span>
                  <div>
                    <p className="text-sm text-[#10B981] font-semibold">提炼神器</p>
                    <p className="text-xs text-[#10B981]/70">内置优化引擎，粗糙文本一键变高密度教材。</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[#10B981] text-lg">✅</span>
                  <div>
                    <p className="text-sm text-[#10B981] font-semibold">私域有温度</p>
                    <p className="text-xs text-[#10B981]/70">1对1主理人微信客服，按自媒体痛点快速迭代。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 创作流程 */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-white">创作流程</h2>
            <p className="text-sm text-[#10B981]">简单三步，轻松上手</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-[#10B981] text-[#0B0D17] rounded-xl text-sm font-bold mb-3 border border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  {step.step}
                </div>
                <h3 className="text-base font-bold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-[#10B981]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="text-center flex-shrink-0">
        <p className="text-xs text-[#10B981]">© 2026 AI画堂 · 让知识绽放艺术之美</p>
      </footer>
    </div>
  )
}
