'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'
import { resolveAvatarUrl } from '@/lib/avatar'

interface GenerationRecord {
  id: string
  user_id: string
  prompt: string
  style_name: string
  style_prompt?: string
  model: string
  image_count: number
  image_urls: string | string[]
  status: string
  created_at: string
  image_url_4k?: string | null
}

interface UserProfile {
  credits: number
  avatar_url?: string
}

type FilterStatus = 'all' | 'success' | 'failed'

const COLUMN_COUNT = 5
const PAGE_SIZE = 20

export default function RecordsPage() {
  const router = useRouter()
  const observerRef = useRef<HTMLDivElement>(null)

  const [records, setRecords] = useState<GenerationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<GenerationRecord | null>(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [upscalingIds, setUpscalingIds] = useState<Set<string>>(new Set())
  const [image4kUrls, setImage4kUrls] = useState<Record<string, string>>({})
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const parseImageUrls = useCallback((value: string | string[] | null | undefined) => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    }

    if (!value || typeof value !== 'string') {
      return []
    }

    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : []
    } catch {
      return value.trim() ? [value.trim()] : []
    }
  }, [])

  const hydrate4kMap = useCallback((list: GenerationRecord[]) => {
    const next4k: Record<string, string> = {}
    list.forEach((item) => {
      if (item.image_url_4k) {
        next4k[item.id] = item.image_url_4k
      }
    })
    setImage4kUrls(next4k)
  }, [])

  const fetchRecords = useCallback(
    async (pageNum = 1, reset = false) => {
      const session = getStoredSession()
      if (!session) {
        setRecords([])
        setProfile({ credits: 0 })
        setLoading(false)
        setLoadingMore(false)
        return
      }

      try {
        setErrorMessage('')
        if (reset) {
          const meResponse = await fetch('/api/auth/me', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({}),
          })
          const meData = await meResponse.json()

          if (!meData.success || !meData.user) {
            setRecords([])
            setProfile({ credits: 0 })
            setLoading(false)
            return
          }

          setUser(meData.user)
          setProfile({
            credits: meData.profile?.credits ?? 0,
            avatar_url: meData.profile?.avatar_url,
          })
        }

        const recordsResponse = await fetch('/api/user/records', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            status: filterStatus,
            page: pageNum,
            limit: PAGE_SIZE,
          }),
        })
        const recordsData = await recordsResponse.json()

        if (!recordsData.success) {
          setErrorMessage(recordsData.error || '获取生成记录失败。')
          if (reset) {
            setRecords([])
            setTotalRecords(0)
            setHasMore(false)
          }
          return
        }

        const incomingRecords = (recordsData.records || []) as GenerationRecord[]

        if (reset) {
          setRecords(incomingRecords)
          hydrate4kMap(incomingRecords)
        } else {
          setRecords((prev) => {
            const merged = [...prev, ...incomingRecords]
            const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values())
            hydrate4kMap(deduped)
            return deduped
          })
        }

        setTotalRecords(recordsData.total || 0)
        setHasMore(Boolean(recordsData.hasMore))
      } catch (error) {
        console.error('Fetch records error:', error)
        setErrorMessage('网络异常，获取生成记录失败。')
        if (reset) {
          setRecords([])
          setProfile({ credits: 0 })
          setTotalRecords(0)
          setHasMore(false)
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filterStatus, hydrate4kMap],
  )

  useEffect(() => {
    setCurrentPage(1)
    setLoading(true)
    void fetchRecords(1, true)

    const timer = setInterval(() => void fetchRecords(1, true), 5000)
    const handleGenerationComplete = () => void fetchRecords(1, true)
    window.addEventListener('ai-huatang-generation-complete', handleGenerationComplete)

    return () => {
      clearInterval(timer)
      window.removeEventListener('ai-huatang-generation-complete', handleGenerationComplete)
    }
  }, [fetchRecords])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !loading && !loadingMore && hasMore) {
          setLoadingMore(true)
          setCurrentPage((prev) => prev + 1)
        }
      },
      { rootMargin: '200px' },
    )

    const currentNode = observerRef.current
    if (currentNode) {
      observer.observe(currentNode)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore])

  useEffect(() => {
    if (currentPage > 1) {
      void fetchRecords(currentPage, false)
    }
  }, [currentPage, fetchRecords])

  const filteredRecords = useMemo(() => {
    if (filterStatus === 'all') return records
    if (filterStatus === 'success') {
      return records.filter((record) => record.status === 'success' || record.status === 'completed')
    }
    return records.filter((record) => record.status === 'failed' || record.status === 'error')
  }, [filterStatus, records])

  const statusCounts = useMemo(
    () => ({
      all: records.length,
      success: records.filter((record) => record.status === 'success' || record.status === 'completed').length,
      failed: records.filter((record) => record.status === 'failed' || record.status === 'error').length,
    }),
    [records],
  )

  const columns = useMemo(() => {
    const result: GenerationRecord[][] = Array.from({ length: COLUMN_COUNT }, () => [])
    filteredRecords.forEach((record, index) => {
      result[index % COLUMN_COUNT].push(record)
    })
    return result
  }, [filteredRecords])

  const getModelPrice = () => 3

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('zh-CN')

  const getFirstSentence = (text: string) => {
    const sentences = text.split(/[。！？；\n]/).filter((item) => item.trim())
    return sentences[0]?.trim() || text.substring(0, 30)
  }

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url, { mode: 'cors' })
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `AI画堂_${Date.now()}_${index + 1}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
      const link = document.createElement('a')
      link.href = url
      link.download = `AI画堂_${Date.now()}_${index + 1}.png`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      alert('图片链接已复制到剪贴板。')
    } catch {
      window.prompt('请手动复制图片链接：', url)
    }
  }

  const handleUpscale = async (recordId: string, imageUrl: string) => {
    if (!imageUrl || upscalingIds.has(recordId)) return

    setUpscalingIds((prev) => new Set([...prev, recordId]))

    try {
      const response = await fetch('/api/upscale', {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl, recordId }),
      })
      const data = await response.json()

      if (data.success && data.url) {
        setImage4kUrls((prev) => ({
          ...prev,
          [recordId]: data.url,
        }))
        const costText =
          typeof data.creditsCost === 'number' && data.creditsCost > 0
            ? `，本次已扣除 ${data.creditsCost} 积分`
            : ''
        alert(`4K 放大已完成${costText}。`)
      } else {
        alert(data.error || '4K 放大失败，请稍后重试。')
      }
    } catch (error) {
      console.error('Upscale failed:', error)
      alert('4K 放大失败，请稍后重试。')
    } finally {
      setUpscalingIds((prev) => {
        const next = new Set(prev)
        next.delete(recordId)
        return next
      })
    }
  }

  const handleCopyPrompt = async (prompt: string, id: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPromptId(id)
      window.setTimeout(() => setCopiedPromptId(null), 2000)
    } catch {
      alert('复制失败，请手动复制。')
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const response = await fetch('/api/user/delete-record', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ id: recordId }),
      })
      const data = await response.json()

      if (!data.success) {
        alert(data.error || '删除失败，请稍后重试。')
        return
      }

      setRecords((prev) => prev.filter((item) => item.id !== recordId))
      setImage4kUrls((prev) => {
        const next = { ...prev }
        delete next[recordId]
        return next
      })
      setTotalRecords((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Delete record failed:', error)
      alert('删除失败，请稍后重试。')
    }
  }

  const handleDeleteAll = async () => {
    try {
      await Promise.all(
        records.map((record) =>
          fetch('/api/user/delete-record', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ id: record.id }),
          }),
        ),
      )

      setRecords([])
      setImage4kUrls({})
      setTotalRecords(0)
      setHasMore(false)
      setShowDeleteAllModal(false)
    } catch (error) {
      console.error('Delete all failed:', error)
      alert('批量删除失败，请稍后重试。')
    }
  }

  const downloadAllImages = async (urls: string[]) => {
    if (urls.length === 0) return

    if (urls.length === 1) {
      await handleDownload(urls[0], 0)
      return
    }

    try {
      const zip = new JSZip()
      await Promise.all(
        urls.map(async (url, index) => {
          const response = await fetch(url)
          const blob = await response.blob()
          zip.file(`AI画堂_图片_${index + 1}.png`, blob)
        }),
      )
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `AI画堂_记录_${Date.now()}.zip`)
    } catch (error) {
      console.error('Batch download failed:', error)
      for (let index = 0; index < urls.length; index += 1) {
        await handleDownload(urls[index], index)
      }
    }
  }

  const handleLogout = () => {
    clearStoredSession()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-[#0B0D17]">
      <header className="border-b border-[#202B3A] bg-[#0B0D17]">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-2 sm:py-3">
            <Link href="/" className="flex items-center select-none transition-opacity hover:opacity-80">
              <img src="/logo.svg?v=2" alt="AI画堂" className="h-20 w-20 object-contain" />
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <NavLink href="/dashboard">创作中心</NavLink>
              <NavLink href="/records" active>
                生成记录
              </NavLink>
              <NavLink href="/recharge">卡密兑换</NavLink>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 text-xs text-[#00F2FE] sm:flex">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="font-mono text-sm font-bold text-white">{currentTime}</span>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-[#202B3A] bg-[#141923] px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
                <span className="h-2 w-2 rounded-full border border-[#202B3A] bg-[#10B981]" />
                <span className="hidden text-xs text-[#00F2FE] sm:inline">积分</span>
                <span className="text-sm font-bold text-white">{profile?.credits || 0}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[#202B3A] bg-[#141923] transition-colors hover:border-[#00F2FE] sm:h-9 sm:w-9"
                >
                  <img src={resolveAvatarUrl(profile?.avatar_url)} alt="用户头像" className="h-full w-full object-cover" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-[#202B3A] bg-[#141923] shadow-lg">
                    <div className="border-b border-[#202B3A] p-3 sm:p-4">
                      <p className="mb-1 text-xs text-[#00F2FE]">当前账号</p>
                      <p className="truncate text-sm font-medium text-white">{user?.email || '未登录'}</p>
                    </div>
                    <div className="p-2">
                      <MenuButton
                        onClick={() => {
                          router.push('/dashboard')
                          setShowUserMenu(false)
                        }}
                      >
                        创作中心
                      </MenuButton>
                      <MenuButton
                        onClick={() => {
                          router.push('/recharge')
                          setShowUserMenu(false)
                        }}
                      >
                        卡密兑换
                      </MenuButton>
                      <MenuButton
                        onClick={() => {
                          router.push('/profile')
                          setShowUserMenu(false)
                        }}
                      >
                        个人中心
                      </MenuButton>
                      <MenuButton
                        onClick={() => {
                          setShowChangePassword(true)
                          setShowUserMenu(false)
                        }}
                      >
                        修改密码
                      </MenuButton>
                      <div className="my-1 border-t border-[#202B3A]" />
                      <MenuButton
                        danger
                        onClick={() => {
                          handleLogout()
                          setShowUserMenu(false)
                        }}
                      >
                        退出登录
                      </MenuButton>
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
          <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-white">生成记录</h2>
              <p className="mt-1 text-sm text-[#00F2FE]">你的创作资产库，共 {totalRecords} 条记录</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAllModal(true)}
                disabled={records.length === 0}
                className="rounded-lg border border-red-500/50 bg-red-500/20 px-4 py-2 text-sm font-bold text-red-400 transition-all hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-30"
              >
                全部删除
              </button>
              <Link
                href="/dashboard"
                className="rounded-lg border border-[#202B3A] bg-[#00E676] px-4 py-2 text-sm font-bold text-[#0B0D17] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all hover:shadow-[0_0_20px_rgba(0,230,118,0.6)]"
              >
                返回创作
              </Link>
            </div>
          </div>

          <div className="mb-6 flex w-fit gap-2 rounded-xl bg-[#141923] p-1">
            {[
              { key: 'all', label: '全部', color: 'bg-[#00F2FE] text-[#0A0F1D]' },
              { key: 'success', label: '成功', color: 'bg-[#10B981] text-[#0A0F1D]' },
              { key: 'failed', label: '失败', color: 'bg-red-500 text-white' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key as FilterStatus)}
                className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${
                  filterStatus === tab.key ? `${tab.color} shadow-lg` : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab.label} ({statusCounts[tab.key as keyof typeof statusCounts]})
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingState />
          ) : errorMessage ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
              {errorMessage}
            </div>
          ) : filteredRecords.length === 0 ? (
            <EmptyRecords />
          ) : (
            <div className="flex gap-3">
              {columns.map((column, colIndex) => (
                <div key={colIndex} className="flex-1 space-y-3">
                  {column.map((record) => {
                    const imageUrls = parseImageUrls(record.image_urls)
                    const coverUrl = image4kUrls[record.id] || record.image_url_4k || imageUrls[0] || ''
                    const totalCost = getModelPrice() * Math.max(1, record.image_count || 1)
                    const firstSentence = getFirstSentence(record.prompt)
                    const success = record.status === 'success' || record.status === 'completed'
                    const failed = record.status === 'failed' || record.status === 'error'

                    return (
                      <div
                        key={record.id}
                        className="group overflow-hidden rounded-lg border border-[#1E293B] bg-[#0D111A] transition-all duration-300 hover:border-[#00F2FE]/50"
                      >
                        <div className="relative overflow-hidden bg-[#161A2B]">
                          {coverUrl ? (
                            <img src={coverUrl} alt="生成图片" className="h-auto w-full object-contain" />
                          ) : (
                            <div className="flex aspect-square w-full items-center justify-center bg-[#0B0D17] text-xs text-[#94A3B8]">
                              {failed ? <span className="p-2 text-center">该任务生成失败</span> : <span>暂无图片</span>}
                            </div>
                          )}

                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/80 p-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
                            {coverUrl && (
                              <>
                                <ActionButton onClick={() => setPreviewImageUrl(coverUrl)} tone="green">
                                  预览
                                </ActionButton>
                                <ActionButton onClick={() => void handleDownload(coverUrl, 0)} tone="blue">
                                  下载
                                </ActionButton>
                                <ActionButton onClick={() => void handleCopyLink(coverUrl)} tone="white">
                                  复制链接
                                </ActionButton>
                                <ActionButton
                                  onClick={() => void handleUpscale(record.id, imageUrls[0] || '')}
                                  tone={image4kUrls[record.id] ? 'success' : 'amber'}
                                  disabled={upscalingIds.has(record.id) || Boolean(image4kUrls[record.id])}
                                >
                                  {image4kUrls[record.id]
                                    ? '已完成 4K'
                                    : upscalingIds.has(record.id)
                                      ? '处理中...'
                                      : '一键 4K 放大'}
                                </ActionButton>
                              </>
                            )}

                            <ActionButton
                              onClick={() => {
                                if (window.confirm('确定要删除这条记录吗？')) {
                                  void handleDeleteRecord(record.id)
                                }
                              }}
                              tone="danger"
                            >
                              删除
                            </ActionButton>
                          </div>

                          {imageUrls.length > 1 && (
                            <div className="absolute right-1 top-1">
                              <div className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-[#00F2FE] backdrop-blur-sm">
                                +{imageUrls.length - 1}
                              </div>
                            </div>
                          )}

                          <div className="absolute left-1 top-1">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm ${
                                success
                                  ? 'bg-[#10B981]/80 text-white'
                                  : failed
                                    ? 'bg-red-500/80 text-white'
                                    : 'bg-yellow-500/80 text-black'
                              }`}
                            >
                              {success ? '成功' : failed ? '失败' : '处理中'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2">
                          <div className="mb-1 flex flex-wrap items-center gap-1">
                            <span className="rounded border border-[#10B981]/50 bg-[#10B981]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#10B981]">
                              {record.style_name || '未命名风格'}
                            </span>
                            <span className="rounded border border-[#00F2FE]/50 bg-[#00F2FE]/20 px-2 py-0.5 text-xs font-bold text-[#00F2FE]">
                              {record.model}
                            </span>
                            <span className="rounded border border-[#F59E0B]/50 bg-[#F59E0B]/20 px-1.5 py-0.5 text-[10px] font-bold text-[#F59E0B]">
                              消耗 {totalCost} 积分
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <p className="flex-1 truncate text-[10px] text-[#94A3B8]">{firstSentence}</p>
                            <button
                              onClick={() => setSelectedRecord(record)}
                              className="text-[10px] text-[#00F2FE] transition-colors hover:text-[#00E676]"
                            >
                              详情
                            </button>
                          </div>

                          <p className="mt-1 text-[9px] text-[#475569]">{formatDate(record.created_at)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div ref={observerRef} className="py-8 text-center">
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#202B3A] bg-[#141923] px-6 py-3">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#00F2FE] border-t-transparent" />
                  <span className="text-sm text-[#00F2FE]">加载更多...</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLoadingMore(true)
                    setCurrentPage((prev) => prev + 1)
                  }}
                  className="rounded-xl border border-[#00F2FE] bg-[#141923] px-8 py-3 text-sm font-bold text-[#00F2FE] transition-all hover:bg-[#00F2FE] hover:text-[#0A0F1D]"
                >
                  加载更多记录
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/90 text-xl font-bold text-white transition-all hover:bg-red-500"
          >
            ×
          </button>
          <img
            src={previewImageUrl}
            alt="预览图片"
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          copiedPromptId={copiedPromptId}
          onClose={() => setSelectedRecord(null)}
          onCopyPrompt={handleCopyPrompt}
          onPreview={(url) => setPreviewImageUrl(url)}
          onDownload={handleDownload}
          onDownloadAll={downloadAllImages}
          onUpscale={handleUpscale}
          onDelete={async () => {
            if (window.confirm('确定要删除这条记录吗？')) {
              await handleDeleteRecord(selectedRecord.id)
              setSelectedRecord(null)
            }
          }}
          image4kUrl={image4kUrls[selectedRecord.id]}
          isUpscaling={upscalingIds.has(selectedRecord.id)}
          parseImageUrls={parseImageUrls}
        />
      )}

      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#202B3A] bg-[#141923]">
            <div className="p-6">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/50 bg-red-500/20">
                  <span className="text-3xl">!</span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">确认清空所有记录</h3>
                <p className="text-sm text-[#94A3B8]">
                  这会删除你的全部 {records.length} 条生成记录，并且无法恢复。
                  <br />
                  <span className="text-red-400">请谨慎操作。</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  className="flex-1 rounded-lg border border-[#202B3A] bg-[#0B0D17] py-3 text-sm font-bold text-white transition-all hover:border-[#00F2FE]"
                >
                  取消
                </button>
                <button
                  onClick={() => void handleDeleteAll()}
                  className="flex-1 rounded-lg bg-red-500 py-3 text-sm font-bold text-white transition-all hover:bg-red-600"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal show={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1E293B]/50 bg-[#030712]/95 py-2.5 backdrop-blur-sm">
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

function NavLink({
  href,
  children,
  active,
}: {
  href: string
  children: ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border px-5 py-2.5 text-base font-semibold tracking-wide transition-all md:text-lg ${
        active
          ? 'border-[#202B3A] bg-[#10B981] text-[#0B0D17] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
          : 'border-[#202B3A] bg-[#141923] text-white hover:border-[#00F2FE] hover:bg-[#1A2230]'
      }`}
    >
      {children}
    </Link>
  )
}

function MenuButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        danger ? 'text-red-400 hover:bg-[#1A2230]' : 'text-white hover:bg-[#1A2230] hover:text-[#00F2FE]'
      }`}
    >
      {children}
    </button>
  )
}

