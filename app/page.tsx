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
      { threshold: 0.1 },
    )

    if (heroRef.current) {
      observer.observe(heroRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const features = [
    {
      icon: 'AI',
      title: '智能优化生成',
      description: '支持长文拆解、提示词优化和成图细节增强，让知识图卡既有内容密度，也有完成度。',
    },
    {
      icon: '风格',
      title: '拒绝廉价 AI 感',
      description: '内置多套自媒体高转化视觉模版，适合小红书、公众号、课程封面和信息卡片。',
    },
    {
      icon: '卡密',
      title: '卡密秒级激活',
      description: '支持站内卡密充值与套餐兑换，个人创作者和团队账号都能快速开工。',
    },
  ]

  const steps = [
    {
      step: '01',
      title: '输入主题',
      description: '填写选题、观点或参考文案',
    },
    {
      step: '02',
      title: '选择风格',
      description: '匹配适合的画风、排版和输出规格',
    },
    {
      step: '03',
      title: '生成发布',
      description: '一键导出可直接使用的成品',
    },
  ]

  const comparison = {
    traditional: [
      { title: '成本偏高', description: '单张价格波动大，高频创作时预算压力明显。' },
      { title: '风格不稳', description: '容易出现模版感重、品牌调性不统一的问题。' },
      { title: '响应较慢', description: '从写提示词到返工修改，整体链路长。' },
    ],
    product: [
      { title: '成本更可控', description: '按积分细分消耗，适合持续产出和批量生成。' },
      { title: '风格更统一', description: '同一主题下可以稳定保持视觉秩序和内容质感。' },
      { title: '效率更高', description: '从输入文案到成图发布，流程更短、更直接。' },
    ],
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#030712] text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0a0f1a] to-[#030712]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#10B981]/10 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -top-20 left-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-[#10B981]/20 via-[#10B981]/5 to-transparent blur-[120px]" />
      <div className="pointer-events-none absolute -top-20 right-1/4 h-[450px] w-[450px] rounded-full bg-gradient-to-bl from-[#00F2FE]/20 via-[#00F2FE]/5 to-transparent blur-[100px]" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-[#8B5CF6]/15 via-transparent to-transparent blur-[100px]" />

      <header className="sticky top-0 z-[60] border-b border-[#1e293b]/50 bg-[#030712]/95 backdrop-blur-sm">
        <div className="w-full px-3 py-2 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="shrink-0">
              <img src="/logo.png?v=8" alt="AI画堂" className="h-10 w-auto object-contain sm:h-16" />
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
              <Link href="/dashboard" className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-semibold text-[#0B0D17] shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                创作台
              </Link>
              <Link href="/records" className="rounded-lg border border-[#202B3A] bg-[#141923] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-[#10B981]">
                生成记录
              </Link>
              <Link href="/recharge" className="rounded-lg border border-[#202B3A] bg-[#141923] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-[#10B981]">
                充值中心
              </Link>
              <Link href="/announcements" className="rounded-lg border border-[#202B3A] bg-[#141923] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:border-[#10B981]">
                站内公告
              </Link>
              {isAdmin && (
                <Link href="/admin" className="rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                  后台管理
                </Link>
              )}
            </nav>

            <button
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#202B3A] bg-[#141923] md:hidden"
            >
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <div className="hidden md:block">
              <Link href="/dashboard" className="rounded-lg bg-[#10B981] px-4 py-2 text-sm font-semibold text-[#0B0D17] shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                立即开始
              </Link>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="mt-3 border-t border-[#1e293b] pt-3 md:hidden">
              <div className="flex flex-col gap-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-[#10B981] px-4 py-3 text-center text-sm font-bold text-[#0B0D17]">
                  立即创作
                </Link>
                <Link href="/records" onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-[#202B3A] bg-[#141923] px-4 py-3 text-center text-sm font-semibold text-white">
                  生成记录
                </Link>
                <Link href="/recharge" onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-[#202B3A] bg-[#141923] px-4 py-3 text-center text-sm font-semibold text-white">
                  卡密充值
                </Link>
                <Link href="/announcements" onClick={() => setMobileMenuOpen(false)} className="rounded-lg border border-[#202B3A] bg-[#141923] px-4 py-3 text-center text-sm font-semibold text-white">
                  站内公告
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] px-4 py-3 text-center text-sm font-semibold text-white">
                    后台管理
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center px-3 pb-8 pt-4 sm:py-6">
        <div ref={heroRef} className="mb-6 text-center sm:mb-8">
          <h1 className="mb-2 text-xl font-extrabold sm:mb-3 sm:text-2xl md:text-3xl lg:text-4xl">
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[#03F09C] via-[#00F2FE] to-[#10B981] bg-clip-text text-transparent">
                AI画堂
              </span>
              <span className="absolute -inset-1 -z-10 bg-gradient-to-r from-[#03F09C] via-[#00F2FE] to-[#10B981] opacity-20 blur-md" />
            </span>
            <span className={`${isVisible ? 'opacity-100' : 'opacity-0'} text-white transition-opacity duration-700`}>
              {' '}· 自媒体全自动知识图卡生产线
            </span>
          </h1>

          <p className={`${isVisible ? 'opacity-100' : 'opacity-0'} mx-auto mb-3 max-w-2xl text-xs leading-relaxed text-gray-400 transition-opacity delay-200 duration-700 sm:mb-4 sm:text-sm`}>
            告别生硬的 AI 感和繁琐排版。内置智能排版引擎，一句话就能重构成高密度、可直接发布的知识图卡。
          </p>

          <p className={`${isVisible ? 'opacity-100' : 'opacity-0'} mx-auto mb-3 max-w-2xl text-xs leading-relaxed text-[#03F09C]/80 transition-opacity delay-300 duration-700 sm:mb-4 sm:text-sm`}>
            支持标准、2K、4K 多档输出，兼顾预算与成品质量，适合小红书、公众号、课程封面和社群分发场景。
          </p>

          <Link
            href="/dashboard"
            className={`${isVisible ? 'opacity-100' : 'opacity-0'} inline-flex items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2 text-xs font-bold text-[#040D0A] shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all delay-500 duration-700 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] sm:px-6 sm:py-3 sm:text-sm`}
          >
            立即免费开启
            <span>→</span>
          </Link>
        </div>

        <div className={`${isVisible ? 'opacity-100' : 'opacity-0'} mb-6 w-full max-w-5xl transition-opacity delay-700 duration-700 sm:mb-8`}>
          <div className="mb-3 text-center sm:mb-4">
            <h2 className="mb-1 text-base font-bold text-white sm:text-lg">核心功能</h2>
            <p className="text-xs text-[#10B981]">高效创作，一键生成</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-[#1e293b] bg-[#0f172a] p-3 transition-all duration-300 hover:border-[#10B981] hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] sm:p-4"
              >
                <div className="mb-1.5 text-sm font-semibold text-[#10B981] sm:mb-2 sm:text-base">{feature.icon}</div>
                <h3 className="mb-0.5 text-xs font-bold text-white sm:text-sm">{feature.title}</h3>
                <p className="text-xs leading-relaxed text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={`${isVisible ? 'opacity-100' : 'opacity-0'} mb-6 w-full max-w-5xl transition-opacity delay-1000 duration-700 sm:mb-8`}>
          <div className="mb-3 text-center sm:mb-4">
            <h2 className="text-base font-bold text-white sm:text-lg">为什么选择 AI画堂？</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-red-900/30 bg-[#0f172a] p-3 sm:p-4 md:col-span-2">
              <h3 className="mb-2 text-xs font-bold text-red-400">传统工具的痛点</h3>
              <div className="space-y-1.5 sm:space-y-2">
                {comparison.traditional.map((item) => (
                  <div key={item.title} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-xs text-red-500">×</span>
                    <div>
                      <p className="text-xs font-semibold text-red-300">{item.title}</p>
                      <p className="text-xs text-red-400/70">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden items-center justify-center md:flex md:col-span-1">
              <div className="text-xl font-black text-zinc-600 sm:text-2xl">VS</div>
            </div>

            <div className="rounded-xl border border-[#10B981]/30 bg-[#0f172a] p-3 sm:p-4 md:col-span-2">
              <h3 className="mb-2 text-xs font-bold text-[#10B981]">AI画堂的优势</h3>
              <div className="space-y-1.5 sm:space-y-2">
                {comparison.product.map((item) => (
                  <div key={item.title} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-xs text-[#10B981]">✓</span>
                    <div>
                      <p className="text-xs font-semibold text-[#10B981]">{item.title}</p>
                      <p className="text-xs text-[#10B981]/70">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className={`${isVisible ? 'opacity-100' : 'opacity-0'} mb-4 w-full max-w-4xl transition-opacity delay-[1300ms] duration-700`}>
          <div className="mb-3 text-center">
            <h2 className="text-base font-bold text-white sm:text-lg">创作流程</h2>
            <p className="text-xs text-[#10B981]">三步完成，高频可复用</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {steps.map((step) => (
              <div key={step.step} className="text-center">
                <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#10B981]/50 bg-[#10B981] text-xs font-bold text-[#0B0D17] sm:mb-2 sm:h-10 sm:w-10 sm:text-sm">
                  {step.step}
                </div>
                <h3 className="mb-0.5 text-xs font-bold text-white sm:text-sm">{step.title}</h3>
                <p className="text-xs text-gray-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1e293b]/50 bg-[#030712]/95 py-2 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 text-center">
          <p className="text-xs text-gray-400">
            登录或使用本站即代表您同意
            {' '}
            <button
              onClick={() => setShowTermsModal(true)}
              className="rounded px-1 font-semibold text-[#10B981] underline decoration-[#10B981]/50 underline-offset-2 transition-all duration-300 hover:text-[#00F2FE] hover:decoration-[#00F2FE]"
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
