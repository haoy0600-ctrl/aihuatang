'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { TermsModal } from '@/components/TermsModal'
import { BrandLogo } from '@/components/BrandLogo'
import { isAdminEmail } from '@/lib/auth'
import { getStoredSession } from '@/lib/session'

const FEATURE_CARDS = [
  {
    title: '智能优化成稿',
    desc: '自动整理长文重点，优化提示词结构，把内容密度和画面完成度一起提上来。',
  },
  {
    title: '多风格高质输出',
    desc: '覆盖知识图卡、课程总结、封面图、海报图与信息卡，减少模板感和廉价感。',
  },
  {
    title: '积分式按需消耗',
    desc: '按分辨率与张数计费，适合持续产出，也适合先低成本试稿再定稿。',
  },
]

const STEPS = [
  { no: '01', title: '输入主题', desc: '填入要点、长文或参考图。' },
  { no: '02', title: '选择风格', desc: '匹配适合的视觉方向与输出规格。' },
  { no: '03', title: '生成成稿', desc: '直接拿到可发布的知识图卡。' },
]

export default function HomePage() {
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const session = getStoredSession()
    setIsAdmin(isAdminEmail(session?.email))
  }, [])

  const rechargeHref = '/recharge?from=home&force=1'

  const handleRechargeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    window.location.assign(`/recharge?from=home&force=1&t=${Date.now()}`)
  }

  const navItems = useMemo(
    () => [
      { href: '/dashboard', label: '创作台' },
      { href: '/records', label: '生成记录' },
      { href: rechargeHref, label: '充值中心' },
      { href: '/announcements', label: '站内公告' },
    ],
    [rechargeHref],
  )

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.14),transparent_28%),linear-gradient(180deg,#060914_0%,#09111f_45%,#050816_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] [background-size:64px_64px]" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050816]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="min-w-0 flex-1 sm:flex-none">
            <BrandLogo className="max-w-[132px] sm:max-w-none" />
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.href.startsWith('/recharge') ? false : undefined}
                onClick={item.href.startsWith('/recharge') ? handleRechargeClick : undefined}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/90 transition hover:border-[#10B981]/50 hover:bg-[#10B981]/10"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_22px_rgba(139,92,246,0.28)]"
              >
                后台管理
              </Link>
            )}
          </nav>

          <div className="hidden md:block">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-2xl border border-[#10B981]/40 bg-[#0D1C18] px-5 py-2.5 text-sm font-semibold text-[#DDFEF1] shadow-[0_0_24px_rgba(16,185,129,0.16)] transition hover:border-[#10B981] hover:bg-[#11271f]"
            >
              进入创作台
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] md:hidden"
            aria-label="打开导航"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={item.href.startsWith('/recharge') ? false : undefined}
                  onClick={(event) => {
                    setMobileMenuOpen(false)
                    if (item.href.startsWith('/recharge')) {
                      handleRechargeClick(event)
                    }
                  }}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/90"
                >
                  {item.label}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] px-4 py-3 text-sm font-semibold text-white"
                >
                  后台管理
                </Link>
              )}
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-[#10B981]/40 bg-[#0D1C18] px-4 py-3 text-sm font-semibold text-[#DDFEF1]"
              >
                进入创作台
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-[1320px] px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <div className="grid items-start gap-10 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center rounded-full border border-[#10B981]/20 bg-[#0D1C18]/80 px-3 py-1 text-xs font-medium text-[#8CF5CA]">
                自媒体高质感图文工作台
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight text-white sm:text-5xl">
                <span className="block bg-gradient-to-r from-[#18F2A1] via-[#20E3FF] to-[#B0F6E0] bg-clip-text text-transparent">
                  AI画堂
                </span>
                <span className="mt-3 block text-white/96 sm:mt-4">自媒体高质感图文设计与智能排版工具</span>
              </h1>

              <div className="mt-6 inline-flex max-w-full items-center rounded-2xl border border-[#10B981]/25 bg-[#10B981]/10 px-4 py-2 text-sm font-semibold text-[#8CF5CA]">
                新用户注册邮箱后赠送 8 积分，可直接用于测试生成。
              </div>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#9FB0C8] sm:text-base">
                让长文总结、课程知识点、公众号图文和封面图不再只像 AI 生成。我们把内容组织、风格约束、画面完成度和输出规格做成了一条更稳定的创作链路。
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6BE5C2] sm:text-base">
                支持 1K、2K、4K 分档输出，适合先试稿，再定稿，再按发布场景放大保存。
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-2xl bg-gradient-to-r from-[#14C98E] to-[#12B981] px-6 py-3 text-sm font-bold text-[#04130F] shadow-[0_0_28px_rgba(16,185,129,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_0_34px_rgba(16,185,129,0.36)]"
                >
                  开始创作
                </Link>
                <Link
                  href={rechargeHref}
                  prefetch={false}
                  onClick={handleRechargeClick}
                  className="inline-flex items-center rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/92 transition hover:border-[#10B981]/50 hover:bg-white/[0.06]"
                >
                  查看充值方案
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <div className="grid gap-4">
                {FEATURE_CARDS.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-[#0A1323]/85 px-5 py-4 transition hover:border-[#10B981]/30"
                  >
                    <h3 className="text-base font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1320px] px-4 pb-10 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.no}
                className="rounded-3xl border border-white/10 bg-white/[0.035] px-6 py-6 backdrop-blur-sm"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10B981] text-sm font-black text-[#06120F]">
                  {step.no}
                </div>
                <h3 className="text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#94A3B8]">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-[#050816]/70">
        <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <p className="text-xs leading-6 text-[#7E90AC]">
            登录或使用本站即代表你同意
            <button
              onClick={() => setShowTermsModal(true)}
              className="ml-1 font-semibold text-[#6BE5C2] underline decoration-[#6BE5C2]/50 underline-offset-2"
            >
              《安全合规与使用须知》
            </button>
          </p>
          <p className="text-xs text-[#66758F]">AI画堂 · 面向高频内容生产的高质感图文工作台</p>
        </div>
      </footer>

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}
