'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TermsModal } from '@/components/TermsModal'
import { isAdminEmail } from '@/lib/auth'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'system' | 'activity' | 'maintenance' | 'important'
  is_pinned: boolean
  is_active: boolean
  created_at: string
  created_by: string
}

const ANNOUNCEMENT_TYPES = [
  { value: 'system', label: '系统通知' },
  { value: 'activity', label: '活动公告' },
  { value: 'maintenance', label: '维护提醒' },
  { value: 'important', label: '重要通知' },
] as const

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formType, setFormType] = useState<Announcement['type']>('system')
  const [formPinned, setFormPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const session = getStoredSession()
    if (!session) {
      router.replace('/login')
      return
    }

    if (!isAdminEmail(session.email)) {
      router.replace('/dashboard')
      return
    }

    setUserEmail(session.email)
    void fetchAnnouncements()
  }, [router])

  const fetchAnnouncements = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/announcements', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrorMessage(data.error || '获取公告列表失败。')
        setAnnouncements([])
        return
      }

      setAnnouncements(data.announcements || [])
    } catch (error) {
      console.error('Fetch announcements error:', error)
      setErrorMessage('网络异常，暂时无法获取公告列表。')
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!formTitle.trim() || !formContent.trim()) {
      setFeedback('请先填写完整的公告标题和内容。')
      return
    }

    setSubmitting(true)
    setFeedback('')

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          type: formType,
          is_pinned: formPinned,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setFeedback(data.error || '发布公告失败。')
        return
      }

      setFeedback('公告发布成功。')
      setFormTitle('')
      setFormContent('')
      setFormType('system')
      setFormPinned(false)
      setShowForm(false)
      await fetchAnnouncements()
    } catch (error) {
      console.error('Submit announcement error:', error)
      setFeedback('网络异常，发布失败，请稍后重试。')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    clearStoredSession()
    router.replace('/login')
  }

  const getTypeMeta = (type: Announcement['type']) => {
    switch (type) {
      case 'activity':
        return { label: '活动公告', className: 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-300' }
      case 'maintenance':
        return { label: '维护提醒', className: 'border border-amber-500/20 bg-amber-500/15 text-amber-300' }
      case 'important':
        return { label: '重要通知', className: 'border border-rose-500/20 bg-rose-500/15 text-rose-300' }
      case 'system':
      default:
        return { label: '系统通知', className: 'border border-sky-500/20 bg-sky-500/15 text-sky-300' }
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <header className="sticky top-0 z-50 border-b border-[#1e293b] bg-[#030712]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-[#10B981] transition-colors hover:text-[#00F2FE]">
              返回管理后台
            </Link>
            <h1 className="text-xl font-bold">公告管理</h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">管理员：{userEmail}</span>
            <button
              onClick={handleLogout}
              className="rounded-md bg-red-500/15 px-3 py-1 text-sm text-red-300 transition-colors hover:bg-red-500/25"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <section className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#10B981]">发布新公告</h2>
              <p className="mt-1 text-sm text-gray-400">这里发布的内容会展示给站内用户。</p>
            </div>
            <button
              onClick={() => setShowForm((value) => !value)}
              className="rounded-md bg-[#10B981]/15 px-4 py-2 text-sm text-[#10B981] transition-colors hover:bg-[#10B981]/25"
            >
              {showForm ? '收起表单' : '展开表单'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-gray-300">公告标题</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(event) => setFormTitle(event.target.value)}
                  placeholder="例如：本周四晚上 11 点系统维护通知"
                  className="w-full rounded-lg border border-[#334155] bg-[#1e293b] px-4 py-3 text-white outline-none transition-colors focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">公告类型</label>
                <div className="flex flex-wrap gap-2">
                  {ANNOUNCEMENT_TYPES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setFormType(item.value)}
                      className={`rounded-md px-3 py-2 text-sm transition-colors ${
                        formType === item.value
                          ? 'bg-[#10B981] text-[#030712]'
                          : 'bg-[#1e293b] text-gray-300 hover:bg-[#334155]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={formPinned}
                  onChange={(event) => setFormPinned(event.target.checked)}
                  className="h-4 w-4 accent-[#10B981]"
                />
                置顶显示
              </label>

              <div>
                <label className="mb-2 block text-sm text-gray-300">公告内容</label>
                <textarea
                  value={formContent}
                  onChange={(event) => setFormContent(event.target.value)}
                  placeholder="请填写完整公告内容，支持多行。"
                  rows={8}
                  className="w-full resize-none rounded-lg border border-[#334155] bg-[#1e293b] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#10B981]"
                />
              </div>

              {feedback && (
                <div className={`text-sm ${feedback.includes('成功') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {feedback}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full rounded-lg py-3 font-semibold transition-all ${
                  submitting
                    ? 'cursor-not-allowed bg-[#334155] text-gray-500'
                    : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                }`}
              >
                {submitting ? '正在发布...' : '发布公告'}
              </button>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#10B981]">公告列表</h2>
              <p className="mt-1 text-sm text-gray-400">当前展示的是正在生效的公告内容。</p>
            </div>
            <button
              onClick={() => void fetchAnnouncements()}
              className="rounded-md border border-[#334155] px-3 py-2 text-sm text-gray-300 transition-colors hover:border-[#10B981] hover:text-white"
            >
              刷新
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-gray-400">正在加载公告列表...</div>
          ) : errorMessage ? (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {errorMessage}
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-10 text-center text-gray-500">还没有可展示的公告。</div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => {
                const typeMeta = getTypeMeta(announcement.type)

                return (
                  <article
                    key={announcement.id}
                    className="rounded-xl border border-[#334155]/50 bg-[#1e293b]/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {announcement.is_pinned && (
                            <span className="rounded-md bg-[#10B981]/15 px-2 py-1 text-xs text-[#10B981]">
                              置顶
                            </span>
                          )}
                          <span className={`rounded-md px-2 py-1 text-xs ${typeMeta.className}`}>
                            {typeMeta.label}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold text-white">{announcement.title}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {new Date(announcement.created_at).toLocaleString('zh-CN')}
                          {announcement.created_by ? ` · ${announcement.created_by}` : ''}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                      {announcement.content}
                    </p>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}
