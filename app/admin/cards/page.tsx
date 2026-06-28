'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
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

export default function CardsAdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [cardCount, setCardCount] = useState(10)
  const [cardCredits, setCardCredits] = useState(100)
  const [generating, setGenerating] = useState(false)
  const [generatedCards, setGeneratedCards] = useState<Card[]>([])
  const [showResult, setShowResult] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'unused' | 'used'>('all')
  const [showTermsModal, setShowTermsModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
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

      try {
        const response = await fetch('/api/admin/cards', {
          headers: authHeaders(false),
        })
        const data = await response.json()

        if (data.success) {
          setCards(data.cards || [])
        }
      } catch (error) {
        console.error('Fetch cards error:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [router])

  const handleGenerateCards = async () => {
    if (cardCount <= 0 || cardCount > 100) {
      alert('生成数量必须在 1 到 100 之间。')
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

      if (data.success) {
        setGeneratedCards(data.cards || [])
        setShowResult(true)
        setCards((prev) => [...(data.cards || []), ...prev])
      } else {
        alert(data.error || '生成卡密失败。')
      }
    } catch (error) {
      console.error('Generate cards error:', error)
      alert('生成卡密失败，请稍后重试。')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopyCards = async () => {
    const cardTexts = generatedCards.map((card) => `${card.code} (${card.credits} 积分)`).join('\n')
    await navigator.clipboard.writeText(cardTexts)
    alert('卡密列表已复制到剪贴板。')
  }

  const handleCopySingleCard = async (code: string) => {
    await navigator.clipboard.writeText(code)

    const toast = document.createElement('div')
    toast.textContent = '已复制'
    toast.className =
      'fixed top-4 right-4 z-[9999] rounded-lg bg-[#10B981] px-4 py-2 font-bold text-[#030712] animate-pulse'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 1500)
  }

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (filterStatus === 'unused') return !card.is_used
      if (filterStatus === 'used') return card.is_used
      return true
    })
  }, [cards, filterStatus])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712]">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030712] pb-20 text-white">
      <header className="sticky top-0 z-50 border-b border-[#1E293B] bg-[#030712]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#10B981] transition-colors hover:text-[#00F2FE]">
              返回后台
            </Link>
            <h1 className="text-xl font-bold">卡密管理</h1>
          </div>
          <div className="text-sm text-gray-400">管理员：{user?.email}</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-6">
          <h2 className="mb-4 text-lg font-bold text-[#10B981]">生成新卡密</h2>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm text-gray-400">生成数量</label>
              <input
                type="number"
                value={cardCount}
                onChange={(event) =>
                  setCardCount(Math.max(1, Math.min(100, parseInt(event.target.value, 10) || 1)))
                }
                className="w-full rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-3 text-white focus:border-[#10B981] focus:outline-none"
                min="1"
                max="100"
              />
              <p className="mt-1 text-xs text-gray-500">范围：1 - 100</p>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-400">卡密面额 / 积分</label>
              <select
                value={cardCredits}
                onChange={(event) => setCardCredits(parseInt(event.target.value, 10))}
                className="w-full rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-3 text-white focus:border-[#10B981] focus:outline-none"
              >
                <option value={100}>100 积分（10 元）</option>
                <option value={320}>320 积分（29 元）</option>
                <option value={700}>700 积分（59 元）</option>
                <option value={1300}>1300 积分（99 元）</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => void handleGenerateCards()}
                disabled={generating}
                className={`w-full rounded-lg px-6 py-3 font-bold transition-all ${
                  generating
                    ? 'cursor-not-allowed bg-[#334155] text-gray-500'
                    : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                }`}
              >
                {generating ? '生成中...' : '批量生成卡密'}
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-[#1E293B] bg-[#0F172A] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#10B981]">卡密列表</h2>

            <div className="flex gap-2">
              <FilterButton active={filterStatus === 'all'} onClick={() => setFilterStatus('all')}>
                全部 ({cards.length})
              </FilterButton>
              <FilterButton active={filterStatus === 'unused'} onClick={() => setFilterStatus('unused')}>
                未使用 ({cards.filter((card) => !card.is_used).length})
              </FilterButton>
              <FilterButton active={filterStatus === 'used'} onClick={() => setFilterStatus('used')}>
                已使用 ({cards.filter((card) => card.is_used).length})
              </FilterButton>
            </div>
          </div>

          {filteredCards.length === 0 ? (
            <div className="py-8 text-center text-gray-500">暂无卡密记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E293B] text-left">
                    <th className="px-2 py-3 font-medium text-gray-400">卡密</th>
                    <th className="px-2 py-3 font-medium text-gray-400">积分</th>
                    <th className="px-2 py-3 font-medium text-gray-400">状态</th>
                    <th className="px-2 py-3 font-medium text-gray-400">创建时间</th>
                    <th className="px-2 py-3 font-medium text-gray-400">使用信息</th>
                    <th className="px-2 py-3 font-medium text-gray-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.slice(0, 100).map((card) => (
                    <tr key={card.id} className="border-b border-[#1E293B]/50 transition-colors hover:bg-[#1E293B]/30">
                      <td className="px-2 py-3 font-mono text-[#10B981]">{card.code}</td>
                      <td className="px-2 py-3 text-white">{card.credits}</td>
                      <td className="px-2 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            card.is_used ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {card.is_used ? '已使用' : '未使用'}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-gray-400">{new Date(card.created_at).toLocaleString('zh-CN')}</td>
                      <td className="px-2 py-3 text-xs text-gray-400">
                        {card.used_email || card.used_by ? (
                          <div className="space-y-1">
                            {card.used_email && <div>{card.used_email}</div>}
                            {card.used_at && <div>{new Date(card.used_at).toLocaleString('zh-CN')}</div>}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => void handleCopySingleCard(card.code)}
                          className="rounded bg-[#10B981]/20 px-2 py-1 text-xs text-[#10B981] transition-colors hover:bg-[#10B981]/30"
                        >
                          复制
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCards.length > 100 && (
                <p className="py-3 text-center text-sm text-gray-500">当前仅显示前 100 条，请先筛选后再查看。</p>
              )}
            </div>
          )}
        </section>
      </main>

      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#1E293B] bg-[#0F172A] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#10B981]">卡密生成成功</h3>
              <button onClick={() => setShowResult(false)} className="text-gray-400 transition-colors hover:text-white">
                ×
              </button>
            </div>

            <p className="mb-4 text-gray-400">
              本次共生成 {generatedCards.length} 张卡密，每张 {cardCredits} 积分。
            </p>

            <div className="mb-4 flex-1 overflow-y-auto rounded-lg bg-[#1E293B] p-4">
              <div className="space-y-2">
                {generatedCards.map((card, index) => (
                  <div key={`${card.code}-${index}`} className="flex items-center justify-between rounded bg-[#0F172A] px-3 py-2">
                    <span className="font-mono text-[#10B981]">{card.code}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{card.credits} 积分</span>
                      <button
                        onClick={() => void handleCopySingleCard(card.code)}
                        className="rounded bg-[#10B981]/20 px-2 py-0.5 text-xs text-[#10B981] transition-colors hover:bg-[#10B981]/30"
                      >
                        复制
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => void handleCopyCards()}
                className="flex-1 rounded-lg bg-[#10B981] py-3 font-bold text-[#030712] transition-colors hover:bg-[#059669]"
              >
                复制全部
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

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1E293B]/50 bg-[#030712]/95 py-2.5 backdrop-blur-sm">
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
      className={`rounded-lg px-3 py-1.5 text-sm transition-all ${
        active ? 'bg-[#10B981] text-[#030712]' : 'bg-[#1E293B] text-gray-400 hover:bg-[#334155]'
      }`}
    >
      {children}
    </button>
  )
}
