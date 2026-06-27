'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { HANDDRAWN_STYLES, HanddrawnStyle } from '@/config/styles'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

interface UserProfile {
  id: string
  email: string
  credits: number
}

interface CustomStyle {
  id: number
  name: string
  styleKeywords: string
  layoutDirectives: string
}

type GenerationMode = 'text' | 'image'
type GenerationStatus = 'idle' | 'loading' | 'success'
type ModelType = 'GPT-Image-2' | 'NanoBanana2'

const ASPECT_RATIOS = [
  { label: 'auto', value: 'auto', note: '自动适配' },
  { label: '1:1', value: '1:1', note: '方形封面' },
  { label: '3:4', value: '3:4', note: '竖版配图' },
  { label: '9:16', value: '9:16', note: '短视频封面' },
  { label: '16:9', value: '16:9', note: '横版演示 / PPT' },
  { label: '3:2', value: '3:2', note: '通用横构图' },
  { label: '2:3', value: '2:3', note: '海报长图' },
  { label: '4:3', value: '4:3', note: '课程配图' },
  { label: '21:9', value: '21:9', note: '超宽横幅' },
  { label: '9:21', value: '9:21', note: '超长竖图' },
  { label: '1:3', value: '1:3', note: '窄长竖版' },
  { label: '3:1', value: '3:1', note: '窄长横版' },
  { label: '1:2', value: '1:2', note: '双倍长图' },
]

