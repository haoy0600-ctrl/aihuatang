'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <div className="min-h-screen w-full bg-[#040D0A] text-white flex flex-col">
      {/* Header 导航栏 - sticky 顶部 */}
      <header className="sticky top-0 z-50 bg-[#040D0A]/95 backdrop-blur-md border-b border-[#142D24] flex-shrink-0">
        <div className="w-full px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center select-none hover:opacity-80 transition-opacity">
              <img 
                src="/logo.png?v=8" 
                alt="AI画堂" 
                className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain" 
              />
            </Link>

            {/* 桌面端导航 */}
            <nav className="hidden md:flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-xl border border-[#202B3A] text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all"
              >
                创作
              </Link>
              <Link
                href="/records"
                className="px-4 py-2 bg-[#141923] text-white rounded-xl border border-[#202B3A] text-sm font-semibold tracking-wide hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all"
              >
                记录
              </Link>
              <Link
                href="/recharge"
                className="px-4 py-2 bg-[#141923] text-white rounded-xl border border-[#202B3A] text-sm font-semibold tracking-wide hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all"
              >
                卡密兑换
              </Link>
            </nav>

            {/* 移动端汉堡菜单按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center bg-[#141923] border border-[#202B3A] rounded-xl hover:border-[#10B981] transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* 桌面端快捷按钮 */}
            <Link
              href="/dashboard"
              className="hidden md:flex px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-xl border border-[#202B3A] text-sm font-semibold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all"
            >
              开始创作
            </Link>
          </div>

          {/* 移动端下拉菜单 */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 pb-3 border-t border-[#142D24] pt-3">
              <div className="flex flex-col gap-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 bg-[#10B981] text-[#0B0D17] rounded-xl text-sm font-bold text-center"
                >
                  🎨 立即创作
                </Link>
                <Link
                  href="/recharge"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 bg-[#141923] text-white rounded-xl text-sm font-semibold text-center border border-[#202B3A]"
                >
                  🔑 卡密激活
                </Link>
                <Link
                  href="/records"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 bg-[#141923] text-white rounded-xl text-sm font-semibold text-center border border-[#202B3A]"
                >
                  📁 生成记录
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 主内容区 - 自适应高度 */}
      <main className="flex-1 w-full overflow-x-hidden overflow-y-auto">
        {/* 主标题区 */}
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8 text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-200 to-green-500 drop-shadow-sm mb-2 sm:mb-3">
            AI画堂 · 自媒体全自动知识图卡生产线
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-[#94A3B8] max-w-3xl mx-auto leading-relaxed mb-4">
            告别生硬的 AI 感，拒绝繁琐的排版。内置 DeepSeek 智能知识排版引擎，只需输入一句话，秒级重构为自媒体高密度爆款知识卡片与手绘板书。
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-[#10B981] text-[#040D0A] rounded-xl text-sm sm:text-base font-bold shadow-[0_0_20px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_rgba(16,185,129,0.7)] transition-all"
          >
            立即免费开启
            <span className="text-lg">→</span>
          </Link>
        </div>

        {/* 核心功能区 */}
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="text-center mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white">核心功能</h2>
            <p className="text-xs sm:text-sm text-[#10B981]">高效创作，一键生成</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#141923] rounded-xl border border-[#202B3A] p-4 sm:p-5 hover:border-[#10B981] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all"
              >
                <div className="text-2xl sm:text-3xl mb-2">{feature.icon}</div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-[#10B981] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 痛点对比面板 */}
        <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="text-center mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white">为什么选择 AI画堂？</h2>
          </div>
          
          {/* 移动端垂直单列，桌面端5列 */}
          <div className="grid grid-cols-1 md:grid-cols-5 items-stretch gap-3 sm:gap-4">
            {/* 左栏：传统工具痛点 */}
            <div className="md:col-span-2 bg-[#1a0a0a] border border-red-900/50 rounded-xl p-4 sm:p-5">
              <h3 className="text-sm sm:text-base font-bold text-red-400 mb-3">❌ 传统工具的痛点</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 flex-shrink-0">❌</span>
                  <div>
                    <p className="text-xs sm:text-sm text-red-300 font-semibold">成本极高</p>
                    <p className="text-xs sm:text-sm text-red-400/70">月费动辄上百，单张生图成本 1-2 元。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 flex-shrink-0">❌</span>
                  <div>
                    <p className="text-xs sm:text-sm text-red-300 font-semibold">廉价 AI 感</p>
                    <p className="text-xs sm:text-sm text-red-400/70">排版死板，带有浓厚的一眼假糖水风。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 flex-shrink-0">❌</span>
                  <div>
                    <p className="text-xs sm:text-sm text-red-300 font-semibold">服务缺失</p>
                    <p className="text-xs sm:text-sm text-red-400/70">大厂平台冰冷，无真人客服，无法定制。</p>
                  </div>
                </div>
              </div>
            </div>

            {/* VS 大字 - 移动端隐藏 */}
            <div className="hidden md:flex md:col-span-1 items-center justify-center">
              <div className="font-black text-4xl lg:text-5xl text-zinc-600">VS</div>
            </div>

            {/* 右栏：AI画堂优势 */}
            <div className="md:col-span-2 bg-gradient-to-br from-[#0a1a0a] to-[#0a1a15] border border-[#10B981]/50 rounded-xl p-4 sm:p-5">
              <h3 className="text-sm sm:text-base font-bold text-[#10B981] mb-3">✅ AI画堂的无敌优势</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] flex-shrink-0">✅</span>
                  <div>
                    <p className="text-xs sm:text-sm text-[#10B981] font-semibold">价格屠夫</p>
                    <p className="text-xs sm:text-sm text-[#10B981]/70">单张生成低至 1毛4分钱，29元生 160 张卡片。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] flex-shrink-0">✅</span>
                  <div>
                    <p className="text-xs sm:text-sm text-[#10B981] font-semibold">提炼神器</p>
                    <p className="text-xs sm:text-sm text-[#10B981]/70">内置优化引擎，粗糙文本一键变高密度教材。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] flex-shrink-0">✅</span>
                  <div>
                    <p className="text-xs sm:text-sm text-[#10B981] font-semibold">私域有温度</p>
                    <p className="text-xs sm:text-sm text-[#10B981]/70">1对1主理人微信客服，按自媒体痛点快速迭代。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 创作流程 */}
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-8 sm:pb-12">
          <div className="text-center mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white">创作流程</h2>
            <p className="text-xs sm:text-sm text-[#10B981]">简单三步，轻松上手</p>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-[#10B981] text-[#0B0D17] rounded-xl text-sm sm:text-base font-bold mb-2 border border-[#10B981]/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                  {step.step}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">{step.title}</h3>
                <p className="text-xs sm:text-sm text-[#10B981]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 sm:py-5 border-t border-[#142D24] flex-shrink-0">
        <p className="text-xs sm:text-sm text-[#10B981]">© 2026 AI画堂 · 让知识绽放艺术之美</p>
      </footer>
    </div>
  )
}
