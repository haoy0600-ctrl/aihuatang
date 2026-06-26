'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  is_pinned: boolean
  is_active: boolean
  created_at: string
  created_by: string
}

export default function AdminAnnouncementsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showTermsModal, setShowTermsModal] = useState(false)

  // 新建公告表单
  const [showForm, setShowForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formType, setFormType] = useState<'system' | 'activity' | 'maintenance' | 'important'>('system')
  const [formPinned, setFormPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  useEffect(() => {
    const session = getStoredSession()
    if (!session) {
      router.push('/login')
      return
    }

    if (session.email !== '50923561@qq.com') {
      router.push('/dashboard')
      return
    }

    setUser({ email: session.email })
    fetchAnnouncements()
  }, [router])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formTitle.trim() || !formContent.trim()) {
      setSubmitMsg('请填写标题和内容')
      return
    }

    setSubmitting(true)
    setSubmitMsg('')

    try {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: formTitle,
          content: formContent,
          type: formType,
          is_pinned: formPinned
        })
      })

      const data = await response.json()

      if (data.success) {
        setSubmitMsg('✅ 公告发布成功！')
        setFormTitle('')
        setFormContent('')
        setFormType('system')
        setFormPinned(false)
        setShowForm(false)
        fetchAnnouncements()
      } else {
        setSubmitMsg(data.error || '发布失败')
      }
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitMsg('网络错误，请重试')
    }

    setSubmitting(false)
  }

  const handleLogout = () => {
    clearStoredSession()
    router.push('/login')
  }

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
    <div className="min-h-screen bg-[#030712] text-white">
      {/* Header */}
      <header className="bg-[#030712]/95 border-b border-[#1e293b] sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-[#10B981] hover:text-[#00F2FE] transition-colors">
              ← 返回管理后台
            </Link>
            <h1 className="text-xl font-bold">📢 公告管理</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">管理员: {user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 发布公告 */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#10B981]">📝 发布新公告</h2>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 text-sm bg-[#10B981]/20 text-[#10B981] hover:bg-[#10B981]/30 rounded transition-colors"
            >
              {showForm ? '收起' : '展开'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">公告标题</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="请输入公告标题"
                  className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] text-white rounded-lg focus:border-[#10B981] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">公告类型</label>
                <div className="flex gap-2">
                  {(['system', 'activity', 'maintenance', 'important'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormType(type)}
                      className={`px-3 py-1.5 text-sm rounded transition-colors ${
                        formType === type
                          ? 'bg-[#10B981] text-[#030712]'
                          : 'bg-[#1e293b] text-gray-400 hover:bg-[#334155]'
                      }`}
                    >
                      {getTypeLabel(type)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinned"
                  checked={formPinned}
                  onChange={(e) => setFormPinned(e.target.checked)}
                  className="w-4 h-4 accent-[#10B981]"
                />
                <label htmlFor="pinned" className="text-sm text-gray-400">置顶公告</label>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">公告内容（支持 Markdown）</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="请输入公告内容..."
                  rows={8}
                  className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] text-white rounded-lg focus:border-[#10B981] focus:outline-none resize-none font-mono text-sm"
                />
              </div>

              {submitMsg && (
                <div className={`text-sm ${submitMsg.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
                  {submitMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 font-bold rounded-lg transition-all ${
                  submitting
                    ? 'bg-[#334155] text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                }`}
              >
                {submitting ? '发布中...' : '🚀 发布公告'}
              </button>
            </form>
          )}
        </div>

        {/* 公告列表 */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-lg font-bold text-[#10B981] mb-4">📋 公告列表</h2>

          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无公告</div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-[#1e293b]/50 rounded-lg p-4 border border-[#334155]/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {ann.is_pinned && (
                          <span className="px-1.5 py-0.5 bg-[#10B981]/20 text-[#10B981] text-xs rounded">
                            置顶
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 ${getTypeColor(ann.type)} text-xs rounded`}>
                          {getTypeLabel(ann.type)}
                        </span>
                      </div>
                      <h3 className="font-bold text-white">{ann.title}</h3>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(ann.created_at).toLocaleString('zh-CN')}
                        {ann.created_by && ` · ${ann.created_by}`}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400 line-clamp-2">
                    {ann.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}
