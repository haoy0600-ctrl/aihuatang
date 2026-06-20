'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const CARD_TIERS = [
  { id: '10', name: '尝鲜款', price: 10, credits: 100 },
  { id: '29', name: '自媒体高频款', price: 29, credits: 320 },
  { id: '59', name: '金牌教师大包款', price: 59, credits: 700 },
  { id: '99', name: '机构尊享大额款', price: 99, credits: 1300, highlight: '大额更划算' },
  { id: '199', name: '工作室终极清仓款', price: 199, credits: 2800, highlight: '重度创作者最爱' },
]

export default function AdminCardGeneratorPage() {
  const [selectedTier, setSelectedTier] = useState<string>('10')
  const [customCredits, setCustomCredits] = useState('')
  const [count, setCount] = useState('1')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCards, setGeneratedCards] = useState<{ code: string; credits: number }[]>([])
  const [user, setUser] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      setCurrentTime(`${hours}:${minutes}:${seconds}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) return
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        setUser(data.session.user)
      } else {
        window.location.href = '/login'
      }
    }
    checkAuth()
  }, [])

  const handleCustomFocus = () => {
    setSelectedTier('custom')
  }

  const getCurrentCredits = (): number => {
    if (selectedTier === 'custom') {
      return parseInt(customCredits || '0')
    }
    const tier = CARD_TIERS.find(t => t.id === selectedTier)
    return tier?.credits || 0
  }

  const handleGenerate = async () => {
    const numCount = parseInt(count || '1')
    if (numCount < 1 || numCount > 100) {
      alert('生成数量必须在1-100之间')
      return
    }

    if (selectedTier === 'custom') {
      const amount = parseInt(customCredits || '0')
      if (amount < 10 || amount > 100000) {
        alert('自定义积分必须在10-100000之间')
        return
      }
    }

    setIsGenerating(true)
    setGeneratedCards([])

    try {
      const response = await fetch('/api/admin/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: selectedTier === 'custom' ? null : selectedTier,
          customCredits: selectedTier === 'custom' ? customCredits : null,
          count: numCount,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setGeneratedCards(data.cards)
      } else {
        alert(data.error || '制卡失败')
      }
    } catch (error) {
      alert('网络错误，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyAll = () => {
    if (!textareaRef.current) return
    textareaRef.current.select()
    document.execCommand('copy')
    alert('所有卡密已复制到剪贴板！')
  }

  const handleCopySingle = (code: string) => {
    navigator.clipboard.writeText(code)
    const btn = event?.target as HTMLElement
    const originalText = btn.textContent
    btn.textContent = '✓ 已复制'
    btn.classList.add('text-[#10B981]')
    setTimeout(() => {
      btn.textContent = originalText
      btn.classList.remove('text-[#10B981]')
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-[#040D0A]">
      <header className="bg-[#040D0A] border-b border-[#142D24]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full py-2 sm:py-3">
            <Link href="/" className="flex items-center select-none hover:opacity-80 transition-opacity">
              <img 
                src="/logo.png?v=6" 
                alt="AI画堂" 
                className="h-10 sm:h-12 w-10 sm:w-12 object-contain rounded-xl"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-2 sm:gap-3">
              <Link href="/dashboard" className="px-3 sm:px-4 py-2 bg-[#091511]/60 backdrop-blur-sm text-white font-bold text-sm border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-lg">
                创作
              </Link>
              <Link href="/records" className="px-3 sm:px-4 py-2 bg-[#091511]/60 backdrop-blur-sm text-white font-bold text-sm border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-lg">
                记录
              </Link>
              <Link href="/recharge" className="px-3 sm:px-4 py-2 bg-[#10B981] text-[#040D0A] font-bold text-sm border border-[#142D24] shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all rounded-lg">
                充值
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#10B981]">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
              </div>
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center gap-1 sm:gap-1.5 rounded-lg">
                <span className="w-2 h-2 bg-[#10B981] rounded-full"></span>
                <span className="text-xs text-[#10B981] hidden sm:inline">积分</span>
                <span className="font-bold text-white text-sm">ADMIN</span>
              </div>
              <div className="relative">
                <button 
                  onClick={() => { if (supabase) supabase.auth.signOut(); window.location.href = '/login'; }}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center justify-center hover:border-red-500 hover:text-red-400 transition-colors rounded-lg"
                >
                  <span className="text-white font-bold text-sm">
                    {user?.email ? user.email.substring(0, 2).toUpperCase() : 'AD'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">管理员制卡中心</h2>
              <p className="text-xs text-[#10B981] mt-0.5">批量生成卡密，支持大额档位与自定义面额</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {CARD_TIERS.map((tier) => (
              <div
                key={tier.id}
                onClick={() => {
                  setSelectedTier(tier.id)
                  setCustomCredits('')
                }}
                className={`relative cursor-pointer border transition-all rounded-xl ${
                  selectedTier === tier.id
                    ? 'border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'border-[#142D24] hover:border-[#10B981] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                } bg-[#091511]/60 backdrop-blur-md p-5`}
              >
                {selectedTier === tier.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-[#10B981] rounded-full flex items-center justify-center">
                    <span className="text-[#040D0A] font-bold text-xs">✓</span>
                  </div>
                )}
                
                {tier.highlight && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#F59E0B]/20 border border-[#F59E0B] rounded text-[#F59E0B] text-xs font-bold">
                    {tier.highlight}
                  </div>
                )}
                
                <h3 className="text-xs text-[#10B981] mb-1">{tier.name}</h3>
                <div className="text-xl font-bold text-white mb-0.5">{tier.credits}</div>
                <div className="text-xs text-[#10B981] mb-1">积分</div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xs text-[#10B981]">¥</span>
                  <span className="text-lg font-bold text-white">{tier.price}</span>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  约 {(tier.credits / tier.price).toFixed(1)} 积分/元
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-3">自定义面额</h3>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-[#10B981] text-xs mb-1">自定义积分</label>
                  <input
                    type="number"
                    value={customCredits}
                    onChange={(e) => setCustomCredits(e.target.value)}
                    onFocus={handleCustomFocus}
                    onClick={handleCustomFocus}
                    placeholder="输入任意积分数量"
                    min="10"
                    className={`w-full px-3 py-2 border text-white text-sm focus:outline-none transition-all rounded-lg ${
                      selectedTier === 'custom'
                        ? 'bg-[#040D0A] border-[#10B981] ring-1 ring-[#10B981]'
                        : 'bg-[#040D0A] border-[#142D24] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]'
                    } placeholder-[#64748B]`}
                  />
                </div>
              </div>

              <p className="text-[#10B981] text-xs mb-3">支持输入任意积分数量（10-100000）</p>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || (selectedTier === 'custom' && (parseInt(customCredits || '0') < 10))}
                className={`w-full px-4 py-2.5 bg-[#10B981] text-[#040D0A] font-bold text-sm border border-[#142D24] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all rounded-lg ${
                  isGenerating || (selectedTier === 'custom' && (parseInt(customCredits || '0') < 10))
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                }`}
              >
                {isGenerating ? '生成中...' : `生成 ${count} 张卡密`}
              </button>
            </div>

            <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-3">生成数量</h3>
              
              <div className="flex items-center gap-3 mb-3">
                <button
                  onClick={() => setCount(Math.max(1, parseInt(count || '1') - 1).toString())}
                  disabled={isGenerating || parseInt(count || '1') <= 1}
                  className="w-10 h-10 bg-[#040D0A] border border-[#142D24] text-white font-bold text-lg hover:border-[#10B981] transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -
                </button>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  min="1"
                  max="100"
                  className="flex-1 px-3 py-2 bg-[#040D0A] border border-[#142D24] text-white text-center font-bold text-lg focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] focus:outline-none rounded-lg"
                />
                <button
                  onClick={() => setCount(Math.min(100, parseInt(count || '1') + 1).toString())}
                  disabled={isGenerating || parseInt(count || '1') >= 100}
                  className="w-10 h-10 bg-[#040D0A] border border-[#142D24] text-white font-bold text-lg hover:border-[#10B981] transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +
                </button>
              </div>

              <div className="p-3 bg-[#040D0A] border border-[#142D24] rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500">单张卡密积分</span>
                  <span className="text-sm font-bold text-[#10B981]">{getCurrentCredits()} 积分</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">本次总计积分</span>
                  <span className="text-lg font-bold text-white">{getCurrentCredits() * parseInt(count || '1')} 积分</span>
                </div>
              </div>

              <div className="mt-3 p-2.5 bg-[#040D0A] border border-[#142D24] rounded-lg">
                <p className="text-[#10B981] text-xs">
                  <span className="font-bold">💡 提示：</span><br />
                  • 批量生成支持1-100张卡密<br />
                  • 生成后可一键复制全部<br />
                  • 每张卡密独立唯一
                </p>
              </div>
            </div>
          </div>

          {generatedCards.length > 0 && (
            <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] p-5 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white">生成结果</h3>
                <button
                  onClick={handleCopyAll}
                  className="px-3 py-1.5 bg-[#10B981] text-[#040D0A] font-bold text-xs border border-[#142D24] shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all rounded-lg"
                >
                  📋 一键复制全部
                </button>
              </div>

              <textarea
                ref={textareaRef}
                readOnly
                value={generatedCards.map(c => `${c.code} | ${c.credits}积分`).join('\n')}
                className="w-full h-48 px-3 py-2 bg-[#040D0A] border border-[#142D24] text-white text-sm font-mono focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] focus:outline-none resize-none rounded-lg"
              />

              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {generatedCards.map((card, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-[#040D0A] border border-[#142D24] rounded-lg hover:border-[#10B981] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-6">#{index + 1}</span>
                      <span className="text-sm font-mono text-white">{card.code}</span>
                      <span className="text-xs text-[#10B981]">{card.credits}积分</span>
                    </div>
                    <button
                      onClick={() => handleCopySingle(card.code)}
                      className="px-2 py-1 text-xs text-gray-500 hover:text-white transition-colors"
                    >
                      复制
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
              href="/dashboard"
              className="flex-1 px-4 py-2.5 bg-[#091511] text-white font-bold text-center text-sm border border-[#142D24] hover:border-[#10B981] hover:text-[#10B981] transition-all rounded-lg"
            >
              返回创作
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}