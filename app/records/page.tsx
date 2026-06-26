'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

interface GenerationRecord {
  id: string
  user_id: string
  prompt: string
  style_name: string
  style_prompt?: string
  model: string
  image_count: number
  image_urls: string
  status: string
  created_at: string
}

export default function RecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<GenerationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<{ credits: number } | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<GenerationRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [upscalingIds, setUpscalingIds] = useState<Set<string>>(new Set())
  const [image4kUrls, setImage4kUrls] = useState<Record<string, string>>({})
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalRecords, setTotalRecords] = useState(0)
  const [columns, setColumns] = useState<GenerationRecord[][]>([[], [], [], [], []])
  const observerRef = useRef<HTMLDivElement>(null)

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

  const fetchRecords = useCallback(async (pageNum: number = 1, reset: boolean = false) => {
    const session = getStoredSession()
    if (!session) {
      if (reset) {
        setRecords([])
        setColumns([[], [], [], [], []])
        setProfile({ credits: 3 })
        setLoading(false)
      }
      return
    }

    try {
      if (reset) {
        const meResponse = await fetch('/api/auth/me', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({})
        })

        const meData = await meResponse.json()

        if (!meData.success || !meData.user) {
          setRecords([])
          setColumns([[], [], [], [], []])
          setProfile({ credits: 3 })
          setLoading(false)
          return
        }

        setUser(meData.user)

        if (meData.profile) {
          setProfile({ credits: meData.profile.credits })
        }
      }

      const recordsResponse = await fetch('/api/user/records', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ 
          status: filterStatus,
          page: pageNum,
          limit: 20
        })
      })

      const recordsData = await recordsResponse.json()

      if (recordsData.success) {
        setTotalRecords(recordsData.total || 0)
        setHasMore(recordsData.hasMore || false)
        
        if (reset) {
          setRecords(recordsData.records || [])
          distributeRecordsToColumns(recordsData.records || [])
        } else {
          const newRecords = [...records, ...(recordsData.records || [])]
          setRecords(newRecords)
          distributeRecordsToColumns(newRecords)
        }
      } else {
        if (reset) {
          setRecords([])
          setColumns([[], [], []])
        }
      }
    } catch (error) {
      console.error('Fetch records error:', error)
      if (reset) {
        setRecords([])
        setColumns([[], [], []])
        setProfile({ credits: 3 })
      }
    }

    setLoading(false)
    setLoadingMore(false)
  }, [user?.id, filterStatus, records])

  const distributeRecordsToColumns = (recordsList: GenerationRecord[]) => {
    const COLUMN_COUNT = 5
    const newColumns: GenerationRecord[][] = Array.from({ length: COLUMN_COUNT }, () => [])
    recordsList.forEach((record, index) => {
      const colIndex = index % COLUMN_COUNT
      newColumns[colIndex].push(record)
    })
    setColumns(newColumns)
  }

  useEffect(() => {
    setCurrentPage(1)
    setLoading(true)
    fetchRecords(1, true)

    // 每5秒自动刷新记录
    const interval = setInterval(() => fetchRecords(1, true), 5000)
    
    // 监听生成完成事件
    const handleGenerationComplete = () => {
      fetchRecords(1, true)
    }
    window.addEventListener('ai-huatang-generation-complete', handleGenerationComplete)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('ai-huatang-generation-complete', handleGenerationComplete)
    }
  }, [filterStatus])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !loadingMore && hasMore && !loading) {
          setLoadingMore(true)
          setCurrentPage(prev => prev + 1)
          fetchRecords(currentPage + 1, false)
        }
      },
      { rootMargin: '200px' }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [loadingMore, hasMore, loading, currentPage, fetchRecords])

  const getModelPrice = (model: string): number => {
    return 3
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
      alert('图片链接已复制到剪贴板！')
    } catch {
      prompt('请复制图片链接:', url)
    }
  }

  const handleUpscale = async (recordId: string, imageUrl: string) => {
    if (upscalingIds.has(recordId)) return

    setUpscalingIds(prev => new Set([...prev, recordId]))

    try {
      const response = await fetch('/api/upscale', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ imageUrl, recordId })
      })

      const data = await response.json()

      if (data.success && data.url) {
        setImage4kUrls(prev => ({
          ...prev,
          [recordId]: data.url
        }))
        alert('4K 超清转换成功！')
      } else {
        alert(data.error || '4K 转换失败，请稍后重试')
      }
    } catch (error) {
      console.error('Upscale error:', error)
      alert('4K 转换失败，请稍后重试')
    } finally {
      setUpscalingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(recordId)
        return newSet
      })
    }
  }

  const handleCopyPrompt = async (prompt: string, id: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(id)
      setTimeout(() => setCopiedPrompt(null), 2000)
    } catch {
      alert('复制失败，请手动复制提示词')
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    const response = await fetch('/api/user/delete-record', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ id: recordId })
    })

    const data = await response.json()
    if (data.success) {
      setRecords(records.filter(r => r.id !== recordId))
      distributeRecordsToColumns(records.filter(r => r.id !== recordId))
      setTotalRecords(prev => prev - 1)
    }
  }

  const handleDeleteAll = async () => {
    const deletePromises = records.map(record =>
      fetch('/api/user/delete-record', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ id: record.id })
      })
    )

    await Promise.all(deletePromises)
    setRecords([])
    setColumns([[], [], []])
    setTotalRecords(0)
    setShowDeleteAllModal(false)
  }

  const downloadAllImages = async (urls: string[]) => {
    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await fetch(urls[i], { mode: 'cors' })
        const blob = await response.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `AI画堂_卡片_${i + 1}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error(`下载第 ${i + 1} 张图片失败:`, error)
      }
    }
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }

  const getFirstSentence = (text: string): string => {
    const sentences = text.split(/[。！？；\n]/).filter(s => s.trim())
    return sentences[0]?.trim() || text.substring(0, 30)
  }

  const openDetailModal = (record: GenerationRecord) => {
    setSelectedRecord(record)
    setShowDetailModal(true)
  }

  const handleLogout = () => {
    clearStoredSession()
    window.location.href = '/login'
  }

  const filteredRecords = records.filter(record => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'success') return record.status === 'success' || record.status === 'completed'
    if (filterStatus === 'failed') return record.status === 'failed' || record.status === 'error'
    return true
  })

  const statusCounts = {
    all: records.length,
    success: records.filter(r => r.status === 'success' || r.status === 'completed').length,
    failed: records.filter(r => r.status === 'failed' || r.status === 'error').length
  }

  return (
    <div className="min-h-screen bg-[#0B0D17]">
      <header className="bg-[#0B0D17] border-b border-[#202B3A]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full py-2 sm:py-3">
            <Link href="/" className="flex items-center select-none hover:opacity-80 transition-opacity">
              <img 
                src="/logo.png?v=6" 
                alt="AI画堂" 
                className="h-20 w-20 object-contain"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-4">
              <Link href="/dashboard" className="px-5 py-2.5 bg-[#141923] text-white font-semibold text-base tracking-wide md:text-lg border border-[#202B3A] hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all rounded-xl">
                创作
              </Link>
              <Link href="/records" className="px-5 py-2.5 bg-[#10B981] text-[#0B0D17] font-semibold text-base tracking-wide md:text-lg border border-[#202B3A] shadow-[0_0_15px_rgba(16,185,129,0.4)] rounded-xl">
                记录
              </Link>
              <Link href="/recharge" className="px-5 py-2.5 bg-[#141923] text-white font-semibold text-base tracking-wide md:text-lg border border-[#202B3A] hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all rounded-xl">
                卡密兑换
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#00F2FE]">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
              </div>
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#141923] border border-[#202B3A] flex items-center gap-1 sm:gap-1.5 rounded-lg">
                <span className="w-2 h-2 bg-[#10B981] border border-[#202B3A]"></span>
                <span className="text-xs text-[#00F2FE] hidden sm:inline">积分</span>
                <span className="font-bold text-white text-sm">{profile?.credits || 0}</span>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-[#141923] border border-[#202B3A] flex items-center justify-center hover:border-[#00F2FE] transition-colors rounded-lg"
                >
                  <span className="text-white font-bold text-sm">
                    {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 sm:w-56 bg-[#141923] border border-[#202B3A] shadow-lg z-50 rounded-xl overflow-hidden">
                    <div className="p-3 sm:p-4 border-b border-[#202B3A]">
                      <p className="text-xs text-[#00F2FE] mb-1">当前账号</p>
                      <p className="text-sm text-white font-medium truncate">{user?.email || '未登录'}</p>
                    </div>
                    <div className="p-2 border-b border-[#202B3A] md:hidden">
                      <Link href="/dashboard" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors rounded-lg">
                        🎨 创作工坊
                      </Link>
                      <Link href="/records" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors rounded-lg">
                        📁 生成记录
                      </Link>
                      <Link href="/recharge" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors rounded-lg">
                        🔑 卡密兑换
                      </Link>
                    </div>
                    <div className="p-2">
                      <Link href="/dashboard" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors rounded-lg hidden md:block">
                        创作工坊
                      </Link>
                      <Link href="/recharge" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors rounded-lg hidden md:block">
                        🔑 卡密兑换
                      </Link>
                      <div className="border-t border-[#202B3A] my-1 hidden md:block"></div>
                      <button 
                        onClick={() => { router.push('/profile'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors rounded-lg"
                      >
                        个人中心
                      </button>
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
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">🎨 生成记录</h2>
              <p className="text-sm text-[#00F2FE] mt-1">您的创作资产库 · 共 {totalRecords} 条</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteAllModal(true)}
                disabled={records.length === 0}
                className="px-4 py-2 bg-red-500/20 text-red-400 font-bold text-sm border border-red-500/50 hover:bg-red-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                🗑️ 全部删除
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-[#00E676] text-[#0B0D17] font-bold text-sm border border-[#202B3A] shadow-[0_0_15px_rgba(0,230,118,0.4)] hover:shadow-[0_0_20px_rgba(0,230,118,0.6)] transition-all"
              >
                返回创作
              </Link>
            </div>
          </div>

          <div className="flex gap-2 mb-6 p-1 bg-[#141923] rounded-xl w-fit">
            {[
              { key: 'all', label: '全部', color: 'bg-[#00F2FE] text-[#0A0F1D]' },
              { key: 'success', label: '生成成功', color: 'bg-[#10B981] text-[#0A0F1D]' },
              { key: 'failed', label: '生成失败', color: 'bg-red-500 text-white' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                  filterStatus === tab.key
                    ? `${tab.color} shadow-lg`
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {tab.label} ({statusCounts[tab.key as keyof typeof statusCounts]})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-20">
              {/* 改进的骨架屏 - 固定高度防止布局抖动 */}
              <div className="animate-pulse">
                <div className="w-12 h-12 bg-[#10B981] border border-[#202B3A] mx-auto mb-4 rounded-full"></div>
                <p className="text-[#00F2FE]">加载中...</p>
              </div>
              {/* 骨架屏网格 */}
              <div className="flex gap-3 mt-8 max-w-6xl mx-auto px-4">
                {[1, 2, 3, 4, 5].map(col => (
                  <div key={col} className="flex-1 space-y-3">
                    {[1, 2, 3].map(row => (
                      <div 
                        key={`${col}-${row}`} 
                        className="h-48 bg-[#141923] border border-[#1E293B] rounded-lg animate-pulse transition-all duration-300"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="border-2 border-dashed border-[#202B3A] rounded-none p-16 text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-[#141923] border border-[#00F2FE] shadow-[0_0_30px_rgba(0,242,254,0.3)] mb-8">
                <span className="text-5xl">🖼️</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">暂无手绘卡片记录</h3>
              <p className="text-[#00F2FE] mb-8 max-w-md mx-auto">
                立刻去控制台开启你的赛博草图之旅吧！<br/>
                <span className="text-[#94A3B8] text-sm">让你的创意在霓虹世界中自由绽放</span>
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-8 py-4 bg-[#00E676] text-[#0A0F1D] font-black text-base border border-[#202B3A] shadow-[0_0_20px_rgba(0,230,118,0.5)] hover:shadow-[0_0_30px_rgba(0,230,118,0.8)] transition-all"
              >
                ⚡ 前去创作
              </Link>
            </div>
          ) : (
            <div className="flex gap-3">
              {columns.map((column, colIndex) => (
                <div key={colIndex} className="flex-1 space-y-3">
                  {column.map((record) => {
                    const imageUrls = typeof record.image_urls === 'string' ? JSON.parse(record.image_urls) : record.image_urls
                    const totalCost = getModelPrice(record.model) * (record.image_count || 1)
                    const firstSentence = getFirstSentence(record.prompt)
                    
                    return (
                      <div 
                        key={record.id} 
                        className="bg-[#0D111A] border border-[#1E293B] overflow-hidden hover:border-[#00F2FE]/50 transition-all duration-300 rounded-lg group"
                      >
                        <div className="relative overflow-hidden bg-[#161a2b]">
                          {imageUrls && imageUrls[0] ? (
                            <img 
                              src={image4kUrls[record.id] || imageUrls[0]} 
                              alt="生成图" 
                              className="w-full h-auto object-contain"
                            />
                          ) : (
                            <div className="w-full aspect-square flex items-center justify-center text-[#94A3B8] bg-[#0B0D17] text-xs">
                              {record.status === 'failed' || record.status === 'error' ? (
                                <span className="text-center p-2">❌ 生成失败</span>
                              ) : (
                                <span>无图片</span>
                              )}
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-1.5 p-2">
                            {imageUrls && imageUrls[0] && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPreviewImageUrl(imageUrls?.[0] || '')
                                    setShowImagePreview(true)
                                  }}
                                  className="w-full px-2 py-1.5 bg-[#00E676] text-[#0A0F1D] text-xs font-bold hover:bg-[#00ff80] transition-all backdrop-blur-sm border border-[#00E676] flex items-center justify-center gap-1 rounded"
                                >
                                  🔍 预览
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDownload(image4kUrls[record.id] || imageUrls?.[0] || '', 0)
                                  }}
                                  className="w-full px-2 py-1.5 bg-[#00F2FE] text-[#0A0F1D] text-xs font-bold hover:bg-[#33f5ff] transition-all backdrop-blur-sm border border-[#00F2FE] flex items-center justify-center gap-1 rounded"
                                >
                                  ⬇️ 下载
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCopyLink(image4kUrls[record.id] || imageUrls?.[0] || '')
                                  }}
                                  className="w-full px-2 py-1.5 bg-white/90 text-[#0A0F1D] text-xs font-bold hover:bg-white transition-all backdrop-blur-sm border border-white/50 flex items-center justify-center gap-1 rounded"
                                >
                                  🔗 复制
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleUpscale(record.id, imageUrls?.[0] || '')
                                  }}
                                  disabled={upscalingIds.has(record.id) || image4kUrls[record.id]}
                                  className={`w-full px-2 py-1.5 text-xs font-bold transition-all backdrop-blur-sm border flex items-center justify-center gap-1 rounded ${
                                    image4kUrls[record.id]
                                      ? 'bg-[#10B981] text-[#0A0F1D] border-[#10B981]'
                                      : upscalingIds.has(record.id)
                                        ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed'
                                        : 'bg-[#F59E0B] text-[#0A0F1D] border-[#F59E0B] hover:bg-[#fbbf24]'
                                  }`}
                                >
                                  {image4kUrls[record.id] ? (
                                    <>✅ 已 4K</>
                                  ) : upscalingIds.has(record.id) ? (
                                    <>⏳ 处理中...</>
                                  ) : (
                                    <>📐 一键 4K 超清</>
                                  )}
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('确定要删除这条记录吗？')) {
                                  handleDeleteRecord(record.id)
                                }
                              }}
                              className="w-full px-2 py-1.5 bg-red-500/90 text-white text-xs font-bold hover:bg-red-500 transition-all backdrop-blur-sm border border-red-500/50 flex items-center justify-center gap-1 rounded"
                            >
                              🗑️ 删除
                            </button>
                          </div>

                          {imageUrls && imageUrls.length > 1 && (
                            <div className="absolute top-1 right-1">
                              <div className="px-1.5 py-0.5 bg-black/60 text-[#00F2FE] text-[10px] font-bold backdrop-blur-sm rounded">
                                +{imageUrls.length - 1}
                              </div>
                            </div>
                          )}

                          <div className="absolute top-1 left-1">
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-sm rounded ${
                              record.status === 'success' || record.status === 'completed'
                                ? 'bg-[#10B981]/80 text-white'
                                : record.status === 'failed' || record.status === 'error'
                                  ? 'bg-red-500/80 text-white'
                                  : 'bg-yellow-500/80 text-black'
                            }`}>
                              {record.status === 'success' || record.status === 'completed' ? '✓' : record.status === 'failed' || record.status === 'error' ? '✕' : '⏳'}
                            </span>
                          </div>
                        </div>

                        <div className="p-2">
                          <div className="flex items-center gap-1 flex-wrap mb-1">
                            <span className="px-1.5 py-0.5 bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold border border-[#10B981]/50 rounded">
                              {record.style_name}
                            </span>
                            <span className="px-2 py-0.5 bg-[#00F2FE]/20 text-[#00F2FE] text-xs font-bold border border-[#00F2FE]/50 rounded">
                              {record.model}
                            </span>
                            <span className="px-1.5 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-bold border border-[#F59E0B]/50 rounded">
                              ⚡️ {totalCost}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-[#94A3B8] truncate flex-1 mr-2">
                              {firstSentence}
                            </p>
                            <button
                              onClick={() => openDetailModal(record)}
                              className="text-[10px] text-[#00F2FE] hover:text-[#00E676] transition-colors"
                            >
                              ▼
                            </button>
                          </div>

                          <p className="text-[9px] text-[#475569] mt-1">
                            {formatDate(record.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {hasMore && !loading && (
            <div ref={observerRef} className="text-center py-8">
              {loadingMore ? (
                <div className="inline-flex items-center gap-2 px-6 py-3 bg-[#141923] border border-[#202B3A] rounded-xl">
                  <div className="w-4 h-4 border-2 border-[#00F2FE] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-[#00F2FE]">加载更多...</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setLoadingMore(true)
                    setCurrentPage(prev => prev + 1)
                    fetchRecords(currentPage + 1, false)
                  }}
                  className="px-8 py-3 bg-[#141923] border border-[#00F2FE] text-[#00F2FE] font-bold text-sm hover:bg-[#00F2FE] hover:text-[#0A0F1D] transition-all rounded-xl"
                >
                  📥 加载更多记录
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {showImagePreview && previewImageUrl && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50"
          onClick={() => setShowImagePreview(false)}
        >
          <button
            onClick={() => setShowImagePreview(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-red-500/90 text-white flex items-center justify-center text-xl font-bold hover:bg-red-500 transition-all z-10"
          >
            ✕
          </button>
          <img 
            src={previewImageUrl} 
            alt="预览图" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-[#141923] border border-[#202B3A] max-h-[90vh] overflow-y-auto rounded-xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">📋 记录详情</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 bg-[#202B3A] text-white flex items-center justify-center hover:bg-[#2a3343] transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="mb-6">
                <p className="text-xs text-[#00F2FE] mb-2 uppercase">原始文本</p>
                <p className="text-sm text-white leading-relaxed whitespace-pre-wrap bg-[#0B0D17] p-4 border border-[#202B3A]">
                  {selectedRecord.prompt}
                </p>
              </div>

              {selectedRecord.style_prompt && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-[#00F2FE] uppercase">DeepSeek 翻译 Prompt</p>
                    <button
                      onClick={() => handleCopyPrompt(selectedRecord.style_prompt || '', selectedRecord.id)}
                      className="text-xs text-[#00E676] hover:text-[#00F2FE] transition-colors"
                    >
                      {copiedPrompt === selectedRecord.id ? '✓ 已复制' : '📋 复制'}
                    </button>
                  </div>
                  <div className="bg-[#070A13] border border-[#1A2333] p-4 text-xs font-mono text-[#A0AEC0] leading-relaxed max-h-48 overflow-y-auto">
                    {selectedRecord.style_prompt}
                  </div>
                </div>
              )}

              {selectedRecord.image_urls && (
                <div className="mb-6">
                  <p className="text-xs text-[#00F2FE] mb-3 uppercase">全部图片 ({JSON.parse(selectedRecord.image_urls).length}张)</p>
                  <div className="grid grid-cols-3 gap-3">
                    {JSON.parse(selectedRecord.image_urls).map((url: string, index: number) => (
                      <div key={index} className="relative aspect-square bg-[#0A0F1D] border border-[#202B3A] overflow-hidden group cursor-pointer hover:border-[#00F2FE] transition-all">
                        <img src={url} alt={`图 ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-[#00F2FE] text-[10px]">
                          {index + 1}
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <button
                            onClick={() => {
                              setPreviewImageUrl(url)
                              setShowImagePreview(true)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-2xl"
                          >
                            🔍
                          </button>
                        </div>
                        <button
                          onClick={() => handleDownload(url, index)}
                          className="absolute bottom-1 right-1 w-6 h-6 bg-[#00F2FE]/80 text-[#0A0F1D] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs font-bold"
                        >
                          ⬇️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 py-3 bg-[#0B0D17] border border-[#202B3A] text-white font-bold text-sm hover:border-[#00F2FE] transition-all"
                >
                  关闭
                </button>
                {selectedRecord.image_urls && (
                  <button
                          onClick={() => {
                            const urls = JSON.parse(selectedRecord.image_urls)
                            downloadAllImages(urls)
                          }}
                          className="flex-1 py-3 bg-[#00F2FE] text-[#0A0F1D] font-bold text-sm border border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.4)] hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all"
                        >
                          📥 一键批量下载全部图片
                        </button>
                        <button
                          onClick={() => {
                            const urls = JSON.parse(selectedRecord.image_urls)
                            if (urls && urls[0]) {
                              handleUpscale(selectedRecord.id, urls[0])
                            }
                          }}
                          disabled={upscalingIds.has(selectedRecord.id) || image4kUrls[selectedRecord.id]}
                          className={`flex-1 py-3 font-bold text-sm border transition-all ${
                            image4kUrls[selectedRecord.id]
                              ? 'bg-[#10B981] text-[#0A0F1D] border-[#10B981]'
                              : upscalingIds.has(selectedRecord.id)
                                ? 'bg-gray-500/50 text-gray-400 border-gray-500/50 cursor-not-allowed'
                                : 'bg-[#F59E0B] text-[#0A0F1D] border-[#F59E0B] hover:bg-[#fbbf24]'
                          }`}
                        >
                          {image4kUrls[selectedRecord.id] ? (
                            '✅ 已 4K'
                          ) : upscalingIds.has(selectedRecord.id) ? (
                            '⏳ 处理中...'
                          ) : (
                            '📐 一键 4K 超清'
                          )}
                        </button>
                )}
                <button
                  onClick={() => {
                    if (confirm('确定要删除这条记录吗？')) {
                      handleDeleteRecord(selectedRecord.id)
                    }
                    setShowDetailModal(false)
                  }}
                  className="flex-1 py-3 bg-red-500/20 text-red-400 font-bold text-sm border border-red-500/50 hover:bg-red-500/30 transition-all"
                >
                  🗑️ 删除记录
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#141923] border border-[#202B3A] rounded-xl">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-500/20 border border-red-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">确认清空所有记录</h3>
                <p className="text-sm text-[#94A3B8]">
                  此操作将删除您的全部 {records.length} 条生成记录，且无法恢复。<br/>
                  <span className="text-red-400">请谨慎操作！</span>
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteAllModal(false)}
                  className="flex-1 py-3 bg-[#0B0D17] border border-[#202B3A] text-white font-bold text-sm hover:border-[#00F2FE] transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="flex-1 py-3 bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
                >
                  ✕ 确认删除全部
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        show={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <TermsModal
        show={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      <footer className="fixed bottom-0 left-0 right-0 py-2.5 bg-[#030712]/95 border-t border-[#1e293b]/50 backdrop-blur-sm z-40">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            登录或使用本站即代表您同意{' '}
            <button 
              onClick={() => setShowTermsModal(true)}
              className="text-[#10B981] hover:text-[#00F2FE] font-semibold underline underline-offset-2 decoration-[#10B981]/50 hover:decoration-[#00F2FE] transition-all duration-300 hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] rounded px-1"
            >
              《安全合规与使用须知》
            </button>
          </p>
        </div>
      </footer>
    </div>
  )
}