function ActionButton({
  children,
  onClick,
  tone,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  tone: 'green' | 'blue' | 'white' | 'amber' | 'danger' | 'success'
  disabled?: boolean
}) {
  const toneClass: Record<string, string> = {
    green: 'border-[#00E676] bg-[#00E676] text-[#0A0F1D] hover:bg-[#00FF80]',
    blue: 'border-[#00F2FE] bg-[#00F2FE] text-[#0A0F1D] hover:bg-[#33F5FF]',
    white: 'border-white/50 bg-white/90 text-[#0A0F1D] hover:bg-white',
    amber: 'border-[#F59E0B] bg-[#F59E0B] text-[#0A0F1D] hover:bg-[#FBBF24]',
    danger: 'border-red-500/50 bg-red-500/90 text-white hover:bg-red-500',
    success: 'border-[#10B981] bg-[#10B981] text-[#0A0F1D]',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-1 rounded border px-2 py-1.5 text-xs font-bold transition-all backdrop-blur-sm ${
        disabled ? 'cursor-not-allowed border-gray-500/50 bg-gray-500/50 text-gray-400' : toneClass[tone]
      }`}
    >
      {children}
    </button>
  )
}

function LoadingState() {
  return (
    <div className="py-20 text-center">
      <div className="animate-pulse">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-[#202B3A] bg-[#10B981]" />
        <p className="text-[#00F2FE]">加载中...</p>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl gap-3 px-4">
        {[1, 2, 3, 4, 5].map((column) => (
          <div key={column} className="flex-1 space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={`${column}-${row}`} className="h-48 animate-pulse rounded-lg border border-[#1E293B] bg-[#141923]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyRecords() {
  return (
    <div className="rounded-lg border-2 border-dashed border-[#202B3A] p-16 text-center">
      <div className="mb-8 inline-flex h-24 w-24 items-center justify-center rounded-xl border border-[#00F2FE] bg-[#141923] shadow-[0_0_30px_rgba(0,242,254,0.3)]">
        <span className="text-3xl text-[#00F2FE]">空</span>
      </div>
      <h3 className="mb-3 text-2xl font-bold text-white">还没有生成记录</h3>
      <p className="mx-auto mb-8 max-w-md text-[#00F2FE]">
        去创作页生成你的第一批内容吧。
        <br />
        <span className="text-sm text-[#94A3B8]">生成后的图片、提示词和下载入口都会保存在这里。</span>
      </p>
      <Link
        href="/dashboard"
        className="inline-block rounded-lg border border-[#202B3A] bg-[#00E676] px-8 py-4 text-base font-black text-[#0A0F1D] shadow-[0_0_20px_rgba(0,230,118,0.5)] transition-all hover:shadow-[0_0_30px_rgba(0,230,118,0.8)]"
      >
        去创作
      </Link>
    </div>
  )
}

function RecordDetailModal({
  record,
  copiedPromptId,
  onClose,
  onCopyPrompt,
  onPreview,
  onDownload,
  onDownloadAll,
  onUpscale,
  onDelete,
  image4kUrl,
  isUpscaling,
  parseImageUrls,
}: {
  record: GenerationRecord
  copiedPromptId: string | null
  onClose: () => void
  onCopyPrompt: (prompt: string, id: string) => void
  onPreview: (url: string) => void
  onDownload: (url: string, index: number) => void
  onDownloadAll: (urls: string[]) => void
  onUpscale: (recordId: string, imageUrl: string) => void
  onDelete: () => void
  image4kUrl?: string
  isUpscaling: boolean
  parseImageUrls: (value: string | string[] | null | undefined) => string[]
}) {
  const urls = parseImageUrls(record.image_urls)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#202B3A] bg-[#141923]">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">记录详情</h3>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#202B3A] text-white transition-colors hover:bg-[#2A3343]"
            >
              ×
            </button>
          </div>

          <div className="mb-6">
            <p className="mb-2 text-xs uppercase text-[#00F2FE]">原始文本</p>
            <p className="whitespace-pre-wrap rounded-lg border border-[#202B3A] bg-[#0B0D17] p-4 text-sm leading-relaxed text-white">
              {record.prompt}
            </p>
          </div>

          {record.style_prompt && (
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs uppercase text-[#00F2FE]">扩写 Prompt</p>
                <button
                  onClick={() => onCopyPrompt(record.style_prompt || '', record.id)}
                  className="text-xs text-[#00E676] transition-colors hover:text-[#00F2FE]"
                >
                  {copiedPromptId === record.id ? '已复制' : '复制'}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-[#1A2333] bg-[#070A13] p-4 text-xs leading-relaxed text-[#A0AEC0]">
                {record.style_prompt}
              </div>
            </div>
          )}

          {urls.length > 0 && (
            <div className="mb-6">
              <p className="mb-3 text-xs uppercase text-[#00F2FE]">全部图片（{urls.length} 张）</p>
              <div className="grid grid-cols-3 gap-3">
                {urls.map((url, index) => (
                  <div
                    key={index}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg border border-[#202B3A] bg-[#0A0F1D] transition-all hover:border-[#00F2FE]"
                  >
                    <img src={url} alt={`图片 ${index + 1}`} className="h-full w-full object-cover" />
                    <div className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-[#00F2FE]">
                      {index + 1}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
                      <button
                        onClick={() => onPreview(url)}
                        className="rounded-lg bg-black/50 px-3 py-1 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        预览
                      </button>
                    </div>
                    <button
                      onClick={() => onDownload(url, index)}
                      className="absolute bottom-1 right-1 rounded bg-[#00F2FE]/80 px-2 py-1 text-xs font-bold text-[#0A0F1D] opacity-0 transition-all group-hover:opacity-100"
                    >
                      下载
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onClose}
              className="min-w-[120px] flex-1 rounded-lg border border-[#202B3A] bg-[#0B0D17] py-3 text-sm font-bold text-white transition-all hover:border-[#00F2FE]"
            >
              关闭
            </button>
            {urls.length > 0 && (
              <>
                <button
                  onClick={() => void onDownloadAll(urls)}
                  className="min-w-[160px] flex-1 rounded-lg border border-[#00F2FE] bg-[#00F2FE] py-3 text-sm font-bold text-[#0A0F1D] shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all hover:shadow-[0_0_20px_rgba(0,242,254,0.6)]"
                >
                  批量下载图片
                </button>
                <button
                  onClick={() => urls[0] && onUpscale(record.id, urls[0])}
                  disabled={isUpscaling || Boolean(image4kUrl)}
                  className={`min-w-[160px] flex-1 rounded-lg border py-3 text-sm font-bold transition-all ${
                    image4kUrl
                      ? 'border-[#10B981] bg-[#10B981] text-[#0A0F1D]'
                      : isUpscaling
                        ? 'cursor-not-allowed border-gray-500/50 bg-gray-500/50 text-gray-400'
                        : 'border-[#F59E0B] bg-[#F59E0B] text-[#0A0F1D] hover:bg-[#FBBF24]'
                  }`}
                >
                  {image4kUrl ? '已生成 4K' : isUpscaling ? '处理中...' : '一键 4K 放大'}
                </button>
              </>
            )}
            <button
              onClick={onDelete}
              className="min-w-[120px] flex-1 rounded-lg border border-red-500/50 bg-red-500/20 py-3 text-sm font-bold text-red-400 transition-all hover:bg-red-500/30"
            >
              删除记录
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


