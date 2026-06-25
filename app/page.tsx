'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { TermsModal } from '@/components/TermsModal'
import { getStoredSession } from '@/lib/session'

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAdmin = () => {
      const session = getStoredSession()
      if (session?.email === '50923561@qq.com') {
        setIsAdmin(true)
      }
    }
    checkAdmin()
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
    <div className="min-h-screen w-full bg-[#030712] text-white flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0a0f1a] to-[#030712] pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#10B981]/10 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute -top-20 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#10B981]/20 via-[#10B981]/5 to-transparent rounded-full blur-[120px] pointer-events-none animate-aurora-glow"></div>
      <div className="absolute -top-20 right-1/4 w-[450px] h-[450px] bg-gradient-to-bl from-[#00F2FE]/20 via-[#00F2FE]/5 to-transparent rounded-full blur-[100px] pointer-events-none animate-aurora-glow" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-gradient-to-r from-[#8B5CF6]/15 via-transparent to-transparent rounded-full blur-[100px] pointer-events-none animate-aurora-glow" style={{animationDelay: '4s'}}></div>

      <header className="flex-shrink-0 border-b border-[#1e293b] sticky top-0 z-[60] bg-[#030712]/95 backdrop-blur-sm">
        <div className="w-full px-3 sm:px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex-shrink-0">
            <img src="/logo.png?v=8" alt="AI画堂" className="h-12 sm:h-20 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-3 flex-1 justify-center">
            <Link href="/dashboard" className="px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-lg text-sm font-semibold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              创作
            </Link>
            <Link href="/records" className="px-4 py-2 bg-[#141923] text-white rounded-lg text-sm font-semibold border border-[#202B3A] hover:border-[#10B981] transition-colors">
              记录
            </Link>
            <Link href="/recharge" className="px-4 py-2 bg-[#141923] text-white rounded-lg text-sm font-semibold border border-[#202B3A] hover:border-[#10B981] transition-colors">
              卡密兑换
            </Link>
            {isAdmin && (
              <Link href="/admin" className="px-4 py-2 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-lg text-sm font-semibold shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                后台管理
              </Link>
            )}
          </nav>

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

          <div className="hidden md:block">
            <Link href="/dashboard" className="px-4 py-2 bg-[#10B981] text-[#0B0D17] rounded-lg text-sm font-semibold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              开始创作
            </Link>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-3 pb-3 border-t border-[#1e293b] pt-3 bg-[#030712]">
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-[#10B981] text-[#0B0D17] rounded-lg text-sm font-bold text-center">
                🎨 立即创作
              </Link>
              <Link href="/records" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-[#141923] text-white rounded-lg text-sm font-semibold text-center border border-[#202B3A]">
                📁 生成记录
              </Link>
              <Link href="/recharge" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-[#141923] text-white rounded-lg text-sm font-semibold text-center border border-[#202B3A]">
                🔑 卡密激活
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] text-white rounded-lg text-sm font-semibold text-center">
                  ⚙️ 后台管理
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center px-3 py-6 sm:py-10 relative z-10 pt-20 pb-24">
        <div ref={heroRef} className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold mb-3 sm:mb-4">
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#03F09C] via-[#00F2FE] to-[#10B981] bg-clip-text text-transparent animate-gradient-flow">
                AI画堂
              </span>
              <span className="absolute -inset-1 bg-gradient-to-r from-[#03F09C] via-[#00F2FE] to-[#10B981] opacity-20 blur-md -z-10 animate-gradient-flow"></span>
            </span>
            <span className={`text-white ${isVisible ? 'animate-title-reveal' : 'opacity-0'}`}> · 自媒体全自动知识图卡生产线</span>
          </h1>
          <p className={`text-sm sm:text-base text-gray-400 max-w-2xl mx-auto mb-4 sm:mb-6 leading-relaxed ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{animationDelay: '0.3s'}}>
            告别生硬AI感，拒绝繁琐排版。内置智能排版引擎，一句话秒级重构为高密度爆款知识卡片。
          </p>
          <Link
            href="/dashboard"
            className={`inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-[#10B981] text-[#040D0A] rounded-xl text-sm sm:text-base font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
            style={{animationDelay: '0.6s'}}
          >
            立即免费开启
            <span>→</span>
          </Link>
        </div>

        <div className={`w-full max-w-5xl mb-8 sm:mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{animationDelay: '0.9s'}}>
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">🎯 核心功能</h2>
            <p className="text-xs sm:text-sm text-[#10B981]">高效创作，一键生成</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-[#0f172a] rounded-xl border border-[#1e293b] p-4 sm:p-5 hover:border-[#10B981] transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                style={{animationDelay: `${1 + index * 0.15}s`}}
              >
                <div className="text-2xl sm:text-3xl mb-2 sm:mb-3">{feature.icon}</div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`w-full max-w-5xl mb-8 sm:mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{animationDelay: '1.4s'}}>
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-white">💡 为什么选择 AI画堂？</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4">
            <div className="md:col-span-2 bg-[#0f172a] border border-red-900/30 rounded-xl p-4 sm:p-5">
              <h3 className="text-sm font-bold text-red-400 mb-3">❌ 传统工具的痛点</h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-sm mt-0.5">❌</span>
                  <div>
                    <p className="text-sm text-red-300 font-semibold">成本偏高</p>
                    <p className="text-xs sm:text-sm text-red-400/70">主流平台单张约 0.5-1 元。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-sm mt-0.5">❌</span>
                  <div>
                    <p className="text-sm text-red-300 font-semibold">风格单一</p>
                    <p className="text-xs sm:text-sm text-red-400/70">模板化严重，缺乏个性。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 text-sm mt-0.5">❌</span>
                  <div>
                    <p className="text-sm text-red-300 font-semibold">响应较慢</p>
                    <p className="text-xs sm:text-sm text-red-400/70">高峰期排队，等待时间长。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:flex md:col-span-1 items-center justify-center">
              <div className="font-black text-2xl sm:text-3xl text-zinc-600">VS</div>
            </div>

            <div className="md:col-span-2 bg-[#0f172a] border border-[#10B981]/30 rounded-xl p-4 sm:p-5">
              <h3 className="text-sm font-bold text-[#10B981] mb-3">✅ AI画堂的优势</h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] text-sm mt-0.5">✅</span>
                  <div>
                    <p className="text-sm text-[#10B981] font-semibold">高性价比</p>
                    <p className="text-xs sm:text-sm text-[#10B981]/70">1K高清2点/张，多档位灵活选择。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] text-sm mt-0.5">✅</span>
                  <div>
                    <p className="text-sm text-[#10B981] font-semibold">风格多样</p>
                    <p className="text-xs sm:text-sm text-[#10B981]/70">50+种美术风格，支持自定义。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#10B981] text-sm mt-0.5">✅</span>
                  <div>
                    <p className="text-sm text-[#10B981] font-semibold">极速响应</p>
                    <p className="text-xs sm:text-sm text-[#10B981]/70">专属节点，秒级生成。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`w-full max-w-4xl mb-8 sm:mb-12 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`} style={{animationDelay: '1.7s'}}>
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-white">🚀 创作流程</h2>
            <p className="text-xs sm:text-sm text-[#10B981]">简单三步，轻松上手</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-[#10B981] text-[#0B0D17] rounded-xl text-sm sm:text-base font-bold mb-2 sm:mb-3 border border-[#10B981]/50">
                  {step.step}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">{step.title}</h3>
                <p className="text-xs sm:text-sm text-gray-400">{step.description}</p>
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
