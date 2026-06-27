'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { TermsModal } from '@/components/TermsModal'
import { isAdminEmail } from '@/lib/auth'
import { getStoredSession } from '@/lib/session'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const session = getStoredSession()
    setIsAdmin(isAdminEmail(session?.email))
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (heroRef.current) {
      observer.observe(heroRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const features = [
    {
      icon: 'Sparkles',
      title: '智能优化生成',
      description: '支持文本优化和图像重构，让知识卡片既有内容密度，也有视觉完成度。',
    },
    {
      icon: 'Palette',
      title: '拒绝廉价 AI 感',
      description: '内置多种自媒体爆款视觉风格，排版更克制，画面更高级。',
    },
    {
      icon: 'KeyRound',
      title: '卡密秒级激活',
      description: '支持卡密充值与快速到账，适合个人创作和团队高频使用。',
    },
  ]

  const steps = [
    {
      step: '01',
      title: '输入内容',
      description: '填写文案或上传参考图',
    },
    {
      step: '02',
      title: '选择风格',
      description: '匹配适合的画风与版式',
    },
    {
      step: '03',
      title: '生成下载',
      description: '一键得到可用成品',
    },
  ]

  const comparison = {
    traditional: [
      { title: '成本偏高', description: '常见平台单张价格高，连续创作压力大。' },
      { title: '风格单一', description: '模版感强，很难做出稳定的品牌调性。' },
      { title: '响应较慢', description: '高峰期排队明显，影响内容发布节奏。' },
    ],
    product: [
      { title: '高性价比', description: '按积分精细计费，适合长期、批量创作。' },
      { title: '风格更多样', description: '支持不同自媒体场景，视觉表达更灵活。' },
      { title: '生成更高效', description: '从文案到成图链路更短，反馈更直接。' },
    ],
  }

  return (
    <div className="min-h-screen w-full bg-[#030712] text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0a0f1a] to-[#030712] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#10B981]/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#10B981]/20 via-[#10B981]/5 to-transparent rounded-full blur-[120px] pointer-events-none animate-aurora-glow" />
      <div
        className="absolute -top-20 right-1/4 w-[450px] h-[450px] bg-gradient-to-bl from-[#00F2FE]/20 via-[#00F2FE]/5 to-transparent rounded-full blur-[100px] pointer-events-none animate-aurora-glow"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-[#8B5CF6]/15 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none animate-aurora-glow"
        style={{ animationDelay: '4s' }}
      />

      <header className="flex-shrink-0 border-b border-[#1e293b]/50 sticky top-0 z-[60] bg-[#030712]/95 backdrop-blur-sm relative overflow-hidden">
        <div className="header-particles" />
        <div className="header-glow-particles" />

        <div className="w-full px-3 sm:px-4 py-2 flex items-center justify-between relative z-10">
          <Link href="/" className="flex-shrink-0">
            <img src="/logo.png?v=8" alt="AI画堂" className="h-10 sm:h-16 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
            <Link href="/dashboard" className="px-3 py-1.5 bg-[#10B981] text-[#0B0D17] rounded-lg text-xs font-semibold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              创作
            </Link>
            <Link href="/records" className="px-3 py-1.5 bg-[#141923] text-white rounded-lg text-xs font-semibold border border-[#202B3A] hover:border-[#10B981] transition-colors">
              记录
            </Link>
            <Link href="/recharge" className="px-3 py-1.5 bg-[#141923] text-white rounded-lg text-xs font-semibold border border-[#202B3A] hover:border-[#10B981] transition-colors">
              充值
            </Link>
            <Link href="/announcements" className="px-3 py-1.5 bg-[#141923] text-white rounded-lg text-xs font-semibold border border-[#202B3A] hover:border-[#10B981] transition-colors">
              公告
            </Link>
            {isAdmin && (
              <Link href="/admin" className="px-3 py-1.5 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-lg text-xs font-semibold shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                管理
              </Link>
            )}
          </nav>

          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
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

          <div className="hidden md:block">
            <Link href="/dashboard" className="px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-lg text-sm font-semibold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              立即开始
            </Link>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-3 pb-3 border-t border-[#1e293b] pt-3 bg-[#030712]">
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-[#10B981] text-[#0B0D17] rounded-lg text-sm font-bold text-center">
                立即创作
              </Link>
              <Link href="/records" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-[#141923] text-white rounded-lg text-sm font-semibold text-center border border-[#202B3A]">
                生成记录
              </Link>
              <Link href="/recharge" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-[#141923] text-white rounded-lg text-sm font-semibold text-center border border-[#202B3A]">
                卡密充值
              </Link>
              <Link href="/announcements" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-[#141923] text-white rounded-lg text-sm font-semibold text-center border border-[#202B3A]">
                站内公告
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-lg text-sm font-semibold text-center">
                  后台管理
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center px-3 py-4 sm:py-6 relative z-10 pt-4 pb-8">
        <div ref={heroRef} className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-2 sm:mb-3">
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#03F09C] via-[#00F2FE] to-[#10B981] bg-clip-text text-transparent animate-gradient-flow">
                AI画堂
              </span>
              <span className="absolute -inset-1 bg-gradient-to-r from-[#03F09C] via-[#00F2FE] to-[#10B981] opacity-20 blur-md -z-10 animate-gradient-flow" />
            </span>
            <span className={`text-white ${isVisible ? 'animate-title-reveal' : 'opacity-0'}`}> · 自媒体全自动知识图卡生产线</span>
          </h1>

          <p
            className={`text-xs sm:text-sm text-gray-400 max-w-2xl mx-auto mb-3 sm:mb-4 leading-relaxed ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.3s' }}
          >
            告别生硬 AI 感，拒绝繁琐排版。内置智能排版引擎，一句话就能重构成高密度、可直接发布的知识卡片。
          </p>

          <p
            className={`text-xs sm:text-sm text-[#03F09C]/80 max-w-2xl mx-auto mb-3 sm:mb-4 leading-relaxed ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.5s' }}
          >
            支持标准清晰、2K 超清、4K 极清多档输出，兼顾成本与成品质量，适合小红书、抖音、公众号和课程内容高频生产。
          </p>

          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-[#10B981] text-[#040D0A] rounded-xl text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
            style={{ animationDelay: '0.6s' }}
          >
            立即免费开启
            <span>→</span>
          </Link>
        </div>

        <div className={`w-full max-w-5xl mb-6 sm:mb-8 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '0.9s' }}>
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white mb-1">核心功能</h2>
            <p className="text-xs text-[#10B981]">高效创作，一键生成</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-3 sm:p-4 hover:border-[#10B981] transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
              >
                <div className="text-sm sm:text-base font-semibold text-[#10B981] mb-1.5 sm:mb-2">{feature.icon}</div>
                <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5">{feature.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`w-full max-w-5xl mb-6 sm:mb-8 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '1.4s' }}>
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white">为什么选择 AI画堂？</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2 sm:gap-3">
            <div className="md:col-span-2 bg-[#0f172a] border border-red-900/30 rounded-xl p-3 sm:p-4">
              <h3 className="text-xs font-bold text-red-400 mb-2">传统工具的痛点</h3>
              <div className="space-y-1.5 sm:space-y-2">
                {comparison.traditional.map((item) => (
                  <div key={item.title} className="flex items-start gap-1.5">
                    <span className="text-red-500 text-xs mt-0.5">×</span>
                    <div>
                      <p className="text-xs text-red-300 font-semibold">{item.title}</p>
                      <p className="text-xs text-red-400/70">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden md:flex md:col-span-1 items-center justify-center">
              <div className="font-black text-xl sm:text-2xl text-zinc-600">VS</div>
            </div>

            <div className="md:col-span-2 bg-[#0f172a] border border-[#10B981]/30 rounded-xl p-3 sm:p-4">
              <h3 className="text-xs font-bold text-[#10B981] mb-2">AI画堂的优势</h3>
              <div className="space-y-1.5 sm:space-y-2">
                {comparison.product.map((item) => (
                  <div key={item.title} className="flex items-start gap-1.5">
                    <span className="text-[#10B981] text-xs mt-0.5">✓</span>
                    <div>
                      <p className="text-xs text-[#10B981] font-semibold">{item.title}</p>
                      <p className="text-xs text-[#10B981]/70">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`w-full max-w-4xl mb-4 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{ animationDelay: '1.7s' }}>
          <div className="text-center mb-3">
            <h2 className="text-base sm:text-lg font-bold text-white">创作流程</h2>
            <p className="text-xs text-[#10B981]">三步完成，高频可复用</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-[#10B981] text-[#0B0D17] rounded-xl text-xs sm:text-sm font-bold mb-1.5 sm:mb-2 border border-[#10B981]/50">
                  {step.step}
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-white mb-0.5">{step.title}</h3>
                <p className="text-xs text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 py-2 bg-[#030712]/95 border-t border-[#1e293b]/50 backdrop-blur-sm z-40">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-xs text-gray-400">
            登录或使用本站即代表您同意
            {' '}
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-[#10B981] hover:text-[#00F2FE] font-semibold underline underline-offset-2 decoration-[#10B981]/50 hover:decoration-[#00F2FE] transition-all duration-300 hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] rounded px-1"
            >
              《安全合规与使用须知》
            </button>
          </p>
        </div>
      </footer>

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}
