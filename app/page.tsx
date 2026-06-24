'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { TermsModal } from '@/components/TermsModal'
import { getStoredSession } from '@/lib/session'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = () => {
      const session = getStoredSession()
      if (session?.email === '50923561@qq.com') {
        setIsAdmin(true)
      }
    }
    checkAdmin()
  }, [])

  const features = [
    {
      icon: '✨',
      title: '智能AI优化生成',
      description: '支持双通道，AI一键优化长文本，让图卡拥有高密度知识灵魂。',
    },
    {
      icon: '🎨',
      title: '拒绝廉价AI感',
      description: '50+种自媒体爆款美术风格，模块化错落有致，高级视觉体验。',
    },
    {
      icon: '🔑',
      title: '极速卡密激活',
      description: '高强度卡密兑换系统，多激活码连续叠加，无手续费，安全可靠。',
    },
  ]

  const steps = [
    {
      step: '01',
      title: '输入内容',
      description: '输入文本描述',
    },
    {
      step: '02',
      title: '选择风格',
      description: '选择心仪样式',
    },
    {
      step: '03',
      title: '生成下载',
      description: '一键生成下载',
    },
  ]

  return (
    <div className="min-h-screen w-full max-w-[100vw] bg-[#030712] text-white flex flex-col relative overflow-hidden">
      {/* 统一极客深黑背景层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0a0f1a] to-[#030712] pointer-events-none"></div>
      {/* 顶部渐变柔光 */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#10B981]/10 via-transparent to-transparent pointer-events-none"></div>
      {/* 极光光晕效果 - 顶部左侧绿色 */}
      <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#10B981]/20 via-[#10B981]/5 to-transparent rounded-full blur-[120px] pointer-events-none animate-aurora-glow"></div>
      {/* 极光光晕效果 - 顶部右侧青色 */}
      <div className="absolute -top-20 right-1/4 w-[450px] h-[450px] bg-gradient-to-bl from-[#00F2FE]/20 via-[#00F2FE]/5 to-transparent rounded-full blur-[100px] pointer-events-none animate-aurora-glow" style={{animationDelay: '2s'}}></div>
      {/* 极光光晕效果 - 中部紫色 */}
      <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-[#8B5CF6]/15 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none animate-aurora-glow" style={{animationDelay: '4s'}}></div>
      {/* 移动端优化的 Header */}
      <header className="flex-shrink-0 border-b border-[#1e293b] sticky top-0 z-[60] bg-[#030712]/95 backdrop-blur-sm">
        <div className="w-full px-3 sm:px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <img 
              src="/logo.png?v=8" 
              alt="AI画堂" 
              className="h-12 sm:h-20 w-auto object-contain" 
            />
          </Link>

          {/* 桌面端导航 */}
          <nav className="hidden md:flex items-center gap-3 flex-1 justify-center">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-lg text-sm font-semibold shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            >
              创作
            </Link>
            <Link
              href="/records"
              className="px-4 py-2 bg-[#141923] text-white rounded-lg text-sm font-semibold border border-[#202B3A] hover:border-[#10B981] transition-colors"
            >
              记录
            </Link>
            <Link
              href="/recharge"
              className="px-4 py-2 bg-[#141923] text-white rounded-lg text-sm font-semibold border border-[#202B3A] hover:border-[#10B981] transition-colors"
            >
              卡密兑换
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-lg text-sm font-semibold shadow-[0_0_10px_rgba(139,92,246,0.3)]"
              >
                后台管理
              </Link>
            )}
          </nav>

          {/* 移动端菜单按钮 */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center bg-[#141923] border border-[#202B3A] rounded-lg"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* 桌面端开始创作按钮 */}
          <div className="hidden md:block">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-lg text-sm font-semibold shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            >
              开始创作
            </Link>
          </div>
        </div>

        {/* 移动端菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden px-3 pb-3 border-t border-[#1e293b] pt-3 bg-[#030712]">
            <div className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-[#10B981] text-[#0B0D17] rounded-lg text-sm font-bold text-center"
              >
                🎨 立即创作
              </Link>
              <Link
                href="/records"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-[#141923] text-white rounded-lg text-sm font-semibold text-center border border-[#202B3A]"
              >
                📁 生成记录
              </Link>
              <Link
                href="/recharge"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 bg-[#141923] text-white rounded-lg text-sm font-semibold text-center border border-[#202B3A]"
              >
                🔑 卡密激活
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-lg text-sm font-semibold text-center"
                >
                  ⚙️ 后台管理
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center px-3 py-4 sm:py-6">
        <div className="text-center mb-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mb-1 bg-gradient-to-r from-[#03F09C] via-[#00F2FE] via-[#10B981] to-[#03F09C] bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient-flow_4s_ease_infinite] drop-shadow-[0_0_20px_rgba(3,240,156,0.4)]">
            AI画堂 · 自媒体全自动知识图卡生产线
          </h1>
          <p className="text-xs text-[#94A3B8] max-w-2xl mx-auto">
            告别生硬AI感，拒绝繁琐排版。内置智能排版引擎，一句话秒级重构为高密度爆款知识卡片。
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#10B981] text-[#040D0A] rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] mt-2"
          >
            立即免费开启
            <span>→</span>
          </Link>
        </div>

        <div className="w-full max-w-4xl mb-2">
          <div className="text-center mb-2">
            <h2 className="text-sm font-bold text-white">核心功能</h2>
            <p className="text-xs text-[#10B981]">高效创作，一键生成</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#141923] rounded-lg border border-[#202B3A] p-3"
              >
                <div className="text-xl mb-1">{feature.icon}</div>
                <h3 className="text-xs font-bold text-white mb-0.5">{feature.title}</h3>
                <p className="text-xs text-[#10B981] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-4xl mb-2">
          <div className="text-center mb-2">
            <h2 className="text-sm font-bold text-white">为什么选择 AI画堂？</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="md:col-span-2 bg-[#1a0a0a] border border-red-900/50 rounded-lg p-3">
              <h3 className="text-xs font-bold text-red-400 mb-2">❌ 传统工具的痛点</h3>
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="text-red-500 text-xs">❌</span>
                  <div>
                    <p className="text-xs text-red-300 font-semibold">成本极高</p>
                    <p className="text-xs text-red-400/70">月费动辄上百，单张 1-2 元。</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-red-500 text-xs">❌</span>
                  <div>
                    <p className="text-xs text-red-300 font-semibold">廉价 AI 感</p>
                    <p className="text-xs text-red-400/70">排版死板，一眼假糖水风。</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-red-500 text-xs">❌</span>
                  <div>
                    <p className="text-xs text-red-300 font-semibold">服务缺失</p>
                    <p className="text-xs text-red-400/70">大厂冰冷，无真人客服。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:flex md:col-span-1 items-center justify-center">
              <div className="font-black text-3xl text-zinc-600">VS</div>
            </div>

            <div className="md:col-span-2 bg-gradient-to-br from-[#0a1a0a] to-[#0a1a15] border border-[#10B981]/50 rounded-lg p-3">
              <h3 className="text-xs font-bold text-[#10B981] mb-2">✅ AI画堂的优势</h3>
              <div className="space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <span className="text-[#10B981] text-xs">✅</span>
                  <div>
                    <p className="text-xs text-[#10B981] font-semibold">价格屠夫</p>
                    <p className="text-xs text-[#10B981]/70">单张低至 1毛4分，29元生 160 张。</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[#10B981] text-xs">✅</span>
                  <div>
                    <p className="text-xs text-[#10B981] font-semibold">提炼神器</p>
                    <p className="text-xs text-[#10B981]/70">粗糙文本一键变高密度教材。</p>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="text-[#10B981] text-xs">✅</span>
                  <div>
                    <p className="text-xs text-[#10B981] font-semibold">私域有温度</p>
                    <p className="text-xs text-[#10B981]/70">1对1主理人微信客服。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-3xl">
          <div className="text-center mb-2">
            <h2 className="text-sm font-bold text-white">创作流程</h2>
            <p className="text-xs text-[#10B981]">简单三步，轻松上手</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-[#10B981] text-[#0B0D17] rounded-lg text-xs font-bold mb-1 border border-[#10B981]/50">
                  {step.step}
                </div>
                <h3 className="text-xs font-bold text-white mb-0.5">{step.title}</h3>
                <p className="text-xs text-[#10B981]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 py-2.5 bg-[#030712]/95 border-t border-[#1e293b]/50 backdrop-blur-sm z-40">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            登录或使用本站即代表您同意{' '}
            <button 
              onClick={() => setShowTermsModal(true)}
              className="text-[#10B981] hover:text-[#00F2FE] font-semibold underline underline-offset-2 decoration-[#10B981]/50 hover:decoration-[#00F2FE] transition-all duration-300 hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] rounded px-1"
            >
              《安全合规与使用须知》
            </button>
          </p>
        </div>
      </footer>

      <TermsModal
        show={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  )
}