const systemStyleLabel = (_style: HanddrawnStyle, index: number) => `系统风格 ${index + 1}`
const getStoredJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  const raw = localStorage.getItem(key)
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const abortController = useRef<AbortController | null>(null)

  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')

  const [genMode, setGenMode] = useState<GenerationMode>(() => {
    if (typeof window === 'undefined') return 'text'
    return (localStorage.getItem('ai_huatang_draft_genMode') as GenerationMode) || 'text'
  })
  const [activeTab, setActiveTab] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    return parseInt(localStorage.getItem('ai_huatang_draft_activeTab') || '1', 10)
  })
  const [totalTabs, setTotalTabs] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    return parseInt(localStorage.getItem('ai_huatang_draft_totalTabs') || '1', 10)
  })
  const [textSegments, setTextSegments] = useState<string[]>(() => {
    if (typeof window === 'undefined') return Array(10).fill('')
    return getStoredJson('ai_huatang_draft_textSegments', Array(10).fill(''))
  })
  const [uploadedImages, setUploadedImages] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    return getStoredJson('ai_huatang_draft_uploadedImages', [])
  })
  const [selectedModel, setSelectedModel] = useState<ModelType>(() => {
    if (typeof window === 'undefined') return 'GPT-Image-2'
    return (localStorage.getItem('ai_huatang_draft_model') as ModelType) || 'GPT-Image-2'
  })
  const [selectedRatio, setSelectedRatio] = useState(() => {
    if (typeof window === 'undefined') return '9:16'
    return localStorage.getItem('ai_huatang_draft_ratio') || '9:16'
  })
  const [selectedResolution, setSelectedResolution] = useState(() => {
    if (typeof window === 'undefined') return '2K'
    return localStorage.getItem('ai_huatang_draft_resolution') || '2K'
  })
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const value = localStorage.getItem('ai_huatang_draft_styleId')
    return value ? parseInt(value, 10) : null
  })
  const [customStyleName, setCustomStyleName] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('ai_huatang_draft_customStyleName') || ''
  })
  const [customStylePrompt, setCustomStylePrompt] = useState(() => {
    if (typeof window === 'undefined') return ''
    return localStorage.getItem('ai_huatang_draft_customStylePrompt') || ''
  })
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(() => {
    if (typeof window === 'undefined') return 'idle'
    const saved = localStorage.getItem('ai_huatang_draft_status') as GenerationStatus
    return saved === 'loading' ? 'idle' : saved || 'idle'
  })
  const [generatedImages, setGeneratedImages] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    return getStoredJson('ai_huatang_last_preview', [])
  })
  const [customStylesList, setCustomStylesList] = useState<CustomStyle[]>([])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [isGuideOpen, setIsGuideOpen] = useState(false)
  const [isApiNoticeOpen, setIsApiNoticeOpen] = useState(false)
  const [isExpanding, setIsExpanding] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }))
    }, 1000)

    setCurrentTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      const session = getStoredSession()
      if (!session) {
        router.replace('/login')
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({}),
        })

        const data = await response.json()
        if (!response.ok || !data.success || !data.user || !data.profile) {
          clearStoredSession()
          router.replace('/login')
          return
        }

        setUser(data.user)
        setProfile(data.profile)
      } catch (error) {
        console.error('Fetch profile error:', error)
        clearStoredSession()
        router.replace('/login')
        return
      } finally {
        setLoading(false)
      }
    }

    void fetchProfile()
  }, [router])

  useEffect(() => {
    setCustomStylesList(getStoredJson<CustomStyle[]>('customStyles', []))
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    localStorage.setItem('ai_huatang_draft_genMode', genMode)
    localStorage.setItem('ai_huatang_draft_activeTab', String(activeTab))
    localStorage.setItem('ai_huatang_draft_totalTabs', String(totalTabs))
    localStorage.setItem('ai_huatang_draft_textSegments', JSON.stringify(textSegments))
    localStorage.setItem('ai_huatang_draft_uploadedImages', JSON.stringify(uploadedImages))
    localStorage.setItem('ai_huatang_draft_model', selectedModel)
    localStorage.setItem('ai_huatang_draft_ratio', selectedRatio)
    localStorage.setItem('ai_huatang_draft_resolution', selectedResolution)
    localStorage.setItem('ai_huatang_draft_customStyleName', customStyleName)
    localStorage.setItem('ai_huatang_draft_customStylePrompt', customStylePrompt)
    localStorage.setItem('ai_huatang_draft_status', generationStatus)

    if (selectedStyleId) {
      localStorage.setItem('ai_huatang_draft_styleId', String(selectedStyleId))
    } else {
      localStorage.removeItem('ai_huatang_draft_styleId')
    }
  }, [
    activeTab,
    customStyleName,
    customStylePrompt,
    genMode,
    generationStatus,
    selectedModel,
    selectedRatio,
    selectedResolution,
    selectedStyleId,
    textSegments,
    totalTabs,
    uploadedImages,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return

    localStorage.setItem('customStyles', JSON.stringify(customStylesList))

    if (generatedImages.length > 0) {
      localStorage.setItem('ai_huatang_last_preview', JSON.stringify(generatedImages))
    } else {
      localStorage.removeItem('ai_huatang_last_preview')
    }
  }, [customStylesList, generatedImages])

  const validSegments = useMemo(
    () => textSegments.slice(0, totalTabs).filter((item) => item.trim() !== ''),
    [textSegments, totalTabs]
  )

  const getResolutionPrice = (resolution: string) => {
    switch (resolution) {
      case '1K':
        return 2
      case '2K':
        return 4
      case '4K':
        return 8
      default:
        return 2
    }
  }

  const currentSinglePrice = getResolutionPrice(selectedResolution)
  const outputCount = genMode === 'text' ? validSegments.length : uploadedImages.length
  const totalCost = currentSinglePrice * outputCount
  const currentWordCount = getEffectiveWordCount(textSegments[activeTab - 1] || '')

  const getAspectClass = () => {
    const ratioMap: Record<string, string> = {
      auto: 'aspect-[9/16]',
      '1:1': 'aspect-square',
      '3:4': 'aspect-[3/4]',
      '9:16': 'aspect-[9/16]',
      '16:9': 'aspect-video',
      '3:2': 'aspect-[3/2]',
      '2:3': 'aspect-[2/3]',
      '4:3': 'aspect-[4/3]',
      '21:9': 'aspect-[21/9]',
      '9:21': 'aspect-[9/21]',
      '1:3': 'aspect-[1/3]',
      '3:1': 'aspect-[3/1]',
      '1:2': 'aspect-[1/2]',
    }

    return ratioMap[selectedRatio] || 'aspect-[9/16]'
  }

  const handleLogout = () => {
    clearStoredSession()
    router.replace('/login')
  }

  const handleAddTab = () => {
    if (totalTabs >= 10) return
    setTotalTabs((prev) => prev + 1)
    setActiveTab(totalTabs + 1)
  }

  const handleRemoveTab = () => {
    if (totalTabs <= 1) return

    const nextSegments = [...textSegments]
    nextSegments.splice(activeTab - 1, 1)
    nextSegments.push('')
    setTextSegments(nextSegments)
    setTotalTabs((prev) => prev - 1)
    setActiveTab((prev) => Math.min(prev, totalTabs - 1))
  }

  const handleTextChange = (value: string) => {
    const nextSegments = [...textSegments]
    nextSegments[activeTab - 1] = value
    setTextSegments(nextSegments)
  }

  const handleAIExpand = async () => {
    const currentText = textSegments[activeTab - 1]?.trim() || ''
    if (!currentText) {
      alert('请先输入需要优化的文案')
      return
    }

    setIsExpanding(true)

    try {
      const response = await fetch('/api/expand-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText }),
      })

      const data = await response.json()
      if (!response.ok || !data.success || !data.expandedText) {
        alert(data.error || 'AI 扩写失败，请稍后重试')
        return
      }

      const nextSegments = [...textSegments]
      nextSegments[activeTab - 1] = data.expandedText
      setTextSegments(nextSegments)
    } catch (error) {
      console.error('AI expand error:', error)
      alert('AI 扩写请求失败，请检查网络后重试')
    } finally {
      setIsExpanding(false)
    }
  }
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return

    const remaining = Math.max(0, 10 - uploadedImages.length)
    files.slice(0, remaining).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (loadEvent) => {
        const result = loadEvent.target?.result as string
        if (!result) return
        setUploadedImages((prev) => (prev.length >= 10 ? prev : [...prev, result]))
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleStyleChange = (styleId: number) => {
    setSelectedStyleId(styleId)

    const customStyle = customStylesList.find((item) => item.id === styleId)
    if (customStyle) {
      setCustomStyleName(customStyle.name)
      setCustomStylePrompt([customStyle.styleKeywords, customStyle.layoutDirectives].filter(Boolean).join('\n'))
      return
    }

    const systemStyleIndex = HANDDRAWN_STYLES.findIndex((item) => item.id === styleId)
    const systemStyle = systemStyleIndex >= 0 ? HANDDRAWN_STYLES[systemStyleIndex] : null
    if (systemStyle) {
      setCustomStyleName(systemStyleLabel(systemStyle, systemStyleIndex))
      setCustomStylePrompt([systemStyle.styleKeywords, systemStyle.layoutDirectives].filter(Boolean).join('\n'))
    }
  }

  const handleSaveCustomStyle = () => {
    if (!customStyleName.trim()) {
      alert('请填写风格名称')
      return
    }
    if (!customStylePrompt.trim()) {
      alert('请填写风格 Prompt')
      return
    }

    const nextStyle: CustomStyle = {
      id: Date.now(),
      name: customStyleName.trim(),
      styleKeywords: customStylePrompt.trim(),
      layoutDirectives: '',
    }

    setCustomStylesList((prev) => [...prev, nextStyle])
    setSelectedStyleId(nextStyle.id)
    alert('自定义风格已保存')
  }
  const handleDeleteCustomStyle = (styleId: number) => {
    setCustomStylesList((prev) => prev.filter((item) => item.id !== styleId))
    if (selectedStyleId === styleId) {
      setSelectedStyleId(null)
      setCustomStyleName('')
      setCustomStylePrompt('')
    }
  }

  const handleSelectCustomStyle = (style: CustomStyle) => {
    setSelectedStyleId(style.id)
    setCustomStyleName(style.name)
    setCustomStylePrompt(style.styleKeywords)
  }

  const executeActualGeneration = async () => {
    if (!selectedStyleId) {
      alert('请先选择一个风格')
      return
    }

    const selectedCustomStyle = customStylesList.find((item) => item.id === selectedStyleId)
    const selectedSystemStyle = HANDDRAWN_STYLES.find((item) => item.id === selectedStyleId)
    const activeStyle = selectedCustomStyle || selectedSystemStyle

    if (!activeStyle) {
      alert('未找到对应风格，请重新选择')
      return
    }

    if (genMode === 'text' && validSegments.length === 0) {
      alert('请先输入要生成的文案')
      return
    }

    if (genMode === 'image' && uploadedImages.length === 0) {
      alert('请先上传参考图片')
      return
    }

    if (!profile?.id) {
      alert('登录状态已失效，请重新登录')
      router.replace('/login')
      return
    }

    if (profile.credits < totalCost) {
      alert(`积分不足，本次需要 ${totalCost} 积分，当前仅剩 ${profile.credits} 积分`)
      return
    }

    setGenerationStatus('loading')
    setGeneratedImages([])
    setProgress(0)
    localStorage.removeItem('ai_huatang_last_preview')

    let currentProgress = 0
    const progressTimer = setInterval(() => {
      currentProgress += (100 - currentProgress) * 0.05
      setProgress(Math.min(Math.round(currentProgress), 98))
    }, 1500)

    abortController.current = new AbortController()
    const timeoutId = setTimeout(() => abortController.current?.abort(), 300000)

    try {
      const resolutionMap: Record<string, string> = {
        '1K': '1024x1024',
        '2K': '2048x2048',
        '4K': '4096x4096',
      }

      const imageSize = resolutionMap[selectedResolution] || '2048x2048'
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: profile.id,
          inputContents: genMode === 'text' ? validSegments : [],
          referenceImages: genMode === 'image' ? uploadedImages : [],
          styleName: selectedCustomStyle ? selectedCustomStyle.name : selectedSystemStyle?.name,
          customStyle: customStylePrompt,
          aspectRatio: selectedRatio,
          modelType: selectedModel,
          resolution: selectedResolution,
          imageSize,
          mode: genMode,
        }),
        signal: abortController.current.signal,
      })

      const rawText = await response.text()
      let data: any

      try {
        data = JSON.parse(rawText)
      } catch (parseError: any) {
        throw new Error(`服务返回异常：${parseError.message}`)
      }

      if (!response.ok || !data.success) {
        const errorMessage = data.error || data.message || '生成失败，请稍后重试'

        if (String(errorMessage).includes('VIP 4K')) {
          const confirmed = confirm(
            '当前账号没有 VIP 4K 权限，无法使用 4K 极清生成功能。\n\n4K 需要更高等级卡密或高级权益解锁。\n\n现在前往充值页吗？'
          )
          if (confirmed) {
            router.push('/recharge')
          }
        } else {
          alert(errorMessage)
        }

        setGenerationStatus('idle')
        return
      }

      const nextImages = data.imageUrls || (data.imageUrl ? [data.imageUrl] : [])
      setProgress(100)
      setGeneratedImages(nextImages)
      setGenerationStatus('success')
      window.dispatchEvent(new Event('ai-huatang-generation-complete'))

      if (data.creditsRemaining !== undefined && profile) {
        setProfile({ ...profile, credits: data.creditsRemaining })
      }
    } catch (error: any) {
      console.error('Generation error:', error)
      if (error.name === 'AbortError') {
        alert('生成超时，已自动取消，请稍后再试')
      } else {
        alert(error.message || '生成失败，请稍后重试')
      }
      setGenerationStatus('idle')
    } finally {
      clearInterval(progressTimer)
      clearTimeout(timeoutId)
      abortController.current = null
    }
  }
  const handleGenerate = () => {
    if (genMode === 'text' && validSegments.length === 0) {
      alert('请先输入要生成的文案')
      return
    }

    if (genMode === 'image' && uploadedImages.length === 0) {
      alert('请先上传参考图片')
      return
    }

    if (!selectedStyleId) {
      alert('请先选择一个风格')
      return
    }

    if (localStorage.getItem('has_seen_api_notice')) {
      void executeActualGeneration()
      return
    }

    setIsApiNoticeOpen(true)
  }
  const handleConfirmNotice = () => {
    localStorage.setItem('has_seen_api_notice', 'true')
    setIsApiNoticeOpen(false)
    void executeActualGeneration()
  }

  const handleDownload = async (url: string, index: number) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `handdrawn-${Date.now()}-${index + 1}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
      const link = document.createElement('a')
      link.href = url
      link.download = `handdrawn-${Date.now()}-${index + 1}.png`
      link.click()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040D0A]">
        <p className="text-sm text-[#03F09C]">正在加载...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#040D0A]">
      <header className="border-b border-[#142D24] bg-[#040D0A]">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-1 sm:py-2">
            <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
              <img src="/logo.png?v=6" alt="AI画堂" className="h-20 w-20 object-contain" />
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <button
                onClick={() => setIsGuideOpen(true)}
                className="rounded-xl border border-[#00F2FE]/30 bg-[#091511]/60 px-5 py-2.5 text-base font-semibold tracking-wide text-[#00F2FE] transition-all hover:border-[#00F2FE] hover:bg-[#00F2FE]/10 md:text-lg"
              >
                功能介绍
              </button>
              <Link
                href="/dashboard"
                className="rounded-xl border border-[#142D24] bg-[#10B981] px-5 py-2.5 text-base font-semibold tracking-wide text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] md:text-lg"
              >
                创作中心
              </Link>
              <Link
                href="/records"
                className="rounded-xl border border-[#142D24] bg-[#091511]/60 px-5 py-2.5 text-base font-semibold tracking-wide text-white transition-all hover:border-[#10B981] hover:bg-[#142D24] md:text-lg"
              >
                生成记录
              </Link>
              <Link
                href="/recharge"
                className="rounded-xl border border-[#142D24] bg-[#091511]/60 px-5 py-2.5 text-base font-semibold tracking-wide text-white transition-all hover:border-[#10B981] hover:bg-[#142D24] md:text-lg"
              >
                卡密兑换
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                href="/records"
                className="rounded-lg border border-[#142D24] bg-[#091511]/60 px-3 py-1.5 text-xs font-bold text-white transition-all hover:border-[#10B981] md:hidden"
              >
                记录
              </Link>

              <div className="hidden items-center gap-2 text-xs text-[#10B981] sm:flex">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="font-mono text-sm font-bold text-white">{currentTime}</span>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-[#142D24] bg-[#091511]/60 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]"></span>
                <span className="hidden text-xs text-[#10B981] sm:inline">积分</span>
                <span className="text-sm font-bold text-white">{profile?.credits || 0}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((value) => !value)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#142D24] bg-[#091511]/60 transition-colors hover:border-[#10B981] sm:h-9 sm:w-9"
                >
                  <span className="text-sm font-bold text-white">
                    {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                  </span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-[#142D24] bg-[#091511]/95 shadow-2xl backdrop-blur-md sm:w-56">
                    <div className="border-b border-[#142D24] p-3 sm:p-4">
                      <p className="mb-1 text-xs text-[#10B981]">当前账号</p>
                      <p className="truncate text-sm font-medium text-white">{user?.email || '未登录'}</p>
                    </div>

                    <div className="border-b border-[#142D24] p-2 md:hidden">
                      <button
                        onClick={() => {
                          router.push('/dashboard')
                          setShowUserMenu(false)
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#142D24] hover:text-[#10B981]"
                      >
                        创作中心
                      </button>
                      <button
                        onClick={() => {
                          router.push('/records')
                          setShowUserMenu(false)
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#142D24] hover:text-[#10B981]"
                      >
                        生成记录
                      </button>
                      <button
                        onClick={() => {
                          router.push('/recharge')
                          setShowUserMenu(false)
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#142D24] hover:text-[#10B981]"
                      >
                        卡密兑换
                      </button>
                    </div>

                    <div className="p-2">
                      <button
                        onClick={() => {
                          router.push('/profile')
                          setShowUserMenu(false)
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#142D24] hover:text-[#10B981]"
                      >
                        个人中心
                      </button>
                      <button
                        onClick={() => {
                          setShowChangePassword(true)
                          setShowUserMenu(false)
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[#142D24] hover:text-[#10B981]"
                      >
                        修改密码
                      </button>
                      <div className="my-1 border-t border-[#142D24]"></div>
                      <button
                        onClick={() => {
                          handleLogout()
                          setShowUserMenu(false)
                        }}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition-colors hover:bg-[#142D24]"
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

      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] px-4 py-2 sm:px-6 lg:px-8">
          <div className="mb-2">
            <h2 className="mb-1 text-lg font-bold text-white">创作中心</h2>
            <p className="text-xs text-[#10B981]">输入内容、选择风格，一键生成高密度知识图卡。</p>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr,1fr,1.2fr]">
            <section className="rounded-xl border border-[#142D24] bg-[#091511]/60 p-4 shadow-2xl backdrop-blur-md md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">参数</span>
                <h3 className="text-base font-bold text-white">参数配置</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-[#10B981]">生成模式</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGenMode('text')}
                      className={`flex-1 rounded-lg border border-[#142D24] py-2.5 text-sm font-bold transition-all ${
                        genMode === 'text'
                          ? 'bg-[#10B981] text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-[#091511]/60 text-white hover:bg-[#142D24]'
                      }`}
                    >
                      文生图
                    </button>
                    <button
                      onClick={() => setGenMode('image')}
                      className={`flex-1 rounded-lg border border-[#142D24] py-2.5 text-sm font-bold transition-all ${
                        genMode === 'image'
                          ? 'bg-[#10B981] text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-[#091511]/60 text-white hover:bg-[#142D24]'
                      }`}
                    >
                      图生图
                    </button>
                  </div>
                </div>

                {genMode === 'text' ? (
                  <div>
                    <label className="mb-1 block text-xs text-[#10B981]">文字内容</label>

                    <div className="mb-1 flex items-center gap-1.5">
                      {Array.from({ length: totalTabs }).map((_, index) => {
                        const textLength = getEffectiveWordCount(textSegments[index] || '')
                        const isActive = activeTab === index + 1
                        const isEmpty = textLength === 0
                        const isOverLength = textLength > 150

                        return (
                          <button
                            key={index}
                            onClick={() => setActiveTab(index + 1)}
                            className={`relative h-9 w-9 rounded-lg border border-[#142D24] text-sm font-bold transition-all ${
                              isActive
                                ? 'bg-[#10B981] text-[#040D0A] ring-2 ring-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                                : isEmpty
                                  ? 'bg-[#091511]/60 text-[#64748B] hover:bg-[#142D24] hover:text-[#94A3B8]'
                                  : 'bg-[#091511]/60 text-white hover:bg-[#142D24]'
                            }`}
                          >
                            {index + 1}
                            {!isEmpty && !isOverLength && (
                              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#10B981]"></span>
                            )}
                            {isOverLength && (
                              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500"></span>
                            )}
                          </button>
                        )
                      })}

                      {totalTabs < 10 && (
                        <button
                          onClick={handleAddTab}
                          className="h-9 w-9 rounded-lg border border-dashed border-[#142D24] bg-[#091511]/60 text-[#10B981] transition-all hover:border-[#10B981]"
                        >
                          +
                        </button>
                      )}
                    </div>

                    {totalTabs > 1 && (
                      <button
                        onClick={handleRemoveTab}
                        className="mb-1 flex items-center gap-1 text-xs text-[#10B981] transition-colors hover:text-red-400"
                      >
                        删除当前段落
                      </button>
                    )}

                    <textarea
                      value={textSegments[activeTab - 1] || ''}
                      onChange={(event) => handleTextChange(event.target.value)}
                      placeholder="请输入内容..."
                      className="h-40 w-full resize-none rounded-lg border border-[#142D24] bg-[#040D0A] px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#64748B] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                    />

                    <button
                      onClick={handleAIExpand}
                      disabled={isExpanding}
                      className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-bold transition-all ${
                        isExpanding
                          ? 'cursor-not-allowed border-[#142D24] bg-[#091511]/60 text-[#64748B]'
                          : 'border-[#03F09C]/50 bg-gradient-to-r from-[#03F09C]/20 to-[#00F2FE]/20 text-[#03F09C] hover:border-[#03F09C] hover:shadow-[0_0_15px_rgba(3,240,156,0.3)]'
                      }`}
                    >
                      {isExpanding ? 'AI 正在优化中...' : 'AI 一键优化'}
                    </button>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-[#10B981]">第 {activeTab} / {totalTabs} 段</span>
                      <span className="text-xs text-[#10B981]">{currentWordCount} 字</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-xs text-[#10B981]">参考图片</label>
                    <div className="rounded-lg border-2 border-dashed border-[#142D24] bg-[#091511]/30 p-8 text-center transition-all hover:border-[#10B981]">
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="mb-3 text-4xl">上传</div>
                        <div className="text-sm text-[#10B981]">点击或拖拽上传参考图片</div>
                        <div className="mt-1 text-xs text-[#64748B]">支持多图上传，最多 10 张</div>
                      </label>
                    </div>

                    {uploadedImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {uploadedImages.map((url, index) => (
                          <div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-[#142D24]">
                            <img src={url} alt={`参考图 ${index + 1}`} className="h-full w-full object-cover" />
                            <button
                              onClick={() => handleRemoveImage(index)}
                              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded bg-red-500/90 text-xs text-white transition-colors hover:bg-red-500"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-xs text-[#10B981]">模型选择</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setSelectedModel('GPT-Image-2')}
                      className={`relative overflow-hidden rounded-xl border px-4 py-3 text-center transition-all ${
                        selectedModel === 'GPT-Image-2'
                          ? 'scale-[1.02] border-[#03F09C] bg-[#141d1a]/60 shadow-[0_0_25px_rgba(3,240,156,0.15)]'
                          : 'border-white/10 bg-[#0e0d15] hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="text-sm font-bold text-white">GPT-Image-2</div>
                      <div className="mt-0.5 text-xs text-gray-400">更高质量</div>
                    </button>
                    <button
                      onClick={() => setSelectedModel('NanoBanana2')}
                      className={`relative overflow-hidden rounded-xl border px-4 py-3 text-center transition-all ${
                        selectedModel === 'NanoBanana2'
                          ? 'scale-[1.02] border-[#03F09C] bg-[#141d1a]/60 shadow-[0_0_25px_rgba(3,240,156,0.15)]'
                          : 'border-white/10 bg-[#0e0d15] hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="text-sm font-bold text-white">NanoBanana2</div>
                      <div className="mt-0.5 text-xs text-gray-400">更快生成</div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[#10B981]">画面比例</label>
                  <select
                    value={selectedRatio}
                    onChange={(event) => setSelectedRatio(event.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#142D24] bg-[#091511]/60 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  >
                    {ASPECT_RATIOS.map((ratio) => (
                      <option key={ratio.value} value={ratio.value} className="bg-[#091511]">
                        {ratio.label} ({ratio.note})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[#10B981]">分辨率</label>
                  <div className="flex gap-2">
                    {['1K', '2K', '4K'].map((resolution) => (
                      <button
                        key={resolution}
                        onClick={() => setSelectedResolution(resolution)}
                        className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-all ${
                          selectedResolution === resolution
                            ? 'border border-[#142D24] bg-[#10B981] text-[#040D0A]'
                            : 'border border-[#142D24] bg-[#091511]/60 text-white hover:bg-[#142D24]'
                        }`}
                      >
                        {resolution} ({getResolutionPrice(resolution)}积分)
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#142D24] bg-[#091511]/60 p-4 shadow-2xl backdrop-blur-md md:p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">风格</span>
                <h3 className="text-base font-bold text-white">风格定义</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#10B981]">系统风格</label>
                  <select
                    value={selectedStyleId || ''}
                    onChange={(event) => handleStyleChange(Number(event.target.value))}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-[#142D24] bg-[#091511]/60 px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  >
                    <option value="" className="bg-[#091511]">
                      选择风格...
                    </option>
                    {customStylesList.length > 0 && (
                      <optgroup label="我的自定义风格" className="bg-[#091511]">
                        {customStylesList.map((style) => (
                          <option key={style.id} value={style.id} className="bg-[#091511]">
                            {style.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="系统风格" className="bg-[#091511]">
                      {HANDDRAWN_STYLES.map((style, index) => (
                        <option key={style.id} value={style.id} className="bg-[#091511]">
                          {systemStyleLabel(style, index)}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-[#10B981]">风格名称</label>
                  <input
                    type="text"
                    value={customStyleName}
                    onChange={(event) => setCustomStyleName(event.target.value)}
                    placeholder="输入风格名称..."
                    className="w-full rounded-lg border border-[#142D24] bg-[#091511]/60 px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#64748B] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-[#10B981]">风格描述 Prompt</label>
                  <textarea
                    value={customStylePrompt}
                    onChange={(event) => setCustomStylePrompt(event.target.value)}
                    placeholder="输入风格描述..."
                    rows={4}
                    className="h-28 w-full resize-none rounded-lg border border-[#142D24] bg-[#091511]/60 px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#64748B] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
                  />
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-bold text-white">我的自定义风格</h4>
                  {customStylesList.length === 0 ? (
                    <div className="rounded-lg border border-[#142D24] bg-[#091511]/30 px-3 py-3">
                      <p className="text-center text-xs font-normal text-[#10B981]">
                        还没有自定义风格。填写名称和描述后，点击下方按钮即可保存。
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {customStylesList.map((style) => (
                        <div
                          key={style.id}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                            selectedStyleId === style.id
                              ? 'border-[#10B981] bg-[#10B981] text-[#040D0A] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : 'border-[#142D24] bg-[#091511]/60 text-white hover:bg-[#142D24]'
                          }`}
                        >
                          <button onClick={() => handleSelectCustomStyle(style)}>{style.name}</button>
                          <button
                            onClick={() => handleDeleteCustomStyle(style.id)}
                            className="transition-colors hover:text-red-400"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSaveCustomStyle}
                  className="w-full rounded-lg border border-[#142D24] bg-[#091511]/60 py-3 text-sm text-white transition-all hover:border-[#10B981] hover:text-[#10B981]"
                >
                  保存自定义风格
                </button>

                <div className="border-t border-[#142D24] pt-4">
                  {generationStatus === 'loading' ? (
                    <button
                      onClick={() => {
                        abortController.current?.abort()
                        abortController.current = null
                        setGenerationStatus('idle')
                        localStorage.setItem('ai_huatang_draft_status', 'idle')
                      }}
                      className="w-full rounded-lg border border-red-900/50 bg-[#EF4444] py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]"
                    >
                      取消生成
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      className="w-full rounded-lg border border-[#142D24] bg-[#10B981] py-3 text-sm font-bold text-[#040D0A] shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]"
                    >
                      开始生成
                    </button>
                  )}

                  <div className="mt-3 rounded-lg border border-[#142D24] bg-[#091511]/30 p-3 text-center">
                    <div className="flex justify-center gap-4 text-xs">
                      <span className="text-[#10B981]">
                        单张成本: <span className="font-bold text-white">{currentSinglePrice}</span> 积分
                      </span>
                      <span className="text-[#10B981]">
                        生成数量: <span className="font-bold text-white">{outputCount}</span> 张
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[#10B981]">
                      总计: <span className="font-bold text-[#10B981]">{totalCost}</span> 积分
                      <span className="mx-3 text-[#142D24]">|</span>
                      余额: <span className="font-bold text-white">{profile?.credits || 0}</span> 积分
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="flex flex-col rounded-xl border border-[#142D24] bg-[#091511]/60 p-4 shadow-2xl backdrop-blur-md md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">预览</span>
                  <h3 className="text-base font-bold text-white">生成预览</h3>
                  {generatedImages.length > 0 && (
                    <span className="rounded-full bg-[#10B981]/10 px-2 py-0.5 text-xs text-[#10B981]">
                      {generatedImages.length} 张
                    </span>
                  )}
                </div>

                {generationStatus === 'success' && generatedImages.length > 0 && (
                  <button
                    onClick={() => generatedImages.forEach((url, index) => setTimeout(() => handleDownload(url, index), index * 250))}
                    className="flex items-center gap-1 rounded-lg border border-[#142D24] bg-[#091511] px-3 py-1.5 text-xs font-bold text-[#10B981] transition-all hover:border-[#10B981] hover:bg-[#142D24]"
                  >
                    批量保存
                  </button>
                )}
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className={`flex flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-[#142D24] bg-[#040D0A] ${getAspectClass()}`}>
                  {generationStatus === 'idle' && (
                    <div className="p-8 text-center">
                      <div className="mb-4 text-5xl">等待</div>
                      <p className="mb-2 text-base text-[#10B981]">暂无生成结果</p>
                      <p className="text-sm text-[#64748B]">
                        请在左侧输入内容并选择风格后
                        <br />
                        点击开始生成
                      </p>
                    </div>
                  )}

                  {generationStatus === 'loading' && (
                    <div className="w-full text-center">
                      <div className="mb-4 text-5xl">生成中</div>
                      <p className="mb-2 text-base text-[#10B981]">正在创作中...</p>
                      <p className="text-sm text-[#64748B]">AI 正在绘制你的知识图卡</p>
                      <p className="mt-2 text-xs text-[#64748B]/70">预计需要 1 到 3 分钟，请耐心等待</p>
                      <div className="mx-auto mt-4 h-2 w-48 overflow-hidden rounded-full bg-[#142D24]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#34D399] transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="mt-2 font-mono text-xs text-[#10B981]">{progress}%</p>
                    </div>
                  )}

                  {generationStatus === 'success' && generatedImages.length === 1 && (
                    <img src={generatedImages[0]} alt="Generated" className="h-full w-full object-contain" />
                  )}

                  {generationStatus === 'success' && generatedImages.length > 1 && (
                    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 p-2">
                      {generatedImages.slice(0, 4).map((url, index) => (
                        <div key={index} className="group relative overflow-hidden rounded-lg border border-[#142D24] bg-[#091511]/50">
                          <img src={url} alt={`Generated ${index + 1}`} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                            <button
                              onClick={(event) => {
                                event.stopPropagation()
                                void handleDownload(url, index)
                              }}
                              className="rounded-lg bg-[#10B981] px-3 py-1.5 text-xs font-bold text-[#040D0A] shadow-lg transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                            >
                              下载
                            </button>
                          </div>
                          <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]">
                            <span className="text-xs font-bold text-[#040D0A]">{index + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {generationStatus === 'success' && generatedImages.length === 1 && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => void handleDownload(generatedImages[0], 0)}
                      className="flex-1 rounded-lg border border-[#142D24] bg-[#10B981] py-2.5 text-sm font-bold text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:shadow-[0_0_25px_rgba(16,185,129,0.6)]"
                    >
                      下载图片
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <ChangePasswordModal show={showChangePassword} onClose={() => setShowChangePassword(false)} />

      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-[#202B3A] bg-[#0B0D17] shadow-2xl">
            <div className="max-h-[80vh] overflow-y-auto p-5 text-xs leading-relaxed text-gray-200">
              <div className="border-b border-white/10 pb-3">
                <h2 className="bg-gradient-to-r from-[#03F09C] to-[#00F2FE] bg-clip-text text-base font-bold text-transparent">
                  使用说明
                </h2>
                <p className="mt-2 text-gray-300">
                  平台内置多种系统风格，也支持你保存自己的风格模板。适合制作知识图卡、封面图、课程笔记和图文信息卡。
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <section>
                  <h3 className="font-bold text-[#00F2FE]">1. 文生图怎么用</h3>
                  <p className="mt-1 text-gray-400">
                    输入每一段内容，选择模型、比例、分辨率和风格，然后点击“开始生成”。如果一段文字太长，建议拆成多段。
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-[#03F09C]">2. 图生图怎么用</h3>
                  <p className="mt-1 text-gray-400">
                    上传参考图后，系统会按你选定的风格重新生成，适合做风格迁移、视觉统一和样式复刻。
                  </p>
                </section>

                <section>
                  <h3 className="font-bold text-white">3. 模型选择建议</h3>
                  <ul className="mt-2 space-y-1 text-gray-300">
                    <li>• 中文知识图卡、封面图：优先使用 `GPT-Image-2`</li>
                    <li>• 更快出图、参考图改写：可以试试 `NanoBanana2`</li>
                    <li>• 4K 会额外消耗更多积分，建议先用 2K 试稿</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-bold text-white">4. 自定义风格</h3>
                  <p className="mt-1 text-gray-400">
                    你可以把喜欢的画面风格总结成 Prompt 保存起来，下次直接调用，不用每次重写。
                  </p>
                </section>

                <section className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-gray-300">
                  <h3 className="text-sm font-bold text-red-400">特别提醒</h3>
                  <p className="mt-2">
                    • 卡密兑换后积分通常会立即到账。
                    <br />
                    • 如果因超时或网络波动导致失败，正常情况下不会扣积分。
                    <br />
                    • 大量文字排版生图时，个别字形轻微变化属于模型常见现象，建议适当精简字数。
                  </p>
                </section>
              </div>

              <button
                onClick={() => setIsGuideOpen(false)}
                className="mt-5 w-full rounded-lg bg-gradient-to-r from-[#03F09C] to-[#00F2FE] py-2 text-xs font-bold text-[#040D0A] transition-all hover:scale-[1.01]"
              >
                进入创作中心
              </button>
            </div>
          </div>
        </div>
      )}

      {isApiNoticeOpen && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#12111a] p-5 text-gray-200 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-base font-bold text-amber-500">
                <span>提示</span>
                <span>API 调用须知</span>
              </div>
              <button
                onClick={() => setIsApiNoticeOpen(false)}
                className="text-lg text-gray-500 transition-colors hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <p className="mb-4 text-xs text-gray-400">
              以下两类情况，可能会出现“调用成功但没有返回图片”的现象，并且仍然可能正常计费：
            </p>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              <div className="space-y-2 rounded-xl border border-white/5 bg-[#1a1824] p-3.5">
                <div className="flex items-start gap-2 text-sm font-bold text-gray-100">
                  <span className="text-amber-500">1.</span>
                  <span>Prompt 没有明确要求“返回图片”</span>
                </div>
                <p className="pl-6 text-xs leading-relaxed text-gray-400">
                  如果文案只描述需求，却没有明确要求返回图片，模型有时会停留在内部推理阶段，最终没有图片输出。
                </p>
                <div className="rounded bg-[#13251e] p-2 pl-3 text-[11px] leading-relaxed text-[#4ade80]">
                  建议：在 Prompt 中明确写清“请返回一张图片 / 返回 image 数据”，并补充足够详细的描述。
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-white/5 bg-[#1a1824] p-3.5">
                <div className="flex items-start gap-2 text-sm font-bold text-gray-100">
                  <span className="text-amber-500">2.</span>
                  <span>内容触发上游平台风控</span>
                </div>
                <p className="pl-6 text-xs leading-relaxed text-gray-400">
                  如果内容涉及版权 IP、敏感人物或高风险表达，上游平台可能直接拦截，不报错也不出图。
                </p>
                <div className="rounded bg-[#142327] p-2 pl-3 text-[11px] leading-relaxed text-[#38bdf8]">
                  建议：调整 Prompt，避开版权和敏感描述后再重新尝试。
                </div>
              </div>

              <div className="flex items-start gap-1.5 rounded-xl border border-[#222a45] bg-[#161a2b] p-3 text-[11px] leading-relaxed text-[#5bf]">
                <span>补充：</span>
                <span>429、5xx 等上游异常通常不计费，但“成功调用却无图片”的情况是否扣费，取决于上游平台规则。</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setIsApiNoticeOpen(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-gray-300 transition-all hover:bg-white/5"
              >
                返回修改
              </button>
              <button
                onClick={handleConfirmNotice}
                className="rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#6366f1] px-4 py-2 text-xs font-bold text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all hover:scale-[1.01]"
              >
                我已了解，开始调用
              </button>
            </div>
          </div>
        </div>
      )}

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1e293b]/50 bg-[#030712]/95 py-2.5 backdrop-blur-sm">
        <div className="mx-auto max-w-[1400px] px-4 text-center">
          <p className="text-sm text-gray-400">
            登录或使用本站即代表您同意{' '}
            <button
              onClick={() => setShowTermsModal(true)}
              className="rounded px-1 font-semibold text-[#10B981] underline decoration-[#10B981]/50 underline-offset-2 transition-all duration-300 hover:text-[#00F2FE]"
            >
              《安全合规与使用须知》
            </button>
          </p>
        </div>
      </footer>
    </div>
  )
}

function getEffectiveWordCount(str: string): number {
  if (!str) return 0

  const noPhonetics = str.replace(/\[.*?\]/g, '')
  const chineseChars = (noPhonetics.match(/[\u4e00-\u9fa5]/g) || []).length
  const englishWords = noPhonetics
    .replace(/[\u4e00-\u9fa5]/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()\n\r]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0)

  return chineseChars + englishWords.length
}
