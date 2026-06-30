'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TermsModal } from '@/components/TermsModal'
import { isAdminEmail } from '@/lib/auth'
import { authHeaders, getStoredSession } from '@/lib/session'

interface Card {
  id: string
  code: string
  credits: number
  is_used: boolean
  created_at: string
  used_by?: string
  used_email?: string
  used_at?: string
}

type CardSummary = {
  credits: number
  total: number
  used: number
  unused: number
}

type CardStatus = 'all' | 'unused' | 'used'

const PAGE_SIZE = 50
const CARD_PLANS = [
  { credits: 100, label: '100 积分', price: 10 },
  { credits: 320, label: '320 积分', price: 29 },
  { credits: 700, label: '700 积分', price: 59 },
  { credits: 1300, label: '1300 积分', price: 99 },
  { credits: 2800, label: '2800 积分', price: 199 },
]

export default function CardsAdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [summary, setSummary] = useState<CardSummary[]>([])
  const [totals, setTotals] = useState({ total: 0, unused: 0, used: 0 })
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cardCount, setCardCount] = useState(100)
  const [cardCredits, setCardCredits] = useState(100)
  const [generating, setGenerating] = useState(false)
  const [generatedCards, setGeneratedCards] = useState<Card[]>([])
  const [showResult, setShowResult] = useState(false)
  const [filterStatus, setFilterStatus] = useState<CardStatus>('all')
  const [creditFilter, setCreditFilter] = useState<number | 'all'>('all')
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState('')
  const [showTermsModal, setShowTermsModal] = useState(false)

  const pageCount = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 1800)
  }, [])

  const fetchCards = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      status: filterStatus,
      credits: String(creditFilter),
    })

    if (debouncedKeyword.trim()) {
      params.set('keyword', debouncedKeyword.trim())
    }

    const response = await fetch(`/api/admin/cards?${params.toString()}`, {
      headers: authHeaders(false),
      cache: 'no-store',
    })
    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || '获取卡密列表失败。')
    }

    setCards(data.cards || [])
    setSummary(data.summary || [])
    setTotals(data.totals || { total: 0, unused: 0, used: 0 })
    setTotalRows(data.total || 0)
  }, [creditFilter, debouncedKeyword, filterStatus, page])

  useEffect(() => {
    const session = getStoredSession()
    if (!session) {
      router.push('/login')
      return
    }

    if (!isAdminEmail(session.email)) {
      router.push('/dashboard')
      return
    }

    setUser({ email: session.email })
  }, [router])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedKeyword(keyword)
      setPage(1)
    }, 300)

    return () => window.clearTimeout(timer)
  }, [keyword])

  useEffect(() => {
    if (!user) return

    setLoading(true)
    fetchCards()
      .catch((error) => {
        console.error('Fetch cards error:', error)
        showToast(error.message || '获取卡密失败')
      })
      .finally(() => setLoading(false))
  }, [fetchCards, showToast, user])

  const selectedSummary = useMemo(
    () => summary.find((item) => item.credits === creditFilter),
    [creditFilter, summary],
  )

  const handleGenerateCards = async () => {
    if (cardCount <= 0 || cardCount > 1000) {
      alert('生成数量必须在 1 到 1000 之间。')
      return
    }

    if (cardCredits <= 0) {
      alert('卡密积分必须大于 0。')
      return
    }

    setGenerating(true)

    try {
      const response = await fetch('/api/admin/generate-cards', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          count: cardCount,
          credits: cardCredits,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        alert(data.error || '生成卡密失败。')
        return
      }

      setGeneratedCards(data.cards || [])
      setShowResult(true)
      setCreditFilter(cardCredits)
      setFilterStatus('unused')
      setPage(1)
      await fetchCards()
    } catch (error) {
      console.error('Generate cards error:', error)
      alert('生成卡密失败，请稍后重试。')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyCards = async (items = generatedCards) => {
    const cardTexts = items.map((card) => `${card.code} (${card.credits} 积分)`).join('\n')
    await navigator.clipboard.writeText(cardTexts)
    showToast('卡密已复制')
  }

  const handleCopySingleCard = async (code: string) => {
    await navigator.clipboard.writeText(code)
    showToast('已复制')
  }

  const handleCopyCurrentPage = async () => {
    await handleCopyCards(cards)
  }

  const setCreditFilterAndReset = (value: number | 'all') => {
    setCreditFilter(value)
    setPage(1)
  }

  const setStatusAndReset = (status: CardStatus) => {
    setFilterStatus(status)
    setPage(1)
  }

  if (!user || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712]">
        <div className="text-white">正在加载...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030712] pb-16 text-white">
      <header className="sticky top-0 z-50 border-b border-[#1E293B] bg-[#030712]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#10B981] transition-colors hover:text-[#00F2FE]">
              返回后台
            </Link>
            <h1 className="text-xl font-bold">卡密管理</h1>
          </div>
          <div className="hidden text-sm text-gray-400 sm:block">管理员：{user.email}</div>
        </div>
      </header>

      {toast && (
        <div className="fixed right-4 top-16 z-[9999] rounded-lg bg-[#10B981] px-4 py-2 text-sm font-bold text-[#030712] shadow-lg">
          {toast}
        </div>
      )}

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="全部卡密" value={totals.total} />
          <MetricCard label="未使用" value={totals.unused} tone="green" />
          <MetricCard label="已使用" value={totals.used} tone="red" />
          <MetricCard label="当前筛选" value={totalRows} hint={`第 ${page} / ${pageCount} 页`} />
        </section>

        <section className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 sm:p-6">
          <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-lg font-bold text-[#10B981]">生成新卡密</h2>
              <p className="mt-1 text-sm text-gray-400">支持一次生成 1-1000 张，生成后只弹出新卡密，列表按需分页查看。</p>
            </div>
            <button
              onClick={handleCopyCurrentPage}
              disabled={cards.length === 0}
              className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-2 text-sm font-semibold text-[#10B981] transition hover:bg-[#10B981]/20 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-600"
            >
              复制当前页
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1.2fr]">
            <div>
              <label className="mb-2 block text-sm text-gray-400">生成数量</label>
              <input
                type="number"
                value={cardCount}
                onChange={(event) =>
                  setCardCount(Math.max(1, Math.min(1000, parseInt(event.target.value, 10) || 1)))
                }
                className="w-full rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-3 text-white focus:border-[#10B981] focus:outline-none"
                min="1"
                max="1000"
              />
              <p className="mt-1 text-xs text-gray-500">范围：1 - 1000</p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">卡密面额 / 积分</label>
              <select
                value={cardCredits}
                onChange={(event) => setCardCredits(parseInt(event.target.value, 10))}
                className="w-full rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-3 text-white focus:border-[#10B981] focus:outline-none"
              >
                {CARD_PLANS.map((plan) => (
                  <option key={plan.credits} value={plan.credits}>
                    {plan.label}（{plan.price} 元）
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => void handleGenerateCards()}
                disabled={generating}
                className={`w-full rounded-lg px-6 py-3 font-bold transition-all ${
                  generating
                    ? 'cursor-not-allowed bg-[#334155] text-gray-500'
                    : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-[#030712] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                }`}
              >
                {generating ? '生成中...' : '批量生成卡密'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#10B981]">面额概览</h2>
              <p className="mt-1 text-sm text-gray-400">先看每个金额的库存和使用情况，再点面额查看明细，不需要从几千条列表里找。</p>
            </div>
          </div>

          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {summary.map((group) => {
              const active = creditFilter === group.credits
              const usedRate = group.total > 0 ? Math.round((group.used / group.total) * 100) : 0
              return (
                <button
                  key={group.credits}
                  onClick={() => setCreditFilterAndReset(active ? 'all' : group.credits)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? 'border-[#10B981] bg-[#10B981]/12 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                      : 'border-[#1E293B] bg-[#111827] hover:border-[#10B981]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-[#10B981]">{group.credits} 积分卡</p>
                      <p className="mt-2 text-2xl font-bold text-white">{group.total}</p>
                    </div>
                    <span className="rounded-full border border-[#334155] px-2 py-1 text-xs text-gray-400">{usedRate}% 已用</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1E293B]">
                    <div className="h-full rounded-full bg-[#10B981]" style={{ width: `${100 - usedRate}%` }} />
                  </div>
                  <div className="mt-3 flex justify-between text-xs text-gray-400">
                    <span>未使用 {group.unused}</span>
                    <span>已使用 {group.used}</span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索卡密 / 使用邮箱"
              className="rounded-lg border border-[#334155] bg-[#111827] px-4 py-2.5 text-sm text-white outline-none focus:border-[#10B981]"
            />

            <div className="flex gap-2 overflow-x-auto">
              <FilterButton active={filterStatus === 'all'} onClick={() => setStatusAndReset('all')}>
                全部 ({totals.total})
              </FilterButton>
              <FilterButton active={filterStatus === 'unused'} onClick={() => setStatusAndReset('unused')}>
                未使用 ({totals.unused})
              </FilterButton>
              <FilterButton active={filterStatus === 'used'} onClick={() => setStatusAndReset('used')}>
                已使用 ({totals.used})
              </FilterButton>
            </div>

            <select
              value={String(creditFilter)}
              onChange={(event) => {
                const value = event.target.value
                setCreditFilterAndReset(value === 'all' ? 'all' : Number(value))
              }}
              className="rounded-lg border border-[#334155] bg-[#111827] px-4 py-2.5 text-sm text-white outline-none focus:border-[#10B981]"
            >
              <option value="all">全部面额</option>
              {summary.map((group) => (
                <option key={group.credits} value={group.credits}>
                  {group.credits} 积分
                </option>
              ))}
            </select>
          </div>

          {selectedSummary && (
            <div className="mb-4 rounded-xl border border-[#10B981]/20 bg-[#10B981]/8 px-4 py-3 text-sm text-[#A7F3D0]">
              当前查看：{selectedSummary.credits} 积分卡，共 {selectedSummary.total} 张，未使用 {selectedSummary.unused} 张，已使用 {selectedSummary.used} 张。
            </div>
          )}

          {cards.length === 0 ? (
            <div className="py-10 text-center text-gray-500">暂无符合条件的卡密记录</div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-[#1E293B]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead>
                    <tr className="border-b border-[#1E293B] bg-[#111827] text-left">
                      <th className="px-4 py-3 font-medium text-gray-400">卡密</th>
                      <th className="px-4 py-3 font-medium text-gray-400">面额</th>
                      <th className="px-4 py-3 font-medium text-gray-400">状态</th>
                      <th className="px-4 py-3 font-medium text-gray-400">创建时间</th>
                      <th className="px-4 py-3 font-medium text-gray-400">使用信息</th>
                      <th className="px-4 py-3 font-medium text-gray-400">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((card) => (
                      <tr key={card.id} className="border-b border-[#1E293B]/50 transition-colors hover:bg-[#1E293B]/30">
                        <td className="px-4 py-3 font-mono text-[#10B981]">{card.code}</td>
                        <td className="px-4 py-3 text-white">{card.credits} 积分</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              card.is_used ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                            }`}
                          >
                            {card.is_used ? '已使用' : '未使用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{new Date(card.created_at).toLocaleString('zh-CN')}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {card.used_email || card.used_by ? (
                            <div className="space-y-1">
                              {card.used_email && <div>{card.used_email}</div>}
                              {card.used_at && <div>{new Date(card.used_at).toLocaleString('zh-CN')}</div>}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => void handleCopySingleCard(card.code)}
                            className="rounded bg-[#10B981]/20 px-3 py-1 text-xs text-[#10B981] transition-colors hover:bg-[#10B981]/30"
                          >
                            复制
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-sm text-gray-500">
              共 {totalRows} 条，当前显示第 {(page - 1) * PAGE_SIZE + (cards.length > 0 ? 1 : 0)} -{' '}
              {(page - 1) * PAGE_SIZE + cards.length} 条
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-[#334155] px-3 py-2 text-sm text-gray-300 disabled:cursor-not-allowed disabled:text-gray-600"
              >
                上一页
              </button>
              <span className="text-sm text-gray-400">
                {page} / {pageCount}
              </span>
              <button
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={page >= pageCount}
                className="rounded-lg border border-[#334155] px-3 py-2 text-sm text-gray-300 disabled:cursor-not-allowed disabled:text-gray-600"
              >
                下一页
              </button>
            </div>
          </div>
        </section>
      </main>

      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F172A] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#10B981]">卡密生成成功</h3>
              <button onClick={() => setShowResult(false)} className="text-gray-400 transition-colors hover:text-white">
                ×
              </button>
            </div>

            <p className="mb-4 text-gray-400">
              本次共生成 {generatedCards.length} 张卡密，每张 {cardCredits} 积分。建议先复制保存，再发给用户。
            </p>

            <div className="mb-4 flex-1 overflow-y-auto rounded-lg bg-[#1E293B] p-4">
              <div className="space-y-2">
                {generatedCards.slice(0, 200).map((card, index) => (
                  <div key={`${card.code}-${index}`} className="flex items-center justify-between rounded bg-[#0F172A] px-3 py-2">
                    <span className="font-mono text-[#10B981]">{card.code}</span>
                    <span className="text-sm text-white">{card.credits} 积分</span>
                  </div>
                ))}
                {generatedCards.length > 200 && (
                  <div className="py-3 text-center text-sm text-gray-400">
                    仅预览前 200 条，点击“复制全部新卡”会复制完整 {generatedCards.length} 条。
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => void handleCopyCards(generatedCards)}
                className="flex-1 rounded-lg bg-[#10B981] py-3 font-bold text-[#030712] transition-colors hover:bg-[#059669]"
              >
                复制全部新卡
              </button>
              <button
                onClick={() => setShowResult(false)}
                className="flex-1 rounded-lg bg-[#334155] py-3 font-bold text-white transition-colors hover:bg-[#475569]"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#1E293B]/50 bg-[#030712]/95 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 text-center">
          <p className="text-sm text-gray-400">
            登录或使用本站即代表您同意
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

function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: number
  hint?: string
  tone?: 'default' | 'green' | 'red'
}) {
  const toneClass =
    tone === 'green' ? 'text-[#10B981]' : tone === 'red' ? 'text-red-300' : 'text-white'

  return (
    <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-2 text-sm transition-all ${
        active ? 'bg-[#10B981] text-[#030712]' : 'bg-[#1E293B] text-gray-400 hover:bg-[#334155]'
      }`}
    >
      {children}
    </button>
  )
}
