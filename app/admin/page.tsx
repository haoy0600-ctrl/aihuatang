'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
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
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D17]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-pulse rounded-lg border border-[#00F2FE] bg-[#00F2FE]" />
          <p className="text-[#00F2FE]">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0D17]">
      <header className="border-b border-[#202B3A] bg-[#0B0D17]">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-2 sm:py-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center select-none transition-opacity hover:opacity-80">
                <img src="/logo.png?v=6" alt="AI画堂" className="h-16 w-16 object-contain" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">后台管理系统</h1>
                <p className="text-xs text-[#00F2FE]">管理员专属控制台</p>
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
                数据看板
              </TabButton>
              <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                用户管理
              </TabButton>
              <Link href="/admin/cards" className="px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                卡密管理
              </Link>
              <Link href="/admin/announcements" className="px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
                公告管理
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 text-xs text-[#00F2FE] sm:flex">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="font-mono text-sm font-bold text-white">{currentTime}</span>
              </div>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#202B3A] bg-[#141923] transition-colors hover:border-[#00F2FE] sm:h-9 sm:w-9"
                >
                  <span className="text-sm font-bold text-white">AD</span>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-[#202B3A] bg-[#141923] shadow-lg">
                    <div className="border-b border-[#202B3A] p-3">
                      <p className="mb-1 text-xs text-[#00F2FE]">管理员账号</p>
                      <p className="truncate text-sm font-medium text-white">{user?.email}</p>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-[#1a2230]"
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
        <div className="mx-auto max-w-7xl">
          {activeTab === 'dashboard' && (
            <>
              <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-6">
                <MetricCard label="总用户数" value={stats?.totalUsers || 0} accent="text-white" />
                <MetricCard label="总生成次数" value={stats?.totalGenerations || 0} accent="text-white" />
                <MetricCard label="累计消耗积分" value={stats?.totalConsumed || 0} accent="text-[#00F2FE]" />
                <MetricCard label="生成成功率" value={`${stats?.successRate || 0}%`} accent="text-[#10B981]" />
                <MetricCard label="处理中任务" value={stats?.queueCount || 0} accent="text-yellow-400" />
                <MetricCard label="近 7 天活跃用户" value={stats?.activeUsers || 0} accent="text-amber-500" />
              </div>

              <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
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

              <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <StatPanel title="最近生成记录">
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {stats?.recentGenerations && stats.recentGenerations.length > 0 ? (
                      stats.recentGenerations.map((item) => (
                        <div key={item.id} className="rounded-lg border border-[#202B3A] bg-[#0B0D17] p-3">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-[#00F2FE]">{item.model}</span>
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
                          <div className="mb-1 flex items-center justify-between text-xs text-[#94A3B8]">
                            <span>
                              {item.resolution} / {item.image_count} 张
                            </span>
                            <span>{formatDate(item.created_at)}</span>
                          </div>
                          <div className="truncate text-xs text-amber-400">
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
                        <div key={item.id} className="flex items-center gap-3 rounded-lg border border-[#202B3A] bg-[#0B0D17] p-3">
                          <span
                            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
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
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-white">{item.username || item.email}</p>
                            <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                              <span>{formatDate(item.created_at)} 注册</span>
                              <span className="text-[#10B981]">|</span>
                              <span className="text-[#00F2FE]">生成 {item.generationCount || 0} 次</span>
                              <span className="text-[#10B981]">|</span>
                              <span className="text-amber-400">{item.totalImages || 0} 张</span>
                            </div>
                            {item.usedModels && Object.keys(item.usedModels).length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {Object.entries(item.usedModels).slice(0, 3).map(([model, count]) => (
                                  <span key={model} className="rounded bg-[#202B3A] px-1.5 py-0.5 text-[10px] text-[#00F2FE]">
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
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-[#94A3B8]">当前待处理任务</span>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      stats?.queueCount && stats.queueCount > 0
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-[#10B981]/20 text-[#10B981]'
                    }`}
                  >
                    {stats?.queueCount || 0} 个任务
                  </span>
                </div>

                {stats?.queue && stats.queue.length > 0 ? (
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {stats.queue.map((item) => (
                      <div key={item.id} className="rounded-lg border border-[#202B3A] bg-[#0B0D17] p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs text-[#00F2FE]">任务 {item.id.substring(0, 8)}</span>
                          <span className="text-xs text-yellow-400">处理中</span>
                        </div>
                        <p className="truncate text-sm text-white">{item.prompt.substring(0, 50)}...</p>
                        <p className="mt-1 text-[10px] text-[#475569]">{formatDate(item.created_at)}</p>
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
            <div className="overflow-hidden rounded-xl border border-[#202B3A] bg-[#141923]">
              <div className="border-b border-[#202B3A] p-4">
                <h3 className="text-lg font-bold text-white">用户管理</h3>
                <p className="mt-1 text-xs text-[#94A3B8]">共 {users.length} 个用户</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#0B0D17]">
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">用户 ID</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">用户名 / 邮箱</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">积分</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">生成次数</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">常用模型</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">VIP 等级</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">注册时间</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">状态</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-[#94A3B8]">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((item) => (
                      <tr key={item.id} className="border-t border-[#202B3A] hover:bg-[#1a2230]">
                        <td className="px-4 py-3 font-mono text-sm text-[#94A3B8]">{item.id.substring(0, 12)}...</td>
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
                                <span key={model} className="rounded bg-[#202B3A] px-1.5 py-0.5 text-[10px] text-[#00F2FE]">
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
                            <span className="rounded bg-amber-500/20 px-2 py-1 text-xs font-bold text-amber-400">
                              VIP Lv.{item.vip_level}
                            </span>
                          ) : (
                            <span className="text-xs text-[#64748B]">普通</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#94A3B8]">{formatDate(item.created_at)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-1 text-xs font-bold ${
                              item.banned ? 'bg-red-500/20 text-red-400' : 'bg-[#10B981]/20 text-[#10B981]'
                            }`}
                          >
                            {item.banned ? '已禁用' : '正常'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedUserId(item.id)
                                setCreditAction('add')
                                setCreditAmount(10)
                                setShowCreditModal(true)
                              }}
                              className="rounded border border-[#10B981]/50 bg-[#10B981]/20 px-2 py-1 text-xs font-bold text-[#10B981] transition-all hover:bg-[#10B981]/30"
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
                              className="rounded border border-yellow-500/50 bg-yellow-500/20 px-2 py-1 text-xs font-bold text-yellow-400 transition-all hover:bg-yellow-500/30"
                            >
                              -积分
                            </button>
                            <button
                              onClick={() => handleToggleStatus(item.id)}
                              className={`rounded border px-2 py-1 text-xs font-bold transition-all ${
                                item.banned
                                  ? 'border-[#10B981]/50 bg-[#10B981]/20 text-[#10B981]'
                                  : 'border-red-500/50 bg-red-500/20 text-red-400'
                              }`}
                            >
                              {item.banned ? '解禁' : '禁用'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(item.id, item.email)}
                              className="rounded border border-red-600/50 bg-red-600/20 px-2 py-1 text-xs font-bold text-red-500 transition-all hover:bg-red-600/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#202B3A] bg-[#141923]">
            <div className="p-6">
              <h3 className="mb-4 text-lg font-bold text-white">
                {creditAction === 'add' ? '增加积分' : '扣除积分'}
              </h3>
              {selectedUser && (
                <p className="mb-4 text-sm text-[#94A3B8]">
                  当前用户：<span className="text-white">{selectedUser.username || selectedUser.email}</span>
                </p>
              )}
              <div className="mb-6">
                <label className="mb-2 block text-xs text-[#94A3B8]">积分数量</label>
                <input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(event) => setCreditAmount(Number(event.target.value))}
                  className="w-full rounded-lg border border-[#202B3A] bg-[#0B0D17] px-4 py-2 text-sm text-white outline-none focus:border-[#00F2FE]"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreditModal(false)}
                  className="flex-1 rounded-lg border border-[#202B3A] bg-[#0B0D17] py-2 text-sm font-bold text-white transition-all hover:border-[#00F2FE]"
                >
                  取消
                </button>
                <button
                  onClick={handleCreditAction}
                  className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                    creditAction === 'add' ? 'bg-[#10B981] text-[#0A0F1D]' : 'bg-yellow-500 text-black'
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

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1e293b]/50 bg-[#030712]/95 py-2.5 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 text-center">
          <p className="text-sm text-gray-400">
            使用本站即表示你同意
            <button
              onClick={() => setShowTermsModal(true)}
              className="rounded px-1 font-semibold text-[#10B981] underline decoration-[#10B981]/50 underline-offset-2 transition-all duration-300 hover:text-[#00F2FE] hover:decoration-[#00F2FE]"
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
      className={`rounded-lg border px-4 py-2 text-sm font-bold transition-all ${
        active
          ? 'border-[#00F2FE] bg-[#00F2FE] text-[#0A0F1D]'
          : 'border-[#202B3A] bg-[#141923] text-white hover:border-[#00F2FE]'
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
    <div className="rounded-xl border border-[#202B3A] bg-[#141923] p-4">
      <span className="text-xs text-[#94A3B8]">{label}</span>
      <p className={`mt-3 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function StatPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#202B3A] bg-[#141923] p-4">
      <h3 className="mb-4 text-lg font-bold text-white">{title}</h3>
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
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-white">{label}</span>
        <span className="text-[#94A3B8]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#0B0D17]">
        <div className={`h-full bg-gradient-to-r ${gradient}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="py-4 text-center text-[#94A3B8]">{text}</div>
}
