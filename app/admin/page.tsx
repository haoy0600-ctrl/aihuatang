'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TermsModal } from '@/components/TermsModal'
import { isAdminEmail } from '@/lib/auth'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

interface User {
  id: string
  email: string
  credits: number
  created_at: string
  banned?: boolean
  vip_level?: number
  username?: string | null
  generationCount?: number
  totalImages?: number
  usedModels?: Record<string, number>
}

interface QueueItem {
  id: string
  user_id: string
  prompt: string
  status: string
  created_at: string
}

interface GenerationRecord {
  id: string
  user_id: string
  model: string
  resolution: string
  image_count: number
  status: string
  created_at: string
  userEmail?: string
  username?: string | null
}

interface Stats {
  totalUsers: number
  totalGenerations: number
  totalConsumed: number
  successRate: string
  queueCount: number
  queue: QueueItem[]
  modelStats: Record<string, { count: number; totalImages: number }>
  resolutionStats: Record<string, { count: number; totalImages: number }>
  recentGenerations: GenerationRecord[]
  topUsers: User[]
  activeUsers: number
}

type TabKey = 'dashboard' | 'users'

export default function AdminPage() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditAction, setCreditAction] = useState<'add' | 'subtract'>('add')
  const [showTermsModal, setShowTermsModal] = useState(false)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const session = getStoredSession()
      if (!session) {
        router.push('/login')
        return
      }

      if (!isAdminEmail(session.email)) {
        router.push('/')
        return
      }

      setUser({ email: session.email })

      try {
        const [statsResponse, usersResponse] = await Promise.all([
          fetch('/api/admin/stats', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({}),
          }),
          fetch('/api/admin/users', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({}),
          }),
        ])

        const statsData = await statsResponse.json()
        const usersData = await usersResponse.json()

        if (statsData.success) {
          setStats(statsData.stats)
        }

        if (usersData.success) {
          setUsers(usersData.users)
        }
      } catch (fetchError) {
        console.error('Fetch admin data error:', fetchError)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const timer = setInterval(fetchData, 30000)
    return () => clearInterval(timer)
  }, [router])

  const selectedUser = useMemo(
    () => users.find((item) => item.id === selectedUserId) || null,
    [selectedUserId, users],
  )

  const handleCreditAction = async () => {
    if (!selectedUserId) return
    if (creditAmount <= 0) {
      alert('积分数量必须大于 0')
      return
    }

    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        userId: selectedUserId,
        action: creditAction === 'add' ? 'add_credits' : 'subtract_credits',
        amount: creditAmount,
      }),
    })

    const data = await response.json()

    if (data.success) {
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === selectedUserId ? { ...item, credits: data.newCredits } : item)),
      )
      setShowCreditModal(false)
      alert(data.message)
      return
    }

    alert(data.error || '操作失败')
  }

  const handleToggleStatus = async (userId: string) => {
    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        userId,
        action: 'toggle_status',
      }),
    })

    const data = await response.json()

    if (data.success) {
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === userId ? { ...item, banned: data.banned } : item)),
      )
      alert(data.message)
      return
    }

    alert(data.error || '操作失败')
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`确定要删除用户“${email}”吗？此操作不可恢复。`)) {
      return
    }

    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        userId,
        action: 'delete',
      }),
    })

    const data = await response.json()

    if (data.success) {
      setUsers((currentUsers) => currentUsers.filter((item) => item.id !== userId))
      alert(data.message)
      return
    }

    alert(data.error || '删除失败')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN')
  }

  const handleLogout = () => {
    clearStoredSession()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#00F2FE] border border-[#00F2FE] mx-auto mb-4 animate-pulse rounded-lg" />
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
                <img src="/logo.png?v=6" alt="AI画堂" className="h-16 w-16 object-contain" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">后台管理系统</h1>
                <p className="text-xs text-[#00F2FE]">管理员专属控制台</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-2">
              <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
                数据看板
              </TabButton>
              <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                用户管理
              </TabButton>
              <Link href="/admin/cards" className="px-3 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                卡密管理
              </Link>
              <Link
                href="/admin/announcements"
                className="px-3 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                公告管理
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#00F2FE]">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-[#141923] border border-[#202B3A] flex items-center justify-center hover:border-[#00F2FE] transition-colors rounded-lg"
                >
                  <span className="text-white font-bold text-sm">AD</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-52 bg-[#141923] border border-[#202B3A] shadow-lg z-50 rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-[#202B3A]">
                      <p className="text-xs text-[#00F2FE] mb-1">管理员账号</p>
                      <p className="text-sm text-white font-medium truncate">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
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
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
                <MetricCard label="总用户数" value={stats?.totalUsers || 0} accent="text-white" />
                <MetricCard label="总生成次数" value={stats?.totalGenerations || 0} accent="text-white" />
                <MetricCard label="累计消耗积分" value={stats?.totalConsumed || 0} accent="text-[#00F2FE]" />
                <MetricCard label="生成成功率" value={`${stats?.successRate || 0}%`} accent="text-[#10B981]" />
                <MetricCard label="处理中任务" value={stats?.queueCount || 0} accent="text-yellow-400" />
                <MetricCard label="近 7 天活跃用户" value={stats?.activeUsers || 0} accent="text-amber-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <StatPanel title="模型使用统计">
                  {Object.entries(stats?.modelStats || {}).length > 0 ? (
                    Object.entries(stats?.modelStats || {}).map(([model, data]) => (
                      <ProgressRow
                        key={model}
                        label={model}
                        value={`${data.count} 次 / ${data.totalImages} 张`}
                        percent={(data.count / (stats?.totalGenerations || 1)) * 100}
                        gradient="from-[#00F2FE] to-[#10B981]"
                      />
                    ))
                  ) : (
                    <EmptyState text="暂无模型数据" />
                  )}
                </StatPanel>

                <StatPanel title="分辨率分布">
                  {Object.entries(stats?.resolutionStats || {}).length > 0 ? (
                    Object.entries(stats?.resolutionStats || {}).map(([resolution, data]) => {
                      const colors: Record<string, string> = {
                        '1K': 'from-blue-500 to-blue-400',
                        '2K': 'from-purple-500 to-purple-400',
                        '4K': 'from-amber-500 to-amber-400',
                      }

                      return (
                        <ProgressRow
                          key={resolution}
                          label={resolution}
                          value={`${data.count} 次 / ${data.totalImages} 张`}
                          percent={(data.count / (stats?.totalGenerations || 1)) * 100}
                          gradient={colors[resolution] || 'from-gray-500 to-gray-400'}
                        />
                      )
                    })
                  ) : (
                    <EmptyState text="暂无分辨率数据" />
                  )}
                </StatPanel>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <StatPanel title="最近生成记录">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stats?.recentGenerations && stats.recentGenerations.length > 0 ? (
                      stats.recentGenerations.map((item) => (
                        <div key={item.id} className="bg-[#0B0D17] border border-[#202B3A] p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[#00F2FE] font-medium">{item.model}</span>
                            <span
                              className={`text-xs font-bold ${
                                item.status === 'success'
                                  ? 'text-[#10B981]'
                                  : item.status === 'failed'
                                    ? 'text-red-400'
                                    : 'text-yellow-400'
                              }`}
                            >
                              {item.status === 'success' ? '成功' : item.status === 'failed' ? '失败' : '处理中'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1">
                            <span>
                              {item.resolution} / {item.image_count} 张
                            </span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                          <div className="text-xs text-amber-400 truncate">
                            用户：{item.username || item.userEmail || '未知'}
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="暂无记录" />
                    )}
                  </div>
                </StatPanel>

                <StatPanel title="活跃用户排行（TOP 10）">
                  <div className="space-y-2">
                    {stats?.topUsers && stats.topUsers.length > 0 ? (
                      stats.topUsers.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-3 bg-[#0B0D17] border border-[#202B3A] p-3 rounded-lg">
                          <span
                            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                              index === 0
                                ? 'bg-amber-500 text-black'
                                : index === 1
                                  ? 'bg-gray-400 text-black'
                                  : index === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-[#202B3A] text-white'
                            }`}
                          >
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{item.username || item.email}</p>
                            <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                              <span>{formatDate(item.created_at)} 注册</span>
                              <span className="text-[#10B981]">|</span>
                              <span className="text-[#00F2FE]">生成 {item.generationCount || 0} 次</span>
                              <span className="text-[#10B981]">|</span>
                              <span className="text-amber-400">{item.totalImages || 0} 张</span>
                            </div>
                            {item.usedModels && Object.keys(item.usedModels).length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {Object.entries(item.usedModels).slice(0, 3).map(([model, count]) => (
                                  <span
                                    key={model}
                                    className="px-1.5 py-0.5 bg-[#202B3A] text-[10px] text-[#00F2FE] rounded"
                                  >
                                    {model} x{count}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-[#00F2FE]">{item.credits} 积分</span>
                            {item.vip_level && item.vip_level > 0 && (
                              <div className="text-[10px] text-amber-400">VIP Lv.{item.vip_level}</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState text="暂无排行数据" />
                    )}
                  </div>
                </StatPanel>
              </div>

              <StatPanel title="实时生成队列监控">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-[#94A3B8]">当前待处理任务</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-bold ${
                      stats?.queueCount && stats.queueCount > 0
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-[#10B981]/20 text-[#10B981]'
                    }`}
                  >
                    {stats?.queueCount || 0} 个任务
                  </span>
                </div>

                {stats?.queue && stats.queue.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.queue.map((item) => (
                      <div key={item.id} className="bg-[#0B0D17] border border-[#202B3A] p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[#00F2FE]">任务 {item.id.substring(0, 8)}</span>
                          <span className="text-xs text-yellow-400">处理中</span>
                        </div>
                        <p className="text-sm text-white truncate">{item.prompt.substring(0, 50)}...</p>
                        <p className="text-[10px] text-[#475569] mt-1">{formatDate(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="当前没有正在处理的任务" />
                )}
              </StatPanel>
            </>
          )}

          {activeTab === 'users' && (
            <div className="bg-[#141923] border border-[#202B3A] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-[#202B3A]">
                <h3 className="text-lg font-bold text-white">用户管理</h3>
                <p className="text-xs text-[#94A3B8] mt-1">共 {users.length} 个用户</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#0B0D17]">
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">用户 ID</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">用户名 / 邮箱</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">积分</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">生成次数</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">常用模型</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">VIP 等级</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">注册时间</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">状态</th>
                      <th className="px-4 py-3 text-left text-xs text-[#94A3B8] font-bold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id} className="border-t border-[#202B3A] hover:bg-[#1a2230]">
                        <td className="px-4 py-3 text-sm text-[#94A3B8] font-mono">{item.id.substring(0, 12)}...</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-white">{item.username || item.email}</p>
                          {item.username && item.email && <p className="text-xs text-[#94A3B8]">{item.email}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-[#00F2FE]">{item.credits}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-[#10B981]">{item.generationCount || 0} 次</span>
                        </td>
                        <td className="px-4 py-3">
                          {item.usedModels && Object.keys(item.usedModels).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(item.usedModels).slice(0, 2).map(([model, count]) => (
                                <span key={model} className="px-1.5 py-0.5 bg-[#202B3A] text-[10px] text-[#00F2FE] rounded">
                                  {model} x{count}
                                </span>
                              ))}
                              {Object.keys(item.usedModels).length > 2 && (
                                <span className="text-[10px] text-[#94A3B8]">+{Object.keys(item.usedModels).length - 2}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#64748B]">暂无</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.vip_level && item.vip_level > 0 ? (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-bold rounded">
                              VIP Lv.{item.vip_level}
                            </span>
                          ) : (
                            <span className="text-xs text-[#64748B]">普通</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{formatDate(item.created_at)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              item.banned
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-[#10B981]/20 text-[#10B981]'
                            }`}
                          >
                            {item.banned ? '已禁用' : '正常'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                setSelectedUserId(item.id)
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
                                setSelectedUserId(item.id)
                                setCreditAction('subtract')
                                setCreditAmount(10)
                                setShowCreditModal(true)
                              }}
                              className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold border border-yellow-500/50 hover:bg-yellow-500/30 transition-all rounded"
                            >
                              -积分
                            </button>
                            <button
                              onClick={() => handleToggleStatus(item.id)}
                              className={`px-2 py-1 text-xs font-bold border transition-all rounded ${
                                item.banned
                                  ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50'
                                  : 'bg-red-500/20 text-red-400 border-red-500/50'
                              }`}
                            >
                              {item.banned ? '解禁' : '禁用'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(item.id, item.email)}
                              className="px-2 py-1 bg-red-600/20 text-red-500 text-xs font-bold border border-red-600/50 hover:bg-red-600/30 transition-all rounded"
                            >
                              删除
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
        </div>
      </main>

      {showCreditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#141923] border border-[#202B3A] rounded-xl">
            <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                {creditAction === 'add' ? '增加积分' : '扣除积分'}
              </h3>
              {selectedUser && (
                <p className="text-sm text-[#94A3B8] mb-4">
                  当前用户：<span className="text-white">{selectedUser.username || selectedUser.email}</span>
                </p>
              )}
              <div className="mb-6">
                <label className="block text-xs text-[#94A3B8] mb-2">积分数量</label>
                <input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(Number(event.target.value))}
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

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />

      <footer className="fixed bottom-0 left-0 right-0 py-2.5 bg-[#030712]/95 border-t border-[#1e293b]/50 backdrop-blur-sm z-40">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            使用本站即表示你同意
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-[#10B981] hover:text-[#00F2FE] font-semibold underline underline-offset-2 decoration-[#10B981]/50 hover:decoration-[#00F2FE] transition-all duration-300 rounded px-1"
            >
              《安全合规与使用须知》
            </button>
          </p>
        </div>
      </footer>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 font-bold text-sm border transition-all rounded-lg ${
        active
          ? 'bg-[#00F2FE] text-[#0A0F1D] border-[#00F2FE]'
          : 'bg-[#141923] text-white border-[#202B3A] hover:border-[#00F2FE]'
      }`}
    >
      {children}
    </button>
  )
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string | number
  accent: string
}) {
  return (
    <div className="bg-[#141923] border border-[#202B3A] p-4 rounded-xl">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      <p className={`text-3xl font-bold mt-3 ${accent}`}>{value}</p>
    </div>
  )
}

function StatPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141923] border border-[#202B3A] p-4 rounded-xl">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      {children}
    </div>
  )
}

function ProgressRow({
  label,
  value,
  percent,
  gradient,
}: {
  label: string
  value: string
  percent: number
  gradient: string
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white font-medium">{label}</span>
        <span className="text-[#94A3B8]">{value}</span>
      </div>
      <div className="h-2 bg-[#0B0D17] rounded-full overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${gradient}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-center py-4 text-[#94A3B8]">{text}</div>
}
