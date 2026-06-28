'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'
import { isAdminEmail } from '@/lib/auth'

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

        if (statsData.success) setStats(statsData.stats)
        if (usersData.success) setUsers(usersData.users || [])
      } catch (error) {
        console.error('Fetch admin data error:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
    const timer = setInterval(() => void fetchData(), 30000)
    return () => clearInterval(timer)
  }, [router])

  const selectedUser = useMemo(() => users.find((item) => item.id === selectedUserId) || null, [selectedUserId, users])

  const handleCreditAction = async () => {
    if (!selectedUserId) return
    if (creditAmount <= 0) {
      alert('积分数量必须大于 0。')
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

    alert(data.error || '操作失败，请稍后重试。')
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

    alert(data.error || '操作失败，请稍后重试。')
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`确定要删除用户“${email}”吗？此操作不可恢复。`)) {
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

    alert(data.error || '删除失败，请稍后重试。')
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
    <div className="min-h-screen bg-[#0B0D17] pb-24">
      <header className="border-b border-[#202B3A] bg-[#0B0D17]">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex select-none items-center transition-opacity hover:opacity-80">
                <img src="/logo.svg?v=2" alt="AI画堂" className="h-16 w-16 object-contain" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">后台管理系统</h1>
                <p className="text-xs text-[#00F2FE]">管理员控制台</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs text-[#00F2FE]">{new Date().toLocaleDateString('zh-CN')}</p>
                <p className="font-mono text-sm font-bold text-white">{currentTime}</p>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-[#202B3A] px-4 py-2 text-sm text-white hover:border-[#EF4444] hover:text-[#EF4444]"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === 'dashboard' ? 'bg-[#00F2FE] text-[#0B0D17]' : 'bg-[#131826] text-white'
            }`}
          >
            数据看板
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              activeTab === 'users' ? 'bg-[#00F2FE] text-[#0B0D17]' : 'bg-[#131826] text-white'
            }`}
          >
            用户管理
          </button>
          <Link href="/admin/cards" className="rounded-xl bg-[#131826] px-4 py-2 text-sm font-semibold text-white">
            卡密管理
          </Link>
        </div>

        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard title="总用户" value={String(stats.totalUsers)} />
              <StatCard title="总生成次数" value={String(stats.totalGenerations)} />
              <StatCard title="累计消耗积分" value={String(stats.totalConsumed)} />
              <StatCard title="成功率" value={stats.successRate} />
              <StatCard title="活跃用户" value={String(stats.activeUsers)} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="最近生成记录">
                <div className="space-y-3">
                  {(stats.recentGenerations || []).slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#202B3A] bg-[#101522] p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.userEmail || item.username || item.user_id}</p>
                          <p className="mt-1 text-xs text-[#8AA0C2]">
                            {item.model} · {item.resolution} · {item.image_count} 张
                          </p>
                        </div>
                        <span className="rounded-full bg-[#00F2FE]/10 px-2 py-1 text-xs text-[#00F2FE]">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="队列状态">
                <div className="mb-4 rounded-xl border border-[#202B3A] bg-[#101522] p-4">
                  <p className="text-sm text-[#8AA0C2]">当前排队任务</p>
                  <p className="mt-2 text-3xl font-black text-white">{stats.queueCount}</p>
                </div>
                <div className="space-y-3">
                  {(stats.queue || []).slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-xl border border-[#202B3A] bg-[#101522] p-3 text-sm">
                      <p className="line-clamp-2 text-white">{item.prompt || '无提示词'}</p>
                      <p className="mt-2 text-xs text-[#8AA0C2]">{item.status}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="rounded-2xl border border-[#202B3A] bg-[#101522] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">用户管理</h2>
                <p className="text-sm text-[#8AA0C2]">查看、封禁、删号和调整积分。</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#202B3A] text-[#8AA0C2]">
                    <th className="px-3 py-3">用户</th>
                    <th className="px-3 py-3">积分</th>
                    <th className="px-3 py-3">生成次数</th>
                    <th className="px-3 py-3">状态</th>
                    <th className="px-3 py-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className="border-b border-[#182033] text-white/92">
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white">{item.username || item.email}</p>
                        <p className="mt-1 text-xs text-[#8AA0C2]">{item.email}</p>
                      </td>
                      <td className="px-3 py-3">{item.credits}</td>
                      <td className="px-3 py-3">{item.generationCount || 0}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${item.banned ? 'bg-red-500/15 text-red-300' : 'bg-emerald-500/15 text-emerald-300'}`}>
                          {item.banned ? '已封禁' : '正常'}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSelectedUserId(item.id)
                              setCreditAction('add')
                              setShowCreditModal(true)
                            }}
                            className="rounded-lg bg-[#00F2FE] px-3 py-1.5 text-xs font-semibold text-[#0B0D17]"
                          >
                            加积分
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserId(item.id)
                              setCreditAction('subtract')
                              setShowCreditModal(true)
                            }}
                            className="rounded-lg bg-[#F59E0B] px-3 py-1.5 text-xs font-semibold text-[#0B0D17]"
                          >
                            扣积分
                          </button>
                          <button
                            onClick={() => void handleToggleStatus(item.id)}
                            className="rounded-lg bg-[#131826] px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            {item.banned ? '解封' : '封禁'}
                          </button>
                          <button
                            onClick={() => void handleDeleteUser(item.id, item.email)}
                            className="rounded-lg bg-red-500/80 px-3 py-1.5 text-xs font-semibold text-white"
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
      </main>

      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#202B3A] bg-[#101522] p-6">
            <h3 className="text-lg font-bold text-white">{creditAction === 'add' ? '为用户加积分' : '为用户扣积分'}</h3>
            <p className="mt-2 text-sm text-[#8AA0C2]">{selectedUser.email}</p>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-[#8AA0C2]">积分数量</label>
              <input
                type="number"
                min={1}
                value={creditAmount}
                onChange={(event) => setCreditAmount(Number(event.target.value) || 0)}
                className="w-full rounded-xl border border-[#202B3A] bg-[#0B0D17] px-4 py-3 text-white outline-none focus:border-[#00F2FE]"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCreditAction}
                className="flex-1 rounded-xl bg-[#00F2FE] px-4 py-3 text-sm font-bold text-[#0B0D17]"
              >
                确认
              </button>
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 rounded-xl border border-[#202B3A] px-4 py-3 text-sm font-semibold text-white"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 border-t border-[#202B3A] bg-[#0B0D17]/95 py-3 text-center text-xs text-[#8AA0C2] backdrop-blur-xl">
        后台操作请谨慎执行 · 当前管理员：{user?.email}
        <button onClick={() => setShowTermsModal(true)} className="ml-2 text-[#00F2FE] underline underline-offset-2">
          使用须知
        </button>
      </footer>

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#202B3A] bg-[#101522] p-5">
      <p className="text-sm text-[#8AA0C2]">{title}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#202B3A] bg-[#101522] p-5">
      <h2 className="mb-4 text-lg font-bold text-white">{title}</h2>
      {children}
    </div>
  )
}
