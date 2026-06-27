'use client'

import { useEffect, useState } from 'react'
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
  used_at?: string
}

export default function CardsAdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
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

      setUser(session)

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

    fetchData()
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
    toast.className = 'fixed top-4 right-4 bg-[#10B981] text-[#030712] px-4 py-2 rounded-lg font-bold z-[9999] animate-pulse'
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 1500)
  }

  const filteredCards = cards.filter((card) => {
    if (filterStatus === 'unused') return !card.is_used
    if (filterStatus === 'used') return card.is_used
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <header className="bg-[#030712]/95 border-b border-[#1e293b] sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#10B981] hover:text-[#00F2FE] transition-colors">
              ← 返回管理后台
            </Link>
            <h1 className="text-xl font-bold">卡密管理系统</h1>
          </div>
          <div className="text-sm text-gray-400">管理员：{user?.email}</div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4 text-[#10B981]">生成新卡密</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">生成数量</label>
              <input
                type="number"
                value={cardCount}
                onChange={(e) => setCardCount(Math.max(1, Math.min(100, parseInt(e.target.value, 10) || 1)))}
                className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] text-white rounded-lg focus:border-[#10B981] focus:outline-none"
                min="1"
                max="100"
              />
              <p className="text-xs text-gray-500 mt-1">范围：1 - 100</p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">卡密面额 / 积分</label>
              <select
                value={cardCredits}
                onChange={(e) => setCardCredits(parseInt(e.target.value, 10))}
                className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] text-white rounded-lg focus:border-[#10B981] focus:outline-none"
              >
                <option value={100}>100 积分（10 元）</option>
                <option value={320}>320 积分（29 元）</option>
                <option value={700}>700 积分（59 元）</option>
                <option value={1300}>1300 积分（99 元）</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerateCards}
                disabled={generating}
                className={`w-full py-3 px-6 font-bold rounded-lg transition-all ${
                  generating
                    ? 'bg-[#334155] text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                }`}
              >
                {generating ? '生成中...' : '批量生成卡密'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#10B981]">卡密列表</h2>

            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  filterStatus === 'all'
                    ? 'bg-[#10B981] text-[#030712]'
                    : 'bg-[#1e293b] text-gray-400 hover:bg-[#334155]'
                }`}
              >
                全部 ({cards.length})
              </button>
              <button
                onClick={() => setFilterStatus('unused')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  filterStatus === 'unused'
                    ? 'bg-[#10B981] text-[#030712]'
                    : 'bg-[#1e293b] text-gray-400 hover:bg-[#334155]'
                }`}
              >
                未使用 ({cards.filter((card) => !card.is_used).length})
              </button>
              <button
                onClick={() => setFilterStatus('used')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                  filterStatus === 'used'
                    ? 'bg-[#10B981] text-[#030712]'
                    : 'bg-[#1e293b] text-gray-400 hover:bg-[#334155]'
                }`}
              >
                已使用 ({cards.filter((card) => card.is_used).length})
              </button>
            </div>
          </div>

          {filteredCards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无卡密记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e293b] text-left">
                    <th className="py-3 px-2 text-gray-400 font-medium">卡密</th>
                    <th className="py-3 px-2 text-gray-400 font-medium">积分</th>
                    <th className="py-3 px-2 text-gray-400 font-medium">状态</th>
                    <th className="py-3 px-2 text-gray-400 font-medium">创建时间</th>
                    <th className="py-3 px-2 text-gray-400 font-medium">使用信息</th>
                    <th className="py-3 px-2 text-gray-400 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.slice(0, 100).map((card) => (
                    <tr key={card.id} className="border-b border-[#1e293b]/50 hover:bg-[#1e293b]/30 transition-colors">
                      <td className="py-3 px-2 font-mono text-[#10B981]">{card.code}</td>
                      <td className="py-3 px-2 text-white">{card.credits}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            card.is_used
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}
                        >
                          {card.is_used ? '已使用' : '未使用'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-400">
                        {new Date(card.created_at).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-2 text-gray-400 text-xs">
                        {card.used_by ? `用户 ID：${card.used_by}` : '-'}
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleCopySingleCard(card.code)}
                          className="px-2 py-1 text-xs bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 rounded transition-colors"
                        >
                          复制
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredCards.length > 100 && (
                <p className="text-center py-3 text-gray-500 text-sm">
                  当前仅显示前 100 条，请先筛选后再查看。
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {showResult && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-[#10B981]">卡密生成成功</h3>
              <button
                onClick={() => setShowResult(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>

            <p className="text-gray-400 mb-4">
              本次共生成 {generatedCards.length} 张卡密，每张 {cardCredits} 积分。
            </p>

            <div className="flex-1 overflow-y-auto bg-[#1e293b] rounded-lg p-4 mb-4">
              <div className="space-y-2">
                {generatedCards.map((card, index) => (
                  <div key={`${card.code}-${index}`} className="flex items-center justify-between bg-[#0f172a] px-3 py-2 rounded">
                    <span className="font-mono text-[#10B981]">{card.code}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm">{card.credits} 积分</span>
                      <button
                        onClick={() => handleCopySingleCard(card.code)}
                        className="px-2 py-0.5 text-xs bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 rounded transition-colors"
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
                onClick={handleCopyCards}
                className="flex-1 py-3 bg-[#10B981] text-[#030712] font-bold rounded-lg hover:bg-[#059669] transition-colors"
              >
                复制全部
              </button>
              <button
                onClick={() => setShowResult(false)}
                className="flex-1 py-3 bg-[#334155] text-white font-bold rounded-lg hover:bg-[#475569] transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 py-2.5 bg-[#030712]/95 border-t border-[#1e293b]/50 backdrop-blur-sm z-40">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
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
