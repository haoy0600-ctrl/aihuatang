'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BrandLogo } from '@/components/BrandLogo'
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
  lastActiveAt?: string | null
  isActiveRecently?: boolean
}

interface QueueItem {
  id: string
  user_id?: string
  prompt?: string
  status?: string
  created_at?: string
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

const emptyStats: Stats = {
  totalUsers: 0,
  totalGenerations: 0,
  totalConsumed: 0,
  successRate: '0.0',
  queueCount: 0,
  queue: [],
  modelStats: {},
  resolutionStats: {},
  recentGenerations: [],
  topUsers: [],
  activeUsers: 0,
}

function asRecord<T>(value: unknown): Record<string, T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, T>
}

function normalizeStats(value: Partial<Stats> | null | undefined): Stats {
  return {
    totalUsers: Number(value?.totalUsers || 0),
    totalGenerations: Number(value?.totalGenerations || 0),
    totalConsumed: Number(value?.totalConsumed || 0),
    successRate: String(value?.successRate || '0.0'),
    queueCount: Number(value?.queueCount || value?.queue?.length || 0),
    queue: Array.isArray(value?.queue) ? value.queue : [],
    modelStats: asRecord(value?.modelStats),
    resolutionStats: asRecord(value?.resolutionStats),
    recentGenerations: Array.isArray(value?.recentGenerations) ? value.recentGenerations : [],
    topUsers: Array.isArray(value?.topUsers) ? value.topUsers : [],
    activeUsers: Number(value?.activeUsers || 0),
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', { hour12: false })
}

export default function AdminPage() {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [stats, setStats] = useState<Stats>(emptyStats)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState(10)
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [creditAction, setCreditAction] = useState<'add' | 'subtract'>('add')
  const [showTermsModal, setShowTermsModal] = useState(false)

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    updateTime()
    const timer = window.setInterval(updateTime, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const session = getStoredSession()
      if (!session) {
        router.replace('/login?next=/admin')
        return
      }

      if (!isAdminEmail(session.email)) {
        router.replace('/dashboard')
        return
      }

      setAdminEmail(session.email)

      try {
        setLoadError('')
        const [statsResponse, usersResponse] = await Promise.all([
          fetch('/api/admin/stats', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({}),
            cache: 'no-store',
          }),
          fetch('/api/admin/users', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({}),
            cache: 'no-store',
          }),
        ])

        const statsData = await statsResponse.json()
        const usersData = await usersResponse.json()

        if (statsResponse.ok && statsData.success) {
          setStats(normalizeStats(statsData.stats))
        } else {
          setStats(emptyStats)
          setLoadError(statsData.error || '数据看板加载失败。')
        }

        if (usersResponse.ok && usersData.success && Array.isArray(usersData.users)) {
          setUsers(usersData.users)
        } else if (usersData.error) {
          setLoadError(usersData.error)
        }
      } catch (error) {
        console.error('Fetch admin data error:', error)
        setStats(emptyStats)
        setLoadError('后台数据加载失败，请刷新后重试。')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
    const timer = window.setInterval(() => void fetchData(), 30000)
    return () => window.clearInterval(timer)
  }, [router])

  const selectedUser = useMemo(() => users.find((item) => item.id === selectedUserId) || null, [selectedUserId, users])
  const queueItems = stats.queue.slice(0, 8)
  const recentItems = stats.recentGenerations.slice(0, 8)

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

    if (response.ok && data.success) {
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === selectedUserId ? { ...item, credits: data.newCredits } : item)),
      )
      setShowCreditModal(false)
      alert(data.message || '操作成功。')
      return
    }

    alert(data.error || '操作失败，请稍后重试。')
  }

  const handleToggleStatus = async (userId: string) => {
    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, action: 'toggle_status' }),
    })
    const data = await response.json()

    if (response.ok && data.success) {
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === userId ? { ...item, banned: data.banned } : item)),
      )
      alert(data.message || '状态已更新。')
      return
    }

    alert(data.error || '操作失败，请稍后重试。')
  }

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!window.confirm(`确定删除用户「${email}」吗？此操作不可恢复。`)) return

    const response = await fetch('/api/admin/update-user', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ userId, action: 'delete' }),
    })
    const data = await response.json()

    if (response.ok && data.success) {
      setUsers((currentUsers) => currentUsers.filter((item) => item.id !== userId))
      alert(data.message || '用户已删除。')
      return
    }

    alert(data.error || '删除失败，请稍后重试。')
  }

  const handleLogout = () => {
    clearStoredSession()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D17]">
        <p className="text-sm text-[#00F2FE]">正在加载后台...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0D17] pb-24 text-white">
      <header className="border-b border-[#202B3A] bg-[#0B0D17]">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex w-full flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-4">
              <Link href="/" className="flex select-none items-center transition-opacity hover:opacity-80">
                <BrandLogo compact />
              </Link>
              <div className="min-w-0">
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
                type="button"
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
          <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')}>
            数据看板
          </TabButton>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
            用户管理
          </TabButton>
          <Link href="/admin/cards" className="rounded-xl bg-[#131826] px-4 py-2 text-sm font-semibold text-white">
            卡密管理
          </Link>
          <Link
            href="/admin/announcements"
            className="rounded-xl bg-[#131826] px-4 py-2 text-sm font-semibold text-white"
          >
            公告发布
          </Link>
        </div>

        {loadError && (
          <div className="mb-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-100">
            {loadError}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard title="总用户" value={stats.totalUsers} hint="已注册账号" />
              <StatCard title="总生成次数" value={stats.totalGenerations} hint="历史提交任务" />
              <StatCard title="累计消耗积分" value={stats.totalConsumed} hint="按 1K/2K/4K 规则统计" />
              <StatCard title="成功率" value={`${stats.successRate}%`} hint="成功任务 / 全部任务" />
              <StatCard title="活跃用户" value={stats.activeUsers} hint="最近 7 天有生成记录" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Panel title="最近生成记录">
                {recentItems.length > 0 ? (
                  <div className="space-y-3">
                    {recentItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[#202B3A] bg-[#101522] p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="break-all font-semibold text-white">{item.userEmail || item.username || item.user_id}</p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 text-[#93A4B8]">
                          {item.model || '-'} · {item.resolution || '-'} · {item.image_count || 1} 张
                        </p>
                        <p className="mt-1 text-xs text-[#64748B]">{formatDate(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyText>暂无生成记录</EmptyText>
                )}
              </Panel>

              <Panel title="队列状态">
                <StatCard title="当前排队任务" value={stats.queueCount} hint="processing 状态任务数量" compact />
                <div className="mt-4 space-y-3">
                  {queueItems.length > 0 ? (
                    queueItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-[#202B3A] bg-[#101522] p-3 text-sm">
                        <p className="break-words text-white">{item.prompt || '无提示词'}</p>
                        <p className="mt-2 text-xs text-[#64748B]">{formatDate(item.created_at)}</p>
                      </div>
                    ))
                  ) : (
                    <EmptyText>暂无排队任务</EmptyText>
                  )}
                </div>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <StatsMapPanel title="模型使用" data={stats.modelStats} />
              <StatsMapPanel title="分辨率使用" data={stats.resolutionStats} />
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <Panel title="用户管理">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="text-xs uppercase text-[#93A4B8]">
                  <tr className="border-b border-[#202B3A]">
                    <th className="px-3 py-3">用户</th>
                    <th className="px-3 py-3">用户名</th>
                    <th className="px-3 py-3">积分</th>
                    <th className="px-3 py-3">生成</th>
                    <th className="px-3 py-3">状态</th>
                    <th className="px-3 py-3">注册时间</th>
                    <th className="px-3 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((item) => (
                    <tr key={item.id} className="border-b border-[#202B3A]">
                      <td className="max-w-[260px] break-all px-3 py-3 font-medium text-white">{item.email}</td>
                      <td className="px-3 py-3 text-[#93A4B8]">{item.username || '未设置'}</td>
                      <td className="px-3 py-3 font-bold text-[#00F2FE]">{item.credits || 0}</td>
                      <td className="px-3 py-3 text-[#93A4B8]">
                        {item.generationCount || 0} 次 / {item.totalImages || 0} 张
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={item.banned ? 'banned' : 'active'} />
                      </td>
                      <td className="px-3 py-3 text-[#93A4B8]">{formatDate(item.created_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <SmallButton
                            onClick={() => {
                              setSelectedUserId(item.id)
                              setCreditAction('add')
                              setShowCreditModal(true)
                            }}
                          >
                            加分
                          </SmallButton>
                          <SmallButton
                            onClick={() => {
                              setSelectedUserId(item.id)
                              setCreditAction('subtract')
                              setShowCreditModal(true)
                            }}
                          >
                            扣分
                          </SmallButton>
                          <SmallButton onClick={() => void handleToggleStatus(item.id)}>
                            {item.banned ? '恢复' : '禁用'}
                          </SmallButton>
                          <SmallButton danger onClick={() => void handleDeleteUser(item.id, item.email)}>
                            删除
                          </SmallButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-[#202B3A] bg-[#0B0D17]/95 px-4 py-3 text-center text-xs text-[#93A4B8] backdrop-blur">
        后台操作请谨慎执行 · 当前管理员：{adminEmail}{' '}
        <button type="button" onClick={() => setShowTermsModal(true)} className="font-semibold text-[#00F2FE] underline">
          使用须知
        </button>
      </footer>

      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#202B3A] bg-[#101522] p-6">
            <h2 className="text-xl font-bold text-white">{creditAction === 'add' ? '增加积分' : '扣除积分'}</h2>
            <p className="mt-2 break-all text-sm text-[#93A4B8]">{selectedUser.email}</p>
            <input
              type="number"
              min={1}
              value={creditAmount}
              onChange={(event) => setCreditAmount(Number(event.target.value))}
              className="mt-4 w-full rounded-xl border border-[#202B3A] bg-[#0B0D17] px-4 py-3 text-white outline-none focus:border-[#00F2FE]"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreditModal(false)}
                className="rounded-xl border border-[#202B3A] px-4 py-2 text-sm text-white"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleCreditAction()}
                className="rounded-xl bg-[#00F2FE] px-4 py-2 text-sm font-bold text-[#0B0D17]"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold ${
        active ? 'bg-[#00F2FE] text-[#0B0D17]' : 'bg-[#131826] text-white'
      }`}
    >
      {children}
    </button>
  )
}

function StatCard({
  title,
  value,
  hint,
  compact = false,
}: {
  title: string
  value: string | number
  hint: string
  compact?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-[#202B3A] bg-[#101522] ${compact ? 'p-4' : 'p-5'}`}>
      <p className="text-sm text-[#93C5FD]">{title}</p>
      <p className="mt-3 text-3xl font-black text-white">{value}</p>
      <p className="mt-2 text-xs text-[#64748B]">{hint}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#202B3A] bg-[#101522]/70 p-5">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  )
}

function StatsMapPanel({
  title,
  data,
}: {
  title: string
  data: Record<string, { count: number; totalImages: number }>
}) {
  const entries = Object.entries(data)

  return (
    <Panel title={title}>
      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map(([name, item]) => (
            <div key={name} className="flex items-center justify-between rounded-xl border border-[#202B3A] bg-[#0B0D17] p-3">
              <span className="break-all text-sm font-semibold text-white">{name}</span>
              <span className="text-sm text-[#93A4B8]">
                {item.count || 0} 次 / {item.totalImages || 0} 张
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyText>暂无统计数据</EmptyText>
      )}
    </Panel>
  )
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = String(status || '').toLowerCase()
  const isGood = ['success', 'completed', 'active'].includes(normalized)
  const isBad = ['failed', 'error', 'banned'].includes(normalized)
  const text = normalized === 'banned' ? '已禁用' : normalized === 'active' ? '正常' : status || '-'

  return (
    <span
      className={`rounded-lg px-2 py-1 text-xs font-bold ${
        isGood
          ? 'bg-emerald-500/15 text-emerald-300'
          : isBad
            ? 'bg-red-500/15 text-red-300'
            : 'bg-cyan-500/15 text-cyan-300'
      }`}
    >
      {text}
    </span>
  )
}

function SmallButton({
  children,
  onClick,
  danger = false,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
        danger ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25' : 'bg-[#00F2FE]/10 text-[#00F2FE] hover:bg-[#00F2FE]/20'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyText({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#202B3A] p-5 text-center text-sm text-[#64748B]">{children}</p>
}
