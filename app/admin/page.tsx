'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  credits: number
  created_at: string
  is_active?: boolean
}

interface QueueItem {
  id: string
  user_id: string
  prompt: string
  status: string
  created_at: string
}

interface Stats {
  totalUsers: number
  totalGenerations: number
  totalConsumed: number
  successRate: string
  queueCount: number
  queue: QueueItem[]
}

export default function AdminPage() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [cardCount, setCardCount] = useState(10)
  const [cardCredits, setCardCredits] = useState(10)
  const [generatedCards, setGeneratedCards] = useState<string[]>([])
  const [showCardResult, setShowCardResult] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState(0)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditAction, setCreditAction] = useState<'add' | 'subtract'>('add')

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
    const fetchData = async () => {
      const storedSession = localStorage.getItem('ai_handdrawn_login_session')
      if (!storedSession) {
        router.push('/login')
        return
      }

      let session: any
      try {
        session = JSON.parse(storedSession)
      } catch {
        router.push('/login')
        return
      }

      if (!session.email || session.email !== '50923561@qq.com') {
        router.push('/')
        return
      }

      setUser({ email: session.email })

      try {
        const [statsResponse, usersResponse] = await Promise.all([
          fetch('/api/admin/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: session.email })
          }),
          fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: session.email })
          })
        ])

        const statsData = await statsResponse.json()
        const usersData = await usersResponse.json()

        if (statsData.success) {
          setStats(statsData.stats)
        }

        if (usersData.success) {
          setUsers(usersData.users)
        }
      } catch (error) {
        console.error('Fetch admin data error:', error)
      }

      setLoading(false)
    }

    fetchData()

    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [router])

  const handleGenerateCards = async () => {
    if (cardCount <= 0 || cardCount > 100) {
      alert('生成数量必须在1-100之间')
      return
    }
    if (cardCredits <= 0) {
      alert('卡密积分必须大于0')
      return
    }

    const response = await fetch('/api/admin/generate-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: user?.email,
        count: cardCount,
        credits: cardCredits
      })
    })

    const data = await response.json()

    if (data.success) {
      setGeneratedCards(data.cards.map((c: any) => `${c.code} (${c.credits}积分)`))
      setShowCardResult(true)
    } else {
      alert(data.error || '生成失败')
    }
  }

  const handleCopyCards = async () => {
    await navigator.clipboard.writeText(generatedCards.join('\n'))
    alert('卡密列表已复制到剪贴板！')
  }

  const handleCreditAction = async () => {
    if (!selectedUserId) return
    if (creditAmount <= 0) {
      alert('积分数量必须大于0')
      return
    }

    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: user?.email,
        userId: selectedUserId,
        action: creditAction === 'add' ? 'add_credits' : 'subtract_credits',
        amount: creditAmount
      })
    })

    const data = await response.json()

    if (data.success) {
      setUsers(users.map(u => 
        u.id === selectedUserId ? { ...u, credits: data.newCredits } : u
      ))
      setShowCreditModal(false)
      alert(data.message)
    } else {
      alert(data.error || '操作失败')
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminEmail: user?.email,
        userId: userId,
        action: 'toggle_status'
      })
    })

    const data = await response.json()

    if (data.success) {
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_active: data.isActive } : u
      ))
      alert(data.message)
    } else {
      alert(data.error || '操作失败')
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#00F2FE] border border-[#00F2FE] mx-auto mb-4 animate-pulse"></div>
          <p className="text-[#00F2FE]">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0D17]">
      <header className="bg-[#0B0D17] border-b border-[#202B3A]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full py-2 sm:py-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center select-none hover:opacity-80 transition-opacity">
                <img 
                  src="/logo.png?v=6" 
                  alt="AI画堂" 
                  className="h-16 w-16 object-contain"
                />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">🔧 后台管理系统</h1>
                <p className="text-xs text-[#00F2FE]">管理员专属控制台</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              {[
                { key: 'dashboard', label: '数据看板' },
                { key: 'users', label: '用户管理' },
                { key: 'cards', label: '卡密管理' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 font-bold text-sm border transition-all rounded-lg ${
                    activeTab === tab.key
                      ? 'bg-[#00F2FE] text-[#0A0F1D] border-[#00F2FE]'
                      : 'bg-[#141923] text-white border-[#202B3A] hover:border-[#00F2FE]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#00F2FE]">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-[#141923] border border-[#202B3A] flex items-center justify-center hover:border-[#00F2FE] transition-colors rounded-lg"
                >
                  <span className="text-white font-bold text-sm">AD</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 bg-[#141923] border border-[#202B3A] shadow-lg z-50 rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-[#202B3A]">
                      <p className="text-xs text-[#00F2FE] mb-1">管理员账号</p>
                      <p className="text-sm text-white font-medium truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { localStorage.removeItem('ai_handdrawn_login_session'); window.location.href = '/login'; }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#1a2230] transition-colors rounded-lg"
                      >
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 pb-24">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#141923] border border-[#202B3A] p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#94A3B8]">总用户数</span>
                    <span className="text-2xl">👥</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats?.totalUsers || 0}</p>
                </div>
                <div className="bg-[#141923] border border-[#202B3A] p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#94A3B8]">总生成数</span>
                    <span className="text-2xl">🎨</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{stats?.totalGenerations || 0}</p>
                </div>
                <div className="bg-[#141923] border border-[#202B3A] p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#94A3B8]">累计消耗积分</span>
                    <span className="text-2xl">⚡</span>
                  </div>
                  <p className="text-3xl font-bold text-[#00F2FE]">{stats?.totalConsumed || 0}</p>
                </div>
                <div className="bg-[#141923] border border-[#202B3A] p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-[#94A3B8]">生成成功率</span>
                    <span className="text-2xl">✅</span>
                  </div>
                  <p className="text-3xl font-bold text-[#10B981]">{stats?.successRate}%</p>
                </div>
              </div>

              <div className="bg-[#141923] border border-[#202B3A] p-4 rounded-xl mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">📊 实时生成队列监控</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    stats?.queueCount && stats.queueCount > 0 
                      ? 'bg-yellow-500/20 text-yellow-400' 
                      : 'bg-[#10B981]/20 text-[#10B981]'
                  }`}>
                    {stats?.queueCount || 0} 个任务
                  </span>
                </div>
                {stats?.queue && stats.queue.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stats.queue.map((item) => (
                      <div key={item.id} className="bg-[#0B0D17] border border-[#202B3A] p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#00F2FE]">任务 {item.id.substring(0, 8)}</span>
                          <span className="text-xs text-yellow-400">⏳ 处理中</span>
                        </div>
                        <p className="text-sm text-white truncate">{item.prompt.substring(0, 50)}...</p>
                        <p className="text-[10px] text-[#475569] mt-1">{formatDate(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#94A3B8]">
                    <span className="text-3xl mb-2 block">🎉</span>
                    <p>当前没有正在处理的任务</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'users' && (
            <div className="bg-[#141923] border border-[#202B3A] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#202B3A]">
                <h3 className="text-lg font-bold text-white">👥 用户管理</h3>
                <p className="text-xs text-[#94A3B8] mt-1">共 {users.length} 个用户</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#0B0D17]">
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">用户ID</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">邮箱</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">积分</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">注册时间</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">状态</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-[#202B3A] hover:bg-[#1a2230]">
                        <td className="px-4 py-3 text-sm text-[#94A3B8] font-mono">
                          {user.id.substring(0, 12)}...
                        </td>
                        <td className="px-4 py-3 text-sm text-white">{user.email}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-[#00F2FE]">{user.credits}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{formatDate(user.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            user.is_active === false 
                              ? 'bg-red-500/20 text-red-400' 
                              : 'bg-[#10B981]/20 text-[#10B981]'
                          }`}>
                            {user.is_active === false ? '已禁用' : '正常'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedUserId(user.id)
                                setCreditAction('add')
                                setCreditAmount(10)
                                setShowCreditModal(true)
                              }}
                              className="px-2 py-1 bg-[#10B981]/20 text-[#10B981] text-xs font-bold border border-[#10B981]/50 hover:bg-[#10B981]/30 transition-all rounded"
                            >
                              +积分
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserId(user.id)
                                setCreditAction('subtract')
                                setCreditAmount(10)
                                setShowCreditModal(true)
                              }}
                              className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/50 hover:bg-yellow-500/30 transition-all rounded"
                            >
                              -积分
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user.id, user.is_active !== false)}
                              className={`px-2 py-1 text-xs font-bold border transition-all rounded ${
                                user.is_active === false
                                  ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50'
                                  : 'bg-red-500/20 text-red-400 border-red-500/50'
                              }`}
                            >
                              {user.is_active === false ? '解禁' : '禁用'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="bg-[#141923] border border-[#202B3A] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#202B3A]">
                <h3 className="text-lg font-bold text-white">🔑 卡密一键生成</h3>
                <p className="text-xs text-[#94A3B8] mt-1">批量生成随机卡密</p>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-2">生成数量</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={cardCount}
                      onChange={(e) => setCardCount(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-[#0B0D17] border border-[#202B3A] text-white text-sm focus:border-[#00F2FE] focus:outline-none rounded-lg"
                    />
                    <p className="text-[10px] text-[#475569] mt-1">1-100之间</p>
                  </div>
                  <div>
                    <label className="block text-xs text-[#94A3B8] mb-2">单张卡密积分</label>
                    <input
                      type="number"
                      min="1"
                      value={cardCredits}
                      onChange={(e) => setCardCredits(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-[#0B0D17] border border-[#202B3A] text-white text-sm focus:border-[#00F2FE] focus:outline-none rounded-lg"
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerateCards}
                  className="w-full py-3 bg-[#00F2FE] text-[#0A0F1D] font-bold text-sm hover:bg-[#33f5ff] transition-all rounded-lg"
                >
                  🚀 开始生成卡密
                </button>

                {showCardResult && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white">生成结果</h4>
                      <button
                        onClick={() => {
                          setShowCardResult(false)
                          setGeneratedCards([])
                        }}
                        className="text-xs text-[#94A3B8] hover:text-white"
                      >
                        关闭
                      </button>
                    </div>
                    <div className="bg-[#0B0D17] border border-[#202B3A] p-4 rounded-lg max-h-64 overflow-y-auto mb-3">
                      {generatedCards.map((card, index) => (
                        <p key={index} className="text-sm text-[#00F2FE] font-mono mb-1">
                          {card}
                        </p>
                      ))}
                    </div>
                    <button
                      onClick={handleCopyCards}
                      className="w-full py-2 bg-[#10B981]/20 text-[#10B981] font-bold text-sm border border-[#10B981]/50 hover:bg-[#10B981]/30 transition-all rounded-lg"
                    >
                      📋 一键复制所有卡密
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {showCreditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#141923] border border-[#202B3A] rounded-xl">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                {creditAction === 'add' ? '➕ 增加积分' : '➖ 扣除积分'}
              </h3>
              <div className="mb-6">
                <label className="block text-xs text-[#94A3B8] mb-2">积分数量</label>
                <input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-[#0B0D17] border border-[#202B3A] text-white text-sm focus:border-[#00F2FE] focus:outline-none rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreditModal(false)}
                  className="flex-1 py-2 bg-[#0B0D17] border border-[#202B3A] text-white font-bold text-sm hover:border-[#00F2FE] transition-all rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleCreditAction}
                  className={`flex-1 py-2 font-bold text-sm transition-all rounded-lg ${
                    creditAction === 'add'
                      ? 'bg-[#10B981] text-[#0A0F1D]'
                      : 'bg-yellow-500 text-black'
                  }`}
                >
                  确认操作
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}