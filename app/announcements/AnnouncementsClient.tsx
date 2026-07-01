'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, getStoredSession } from '@/lib/session'

interface Announcement {
  id: string
  title: string
  content: string
  type: 'system' | 'activity' | 'maintenance' | 'important'
  is_pinned: boolean
  created_at: string
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [showTermsModal, setShowTermsModal] = useState(false)

  useEffect(() => {
    void fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch('/api/announcements', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok || !data.success) {
        setAnnouncements([])
        setErrorMessage(data.error || '获取公告失败，请稍后再试。')
        return
      }

      setAnnouncements(data.announcements || [])
    } catch (error) {
      console.error('Fetch announcements error:', error)
      setAnnouncements([])
      setErrorMessage('网络异常，暂时无法加载公告。')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (announcementId: string) => {
    const session = getStoredSession()
    if (!session) return

    try {
      await fetch('/api/announcements/unread', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ announcement_id: announcementId }),
      })
    } catch (error) {
      console.error('Mark announcement as read error:', error)
    }
  }

  const openAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    void markAsRead(announcement.id)
  }

  const getTypeMeta = (type: Announcement['type']) => {
    switch (type) {
      case 'activity':
        return { label: '活动公告', className: 'border border-emerald-500/20 bg-emerald-500/15 text-emerald-300' }
      case 'maintenance':
        return { label: '维护提醒', className: 'border border-amber-500/20 bg-amber-500/15 text-amber-300' }
      case 'important':
        return { label: '重要通知', className: 'border border-rose-500/20 bg-rose-500/15 text-rose-300' }
      default:
        return { label: '系统通知', className: 'border border-sky-500/20 bg-sky-500/15 text-sky-300' }
    }
  }

  return (
    <div className="min-h-screen bg-[#040D0A] text-white">
      <header className="border-b border-[#142D24] bg-[#040D0A]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-sm text-[#00E676] transition-colors hover:text-[#00F2FE]">
            返回首页
          </Link>
          <div className="text-sm text-gray-400">AI画堂 · 站内公告</div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white">站内公告</h1>
            <p className="mt-2 text-sm text-gray-400">维护通知、活动动态和重要更新会集中展示在这里。</p>
          </div>
          <button
            onClick={() => void fetchAnnouncements()}
            className="rounded-md border border-[#234536] px-3 py-2 text-sm text-gray-300 transition-colors hover:border-[#00E676] hover:text-white"
          >
            刷新
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#142D24] bg-[#0A1612] py-16 text-center text-gray-400">
            正在加载公告...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-sm leading-6 text-rose-300">
            {errorMessage}
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-[#142D24] bg-[#0A1612] py-16 text-center">
            <div className="text-lg text-gray-400">暂时还没有公告。</div>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const typeMeta = getTypeMeta(announcement.type)
              return (
                <button
                  key={announcement.id}
                  type="button"
                  onClick={() => openAnnouncement(announcement)}
                  className="w-full rounded-2xl border border-[#142D24] bg-[#0A1612] p-5 text-left transition-all hover:border-[#00E676]/50 hover:shadow-[0_0_20px_rgba(0,230,118,0.1)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {announcement.is_pinned && (
                          <span className="rounded-md bg-[#00E676]/15 px-2 py-1 text-xs text-[#00E676]">置顶</span>
                        )}
                        <span className={`rounded-md px-2 py-1 text-xs ${typeMeta.className}`}>{typeMeta.label}</span>
                      </div>

                      <h2 className="break-words text-lg font-semibold text-white">{announcement.title}</h2>
                      <p className="mt-2 text-sm text-gray-500">
                        {new Date(announcement.created_at).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <span className="mt-1 shrink-0 text-gray-500">查看</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedAnnouncement(null)}>
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#142D24] bg-[#0A1612] p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {selectedAnnouncement.is_pinned && (
                  <span className="rounded-md bg-[#00E676]/15 px-2 py-1 text-xs text-[#00E676]">置顶</span>
                )}
                <span className={`rounded-md px-2 py-1 text-xs ${getTypeMeta(selectedAnnouncement.type).className}`}>
                  {getTypeMeta(selectedAnnouncement.type).label}
                </span>
              </div>

              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-xl text-gray-400 transition-colors hover:text-white"
              >
                ×
              </button>
            </div>

            <h2 className="break-words text-xl font-bold text-white">{selectedAnnouncement.title}</h2>
            <p className="mt-2 text-sm text-gray-500">
              {new Date(selectedAnnouncement.created_at).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            <div className="mt-5 border-t border-[#142D24] pt-5">
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-300">{selectedAnnouncement.content}</p>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#142D24]/50 bg-[#040D0A]/95 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-400">
          登录或使用本站即代表你已阅读并同意
          <button
            onClick={() => setShowTermsModal(true)}
            className="ml-1 rounded px-1 text-[#00E676] underline underline-offset-2 transition-colors hover:text-[#00F2FE]"
          >
            《安全合规与使用须知》
          </button>
        </div>
      </footer>

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}
