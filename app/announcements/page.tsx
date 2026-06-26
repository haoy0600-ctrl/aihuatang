'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [showTermsModal, setShowTermsModal] = useState(false)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch('/api/announcements')
        const data = await response.json()
        if (data.success) {
          setAnnouncements(data.announcements || [])
        }
      } catch (error) {
        console.error('Fetch announcements error:', error)
      }
      setLoading(false)
    }

    fetchAnnouncements()
  }, [])

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      system: '系统',
      activity: '活动',
      maintenance: '维护',
      important: '重要'
    }
    return labels[type] || '系统'
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      system: 'bg-blue-500/20 text-blue-400',
      activity: 'bg-green-500/20 text-green-400',
      maintenance: 'bg-yellow-500/20 text-yellow-400',
      important: 'bg-red-500/20 text-red-400'
    }
    return colors[type] || colors.system
  }

  return (
    <div className="min-h-screen bg-[#040D0A]">
      {/* Header */}
      <header className="bg-[#040D0A] border-b border-[#142D24]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full py-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-[#00E676] hover:text-[#00F2FE] transition-colors">
                ← 返回首页
              </Link>
            </div>
            <div className="text-sm text-gray-400">
              AI画堂 · 站内公告
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">📢 站内公告</h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-400">加载中...</div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 bg-[#0A1612] rounded-xl border border-[#142D24]">
            <div className="text-4xl mb-4">📭</div>
            <div className="text-gray-400">暂无公告</div>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                onClick={() => setSelectedAnnouncement(announcement)}
                className="bg-[#0A1612] rounded-xl border border-[#142D24] p-5 cursor-pointer hover:border-[#00E676]/50 transition-all hover:shadow-[0_0_20px_rgba(0,230,118,0.1)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {announcement.is_pinned && (
                        <span className="px-2 py-0.5 bg-[#00E676]/20 text-[#00E676] text-xs rounded">
                          置顶
                        </span>
                      )}
                      <span className={`px-2 py-0.5 ${getTypeColor(announcement.type)} text-xs rounded`}>
                        {getTypeLabel(announcement.type)}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">{announcement.title}</h3>
                    <div className="text-sm text-gray-500">
                      {new Date(announcement.created_at).toLocaleString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div className="text-gray-500 mt-2">→</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 公告详情弹窗 */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="bg-[#0A1612] border border-[#142D24] rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {selectedAnnouncement.is_pinned && (
                  <span className="px-2 py-0.5 bg-[#00E676]/20 text-[#00E676] text-xs rounded">
                    置顶
                  </span>
                )}
                <span className={`px-2 py-0.5 ${getTypeColor(selectedAnnouncement.type)} text-xs rounded`}>
                  {getTypeLabel(selectedAnnouncement.type)}
                </span>
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="text-gray-400 hover:text-white transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">{selectedAnnouncement.title}</h2>

            <div className="text-sm text-gray-500 mb-4">
              {new Date(selectedAnnouncement.created_at).toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>

            <div className="border-t border-[#142D24] pt-4">
              <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                {selectedAnnouncement.content}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底栏 */}
      <footer className="fixed bottom-0 left-0 right-0 py-2.5 bg-[#040D0A]/95 border-t border-[#142D24]/50 backdrop-blur-sm z-40">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            登录或使用本站即代表您同意{' '}
            <button
              onClick={() => setShowTermsModal(true)}
              className="text-[#00E676] hover:text-[#00F2FE] font-semibold underline underline-offset-2 decoration-[#00E676]/50 hover:decoration-[#00F2FE] transition-all duration-300 hover:shadow-[0_0_8px_rgba(0,230,118,0.3)] rounded px-1"
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
