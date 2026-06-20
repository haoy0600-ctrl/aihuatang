'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'

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

interface StyleStat {
  name: string
  count: number
  percentage: number
}

export default function RecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<GenerationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<{ credits: number } | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<GenerationRecord | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [batchMode, setBatchMode] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [showImagePreview, setShowImagePreview] = useState(false)

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

  useEffect(() => {
    const fetchRecords = async () => {
      if (!supabase) {
        setRecords([])
        setProfile({ credits: 3 })
        setLoading(false)
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      
      if (!sessionData?.session) {
        setRecords([])
        setProfile({ credits: 3 })
        setLoading(false)
        return
      }

      setUser(sessionData.session.user)
      const userId = sessionData.session.user.id

      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()
      
      if (profileData) {
        setProfile({ credits: profileData.credits })
      }

      const { data: recordsData } = await supabase
        .from('generation_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      setRecords(recordsData || [])
      setLoading(false)
    }

    fetchRecords()
    
    const interval = setInterval(fetchRecords, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const getModelPrice = (model: string): number => {
    return 3 // 所有模型统一3积分
  }

  const getTotalGenerated = (): number => {
    return records.reduce((sum, r) => sum + (r.image_count || 1), 0)
  }

  const getTotalConsumed = (): number => {
    return records.reduce((sum, r) => sum + getModelPrice(r.model) * (r.image_count || 1), 0)
  }

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `neon-sketch-${Date.now()}-${index + 1}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
      const link = document.createElement('a')
      link.href = url
      link.download = `neon-sketch-${Date.now()}-${index + 1}.png`
      link.click()
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
    if (!confirm('确定要删除这条记录吗？')) return
    if (!supabase) return

    const { error } = await supabase
      .from('generation_records')
      .delete()
      .eq('id', recordId)

    if (!error) {
      setRecords(records.filter(r => r.id !== recordId))
      selectedRecords.delete(recordId)
      setSelectedRecords(new Set(selectedRecords))
    }
  }

  const downloadAllImages = async (urls: string[]) => {
    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await fetch(urls[i])
        const blob = await response.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `AI画堂_卡片_${i + 1}.png`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        // 微小延迟防止浏览器拦截并发下载
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error(`下载第 ${i + 1} 张图片失败:`, error)
      }
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRecords.size === 0) return
    if (!confirm(`确定要删除选中的 ${selectedRecords.size} 条记录吗？`)) return
    if (!supabase) return

    const deletePromises = Array.from(selectedRecords).map(id => 
      supabase.from('generation_records').delete().eq('id', id)
    )

    await Promise.all(deletePromises)
    setRecords(records.filter(r => !selectedRecords.has(r.id)))
    setSelectedRecords(new Set())
    setBatchMode(false)
  }

  const handleBatchDownload = async () => {
    if (selectedRecords.size === 0) return

    setDownloading(true)
    const zip = new JSZip()

    const selectedRecs = records.filter(r => selectedRecords.has(r.id))

    for (const record of selectedRecs) {
      const imageUrls = typeof record.image_urls === 'string' ? JSON.parse(record.image_urls) : record.image_urls
      const folderName = `${record.style_name.replace(/\s+/g, '_')}_${new Date(record.created_at).toISOString().split('T')[0]}`
      const folder = zip.folder(folderName)

      if (folder && imageUrls) {
        for (let i = 0; i < imageUrls.length; i++) {
          try {
            const response = await fetch(imageUrls[i])
            const blob = await response.blob()
            folder.file(`image_${i + 1}.png`, blob)
          } catch (error) {
            console.error(`Failed to download image:`, error)
          }
        }
      }
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `neon-sketch-batch-${Date.now()}.zip`)
    } catch (error) {
      console.error('Failed to create zip:', error)
      alert('打包下载失败，请重试')
    }

    setDownloading(false)
  }

  const toggleRecordSelection = (recordId: string) => {
    const newSelected = new Set(selectedRecords)
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId)
    } else {
      newSelected.add(recordId)
    }
    setSelectedRecords(newSelected)
  }

  const selectAll = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set())
    } else {
      setSelectedRecords(new Set(records.map(r => r.id)))
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

  return (
    <div className="min-h-screen bg-[#0B0D17]">
      <header className="bg-[#0B0D17] border-b border-[#202B3A]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full py-2 sm:py-3">
            <Link href="/" className="flex items-center select-none hover:opacity-80 transition-opacity">
              <img 
                src="/logo.png?v=6" 
                alt="AI画堂" 
                className="h-10 sm:h-12 w-10 sm:w-12 object-contain rounded-xl"
              />
            </Link>

            {/* 手机端隐藏导航 */}
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
              {/* 手机端隐藏时间 */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#00F2FE]">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
              </div>
              {/* 积分显示 */}
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#141923] border border-[#202B3A] flex items-center gap-1 sm:gap-1.5 rounded-lg">
                <span className="w-2 h-2 bg-[#10B981] border border-[#202B3A]"></span>
                <span className="text-xs text-[#00F2FE] hidden sm:inline">积分</span>
                <span className="font-bold text-white text-sm">{profile?.credits || 0}</span>
              </div>
              {/* 用户头像 */}
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
                    {/* 手机端显示导航链接 */}
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
                        onClick={() => { if (supabase) supabase.auth.signOut(); window.location.href = '/login'; }}
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">🎨 生成记录</h2>
              <p className="text-sm text-[#00F2FE] mt-1">您的创作资产库</p>
            </div>
            <div className="flex gap-3">
              {records.length > 0 && (
                <button
                  onClick={() => {
                    setBatchMode(!batchMode)
                    setSelectedRecords(new Set())
                  }}
                  className={`px-4 py-2 font-bold text-sm border transition-all ${
                    batchMode 
                      ? 'bg-[#00F2FE] text-[#0A0F1D] border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.5)]' 
                      : 'bg-[#141923] text-white border-[#202B3A] hover:border-[#00F2FE] hover:text-[#00F2FE]'
                  }`}
                >
                  {batchMode ? '✓ 退出批量' : '📦 批量管理'}
                </button>
              )}
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-[#00E676] text-[#0B0D17] font-bold text-sm border border-[#202B3A] shadow-[0_0_15px_rgba(0,230,118,0.4)] hover:shadow-[0_0_20px_rgba(0,230,118,0.6)] transition-all"
              >
                返回创作
              </Link>
            </div>
          </div>

          {batchMode && records.length > 0 && (
            <div className="mb-4 flex items-center gap-4 p-3 bg-[#141923] border border-[#00F2FE]/30">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedRecords.size === records.length && records.length > 0}
                  onChange={selectAll}
                  className="w-4 h-4 accent-[#00F2FE]"
                />
                <span className="text-sm text-white">全选</span>
              </label>
              <span className="text-sm text-[#00F2FE]">已选中 {selectedRecords.size} 条记录</span>
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <div className="animate-pulse">
                <div className="w-12 h-12 bg-[#10B981] border border-[#202B3A] mx-auto mb-4"></div>
                <p className="text-[#00F2FE]">加载中...</p>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {records.map((record) => {
                const imageUrls = typeof record.image_urls === 'string' ? JSON.parse(record.image_urls) : record.image_urls
                const totalCost = getModelPrice(record.model) * (record.image_count || 1)
                const isSelected = selectedRecords.has(record.id)
                const firstSentence = getFirstSentence(record.prompt)
                
                return (
                  <div 
                    key={record.id} 
                    className={`bg-[#0D111A] border overflow-hidden hover:border-[#00F2FE]/50 transition-all duration-300 relative rounded-lg ${
                      isSelected ? 'border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.3)]' : 'border-[#1E293B]'
                    }`}
                  >
                    {batchMode && (
                      <div className="absolute top-1.5 left-1.5 z-20">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRecordSelection(record.id)}
                          className="w-3 h-3 accent-[#00F2FE] cursor-pointer"
                        />
                      </div>
                    )}

                    <div className="relative group overflow-hidden bg-[#161a2b]">
                      {imageUrls && imageUrls[0] ? (
                        <img 
                          src={imageUrls[0]} 
                          alt="生成图" 
                          className="w-full max-h-36 sm:max-h-40 object-contain mx-auto"
                        />
                      ) : (
                        <div className="w-full aspect-square flex items-center justify-center text-[#94A3B8] bg-[#0B0D17]">
                          无图片
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2 p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImageUrl(imageUrls?.[0] || '')
                            setShowImagePreview(true)
                          }}
                          className="w-full max-w-[100px] px-3 py-2 bg-[#00E676] text-[#0A0F1D] text-xs font-bold hover:bg-[#00ff80] transition-all backdrop-blur-sm border border-[#00E676] flex items-center justify-center gap-1.5"
                        >
                          <span className="text-sm">🔍</span>
                          <span>预览</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(imageUrls?.[0] || '', 0)
                          }}
                          className="w-full max-w-[100px] px-3 py-2 bg-[#00F2FE] text-[#0A0F1D] text-xs font-bold hover:bg-[#33f5ff] transition-all backdrop-blur-sm border border-[#00F2FE] flex items-center justify-center gap-1.5"
                        >
                          <span className="text-sm">⬇️</span>
                          <span>下载</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopyLink(imageUrls?.[0] || '')
                          }}
                          className="w-full max-w-[100px] px-3 py-2 bg-white/90 text-[#0A0F1D] text-xs font-bold hover:bg-white transition-all backdrop-blur-sm border border-white/50 flex items-center justify-center gap-1.5"
                        >
                          <span className="text-sm">🔗</span>
                          <span>复制</span>
                        </button>
                      </div>

                      {imageUrls && imageUrls.length > 1 && (
                        <div className="absolute top-1.5 right-1.5">
                          <div className="px-1.5 py-0.5 bg-black/60 text-[#00F2FE] text-[9px] backdrop-blur-sm">
                            +{imageUrls.length - 1}
                          </div>
                        </div>
                      )}

                      {batchMode && (
                        <div className="absolute top-1.5 right-1.5">
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="w-5 h-5 bg-red-500/90 text-white text-[10px] flex items-center justify-center hover:bg-red-500 transition-all backdrop-blur-sm"
                            title="删除记录"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="p-2">
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        <span className="px-1.5 py-0.5 bg-[#10B981]/20 text-[#10B981] text-[9px] font-bold border border-[#10B981]/50">
                          {record.style_name}
                        </span>
                        <span className="px-1.5 py-0.5 bg-[#00F2FE]/20 text-[#00F2FE] text-[9px] font-bold border border-[#00F2FE]/50">
                          {record.model}
                        </span>
                        <span className="px-1.5 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] text-[9px] font-bold border border-[#F59E0B]/50">
                          ⚡️ {totalCost}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-[9px] text-[#94A3B8] truncate flex-1 mr-1.5">
                          {firstSentence}
                        </p>
                        <button
                          onClick={() => openDetailModal(record)}
                          className="text-[9px] text-[#00F2FE] hover:text-[#00E676] transition-colors"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
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
          <div className="w-full max-w-2xl bg-[#141923] border border-[#202B3A] max-h-[90vh] overflow-y-auto rounded-lg">
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
                      <a 
                        key={index} 
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square bg-[#0A0F1D] border border-[#202B3A] overflow-hidden group cursor-pointer hover:border-[#00F2FE] transition-all"
                      >
                        <img src={url} alt={`图 ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/60 text-[#00F2FE] text-[10px]">
                          {index + 1}
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-2xl">🔍</span>
                        </div>
                      </a>
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
                    handleDeleteRecord(selectedRecord.id)
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

      {batchMode && selectedRecords.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#141923]/95 backdrop-blur-lg border-t border-[#00F2FE]/30 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-[#00F2FE] font-bold">
                已选中 <span className="text-white text-xl">{selectedRecords.size}</span> 条记录
              </span>
              <span className="text-[#94A3B8] text-sm">
                共 {records.reduce((sum, r) => selectedRecords.has(r.id) ? sum + (r.image_count || 1) : sum, 0)} 张图片
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBatchDelete}
                className="px-5 py-2.5 bg-red-500/20 text-red-400 font-bold text-sm border border-red-500/50 hover:bg-red-500/30 transition-all"
              >
                🗑️ 批量删除
              </button>
              <button
                onClick={handleBatchDownload}
                disabled={downloading}
                className="px-5 py-2.5 bg-[#00F2FE] text-[#0A0F1D] font-bold text-sm border border-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.4)] hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all disabled:opacity-50"
              >
                {downloading ? '⏳ 打包中...' : '📥 一键打包下载 (ZIP)'}
              </button>
              <button
                onClick={() => {
                  setBatchMode(false)
                  setSelectedRecords(new Set())
                }}
                className="px-5 py-2.5 bg-[#202B3A] text-white font-bold text-sm border border-[#202B3A] hover:bg-[#2a3343] transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        show={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  )
}