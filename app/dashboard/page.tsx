'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { HANDDRAWN_STYLES, HanddrawnStyle } from '@/config/styles'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'

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

const ASPECT_RATIOS = [
  { label: 'auto', value: 'auto', note: '智能自适应' },
  { label: '1:1', value: '1:1', note: '正方形切片' },
  { label: '3:4', value: '3:4', note: '小红书经典图文' },
  { label: '9:16', value: '9:16', note: '小红书/抖音视频' },
  { label: '16:9', value: '16:9', note: '横屏PPT/课件' },
  { label: '3:2', value: '3:2', note: '经典摄影比例' },
  { label: '2:3', value: '2:3', note: '竖版海报' },
  { label: '4:3', value: '4:3', note: '传统显示器' },
  { label: '21:9', value: '21:9', note: '宽幅电影感' },
  { label: '9:21', value: '9:21', note: '超长手机屏' },
  { label: '1:3', value: '1:3', note: '全景横幅' },
  { label: '3:1', value: '3:1', note: '长条连环画' },
  { label: '1:2', value: '1:2', note: '长版教学板书' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')

  const [genMode, setGenMode] = useState<GenerationMode>('text')
  const [activeTab, setActiveTab] = useState<number>(1)
  const [totalTabs, setTotalTabs] = useState<number>(1)
  const [textSegments, setTextSegments] = useState<string[]>(Array(10).fill(''))
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [selectedModel, setSelectedModel] = useState<'GPT-Image-2' | 'NanoBanana2'>('GPT-Image-2')
  const [selectedRatio, setSelectedRatio] = useState('9:16')
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null)
  const [customStyleName, setCustomStyleName] = useState('')
  const [customStylePrompt, setCustomStylePrompt] = useState('')
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [customStylesList, setCustomStylesList] = useState<CustomStyle[]>([])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

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
    const STORAGE_KEY = 'ai_handdrawn_login_session'
    
    const clearLocalSession = () => {
      try {
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem('sb-gpaptwlbqoxwuawpzcnj-auth-token')
      } catch (e) {
        console.error('Failed to clear local storage:', e)
      }
    }

    const redirectToLogin = () => {
      clearLocalSession()
      window.location.href = '/login'
    }

    const checkAuthAndGetProfile = async () => {
      setLoading(true)

      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000)
      })

      try {
        if (!supabase) {
          setUser({ email: 'demo@handdrawn.com' })
          setProfile({ id: 'demo', email: 'demo@handdrawn.com', credits: 3 })
          setLoading(false)
          return
        }

        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ])
        
        const sessionData = (sessionResult as any)?.data
        
        if (!sessionData?.session) {
          console.log('No valid session, redirecting to login')
          redirectToLogin()
          return
        }

        const userId = sessionData.session.user?.id
        if (!userId) {
          console.error('Invalid user ID in session')
          redirectToLogin()
          return
        }

        setUser(sessionData.session.user)

        let profileData: any
        try {
          const profileResult = await Promise.race([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            timeoutPromise
          ])
          
          profileData = (profileResult as any)?.data
        } catch (e: any) {
          console.warn('Profile fetch failed, attempting to create:', e?.message)
          
          try {
            await supabase.from('profiles').insert({
              id: userId,
              email: sessionData.session.user?.email || '',
              credits: 3,
              created_at: new Date().toISOString(),
            })

            profileData = {
              id: userId,
              email: sessionData.session.user?.email || '',
              credits: 3,
            }
          } catch (insertErr: any) {
            console.error('Profile creation failed:', insertErr)
            redirectToLogin()
            return
          }
        }

        if (profileData) {
          setProfile(profileData)
        } else {
          redirectToLogin()
          return
        }
      } catch (error) {
        console.error('Auth check error:', error)
        redirectToLogin()
        return
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndGetProfile()

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          redirectToLogin()
        }
      })

      return () => {
        subscription?.unsubscribe?.()
      }
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('customStyles')
    if (saved) {
      setCustomStylesList(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('customStyles', JSON.stringify(customStylesList))
  }, [customStylesList])

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  const handleAddTab = () => {
    if (totalTabs < 10) {
      setTotalTabs(totalTabs + 1)
      setActiveTab(totalTabs + 1)
    }
  }

  const handleRemoveTab = () => {
    if (totalTabs > 1) {
      const newSegments = [...textSegments]
      newSegments.splice(activeTab - 1, 1)
      newSegments.push('')
      setTextSegments(newSegments)
      setTotalTabs(totalTabs - 1)
      setActiveTab(Math.min(activeTab, totalTabs - 1))
    }
  }

  const handleTextChange = (value: string) => {
    const newSegments = [...textSegments]
    newSegments[activeTab - 1] = value
    setTextSegments(newSegments)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (uploadedImages.length >= 10) return
      
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setUploadedImages(prev => [...prev, result])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(newImages)
  }

  const handleStyleChange = (styleId: number) => {
    setSelectedStyleId(styleId)
    
    const customStyle = customStylesList.find(s => s.id === styleId)
    if (customStyle) {
      setCustomStyleName(customStyle.name)
      setCustomStylePrompt(`${customStyle.styleKeywords}\n${customStyle.layoutDirectives}`)
      return
    }

    const systemStyle = HANDDRAWN_STYLES.find(s => s.id === styleId)
    if (systemStyle) {
      setCustomStyleName(systemStyle.name)
      setCustomStylePrompt(`${systemStyle.styleKeywords}\n${systemStyle.layoutDirectives}`)
    }
  }

  const handleSaveCustomStyle = () => {
    if (!customStyleName.trim()) {
      alert('请输入风格名称')
      return
    }
    if (!customStylePrompt.trim()) {
      alert('请输入风格描述 Prompt')
      return
    }

    const newStyle: CustomStyle = {
      id: Date.now(),
      name: customStyleName.trim(),
      styleKeywords: customStylePrompt.trim(),
      layoutDirectives: '',
    }

    setCustomStylesList(prev => [...prev, newStyle])
    setSelectedStyleId(newStyle.id)
    alert('自定义风格保存成功！')
  }

  const handleDeleteCustomStyle = (styleId: number) => {
    setCustomStylesList(prev => prev.filter(s => s.id !== styleId))
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

  const handleGenerate = async () => {
    if (!selectedStyleId) {
      alert('请先选择一种风格')
      return
    }

    let style: HanddrawnStyle | CustomStyle | undefined
    
    const customStyle = customStylesList.find(s => s.id === selectedStyleId)
    if (customStyle) {
      style = customStyle
    } else {
      style = HANDDRAWN_STYLES.find(s => s.id === selectedStyleId)
    }

    if (!style) {
      alert('所选风格不存在')
      return
    }

    const validInputs = textSegments.slice(0, totalTabs).filter(item => item.trim() !== '')
    
    if (genMode === 'text' && validInputs.length === 0) {
      alert('请至少输入一段内容')
      return
    }

    if (genMode === 'image' && uploadedImages.length === 0) {
      alert('请至少上传一张参考图片')
      return
    }

    if (profile && profile.credits < totalCost) {
      alert(`积分不足！需要 ${totalCost} 积分，当前 ${profile.credits} 积分`)
      return
    }

    if (!profile?.id) {
      alert('用户未登录，请重新登录')
      router.push('/login')
      return
    }

    setGenerationStatus('loading')
    setGeneratedImages([])

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          inputContents: genMode === 'text' ? validInputs : [],
          referenceImages: genMode === 'image' ? uploadedImages : [],
          styleName: customStyleName || style.name,
          customStyle: customStylePrompt,
          aspectRatio: selectedRatio,
          modelType: selectedModel,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.message || '生成失败，请重试'
        console.error('Generation API error:', errorMsg)
        alert(errorMsg)
        setGenerationStatus('idle')
        return
      }

      setGeneratedImages(data.imageUrls || [data.imageUrl])
      setGenerationStatus('success')

      if (profile && data.creditsRemaining !== undefined) {
        setProfile({ ...profile, credits: data.creditsRemaining })
      }
    } catch (error) {
      console.error('Generation failed:', error)
      alert('网络错误，请稍后重试')
      setGenerationStatus('idle')
    }
  }

  const handleDownload = (url: string, index: number) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `handdrawn-${Date.now()}-${index + 1}.png`
    link.click()
  }

  const modelPrice = 3
  const outputCount = genMode === 'text' ? totalTabs : uploadedImages.length
  const totalCost = outputCount * modelPrice
  const currentWordCount = textSegments[activeTab - 1]?.length || 0

  const getAspectClass = () => {
    const ratioMap: Record<string, string> = {
      'auto': 'aspect-[9/16]',
      '9:16': 'aspect-[9/16]',
      '3:4': 'aspect-[3/4]',
      '1:1': 'aspect-square',
      '16:9': 'aspect-video',
      '4:3': 'aspect-[4/3]',
      '2:3': 'aspect-[2/3]',
      '3:2': 'aspect-[3/2]',
      '21:9': 'aspect-[21/9]',
      '9:21': 'aspect-[9/21]',
      '1:3': 'aspect-[1/3]',
      '3:1': 'aspect-[3/1]',
      '1:2': 'aspect-[1/2]',
    }
    return ratioMap[selectedRatio] || 'aspect-[9/16]'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040D0A] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="flex items-center justify-center gap-2 text-4xl font-bold font-sans mb-4">
            <div className="w-12 h-12 bg-[#03F09C] rounded-md flex items-center justify-center shadow-[0_0_20px_rgba(3,240,156,0.5)]">
              <svg className="w-6 h-6 text-[#040D0A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <span className="px-2 py-1 rounded-md bg-[#03F09C] text-[#040D0A] font-extrabold text-sm tracking-tighter mr-1 shadow-[0_0_12px_rgba(3,240,156,0.4)]">AI</span>
            <span className="font-serif tracking-widest bg-gradient-to-r from-[#03F09C] via-[#00F2FE] to-[#03F09C] bg-clip-text text-transparent italic filter drop-shadow-[0_0_6px_rgba(0,242,254,0.3)]">画堂</span>
          </div>
          <p className="text-[#03F09C]">正在加载...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#040D0A]">
      <header className="bg-[#040D0A] border-b border-[#142D24] flex-shrink-0">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full py-3">
            <Link href="/" className="flex items-center gap-1.5 h-10 select-none hover:opacity-80 transition-opacity">
              <img 
                src="/logo.svg" 
                alt="AI画堂" 
                className="w-9 h-9 object-contain"
              />
              <span className="text-xl font-sans font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#03F09C] to-[#00F2FE]">AI</span>
              <span className="text-xl font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-[#03F09C] tracking-widest font-art ml-1">画堂</span>
            </Link>

            <nav className="flex items-center gap-3">
              <Link href="/dashboard" className="px-4 py-2 bg-[#10B981] text-[#040D0A] font-bold text-sm border border-[#142D24] shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all rounded-lg">
                创作
              </Link>
              <Link href="/records" className="px-4 py-2 bg-[#091511]/60 backdrop-blur-sm text-white font-bold text-sm border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-lg">
                记录
              </Link>
              <Link href="/recharge" className="px-4 py-2 bg-[#091511]/60 backdrop-blur-sm text-white font-bold text-sm border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-lg">
                充值
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-[#10B981]">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
              </div>
              <div className="px-3 py-1.5 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center gap-1.5 rounded-lg">
                <span className="w-2 h-2 bg-[#10B981] rounded-full"></span>
                <span className="text-xs text-[#10B981]">积分</span>
                <span className="font-bold text-white text-sm">{profile?.credits || 0}</span>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-9 h-9 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center justify-center hover:border-[#10B981] transition-colors rounded-lg"
                >
                  <span className="text-white font-bold text-sm">
                    {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-56 bg-[#091511]/95 backdrop-blur-md border border-[#142D24] shadow-2xl z-50 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-[#142D24]">
                      <p className="text-xs text-[#10B981] mb-1">当前账号</p>
                      <p className="text-sm text-white font-medium truncate">{user?.email || '未登录'}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { router.push('/records'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg"
                      >
                        生成记录
                      </button>
                      <button 
                        onClick={() => { router.push('/recharge'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg"
                      >
                        积分充值
                      </button>
                      <button 
                        onClick={() => { router.push('/profile'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg"
                      >
                        个人中心
                      </button>
                      <div className="border-t border-[#142D24] my-1"></div>
                      <button 
                        onClick={() => { handleLogout(); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#142D24] transition-colors rounded-lg"
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

      <main className="flex-1 w-full">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 min-h-[calc(100vh-80px)]">
          <div className="mb-3">
            <h2 className="text-xl font-bold mb-1 text-white">创作工坊</h2>
            <p className="text-sm text-[#10B981]">输入内容，选择风格，生成知识卡片</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr,1.2fr] gap-4 items-stretch">
            {/* 第一栏：参数配置卡片 */}
            <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] rounded-xl p-4 md:p-5 shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🛠️</span>
                <h3 className="text-base font-bold text-white">参数配置</h3>
              </div>

              <div className="space-y-2">
                {/* 生成模式 */}
                <div>
                  <label className="text-xs text-[#10B981] mb-1 block">生成模式</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGenMode('text')}
                      className={`flex-1 py-2.5 text-sm font-bold border border-[#142D24] transition-all rounded-lg ${
                        genMode === 'text'
                          ? 'bg-[#10B981] text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-[#091511]/60 backdrop-blur-sm text-white hover:bg-[#142D24]'
                      }`}
                    >
                      📝 文生图
                    </button>
                    <button
                      onClick={() => setGenMode('image')}
                      className={`flex-1 py-2.5 text-sm font-bold border border-[#142D24] transition-all rounded-lg ${
                        genMode === 'image'
                          ? 'bg-[#10B981] text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-[#091511]/60 backdrop-blur-sm text-white hover:bg-[#142D24]'
                      }`}
                    >
                      🖼 图生图
                    </button>
                  </div>
                </div>

                {/* 文字内容/图生图输入 */}
                {genMode === 'text' && (
                  <div>
                    <label className="text-xs text-[#10B981] mb-1 block">文字内容</label>
                    
                    <div className="flex items-center gap-1.5 mb-1">
                      {Array.from({ length: totalTabs }).map((_, index) => {
                        const textContent = textSegments[index] || ''
                        const textLength = textContent.length
                        const isActive = activeTab === index + 1
                        const isEmpty = textLength === 0
                        const hasContent = textLength > 0 && textLength <= 150
                        const isOverLength = textLength > 150
                        
                        return (
                          <button
                            key={index}
                            onClick={() => setActiveTab(index + 1)}
                            className={`relative w-9 h-9 text-sm font-bold border border-[#142D24] transition-all duration-200 rounded-lg ${
                              isActive
                                ? 'bg-[#10B981] text-[#040D0A] ring-2 ring-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                                : isEmpty
                                  ? 'bg-[#091511]/60 backdrop-blur-sm text-[#64748B] hover:bg-[#142D24] hover:text-[#94A3B8]'
                                  : 'bg-[#091511]/60 backdrop-blur-sm text-white hover:bg-[#142D24]'
                            }`}
                          >
                            {index + 1}
                            {hasContent && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#10B981] rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                            )}
                            {isOverLength && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full shadow-[0_0_6px_rgba(245,158,11,0.8)]"></span>
                            )}
                          </button>
                        )
                      })}
                      {totalTabs < 10 && (
                        <button
                          onClick={handleAddTab}
                          className="w-9 h-9 text-sm font-bold border border-dashed border-[#142D24] bg-[#091511]/60 backdrop-blur-sm text-[#10B981] hover:border-[#10B981] hover:text-[#10B981] transition-all rounded-lg"
                        >
                          +
                        </button>
                      )}
                    </div>

                    {totalTabs > 1 && (
                      <button
                      onClick={handleRemoveTab}
                      className="mb-1 text-xs text-[#10B981] hover:text-red-400 flex items-center gap-1 transition-colors"
                    >
                        🗑 删除当前段落
                      </button>
                    )}

                    <textarea
                      value={textSegments[activeTab - 1] || ''}
                      onChange={(e) => handleTextChange(e.target.value)}
                      placeholder="请输入内容..."
                      className="w-full px-3 py-2.5 bg-[#040D0A] border border-[#142D24] text-sm text-white focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] focus:outline-none resize-none h-20 placeholder-[#64748B] rounded-lg"
                    />

                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-[#10B981]">第 {activeTab} / {totalTabs} 段</span>
                      <span className="text-xs text-[#10B981]">{currentWordCount} 字</span>
                    </div>
                  </div>
                )}

                {genMode === 'image' && (
                  <div>
                    <label className="text-xs text-[#10B981] mb-2 block">参考图片</label>
                    
                    <div className="border-2 border-dashed border-[#142D24] p-8 text-center hover:border-[#10B981] transition-all cursor-pointer bg-[#091511]/30 rounded-lg">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        id="image-upload"
                      />
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <div className="text-4xl mb-3">📤</div>
                        <div className="text-sm text-[#10B981]">点击或拖拽上传参考图片</div>
                        <div className="text-xs text-[#64748B] mt-1">支持多图上传，最多 10 张</div>
                      </label>
                    </div>

                    {uploadedImages.length > 0 && (
                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {uploadedImages.map((url, index) => (
                          <div key={index} className="relative aspect-square border border-[#142D24] overflow-hidden rounded-lg">
                            <img src={url} alt={`参考图 ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleRemoveImage(index)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors border border-[#142D24] rounded"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 模型选择 */}
                <div>
                  <label className="text-xs text-[#10B981] mb-1 block">模型选择</label>
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedModel('GPT-Image-2')}
                      className={`w-full px-3 py-2.5 border border-[#142D24] text-left transition-all flex items-center justify-between rounded-lg ${
                        selectedModel === 'GPT-Image-2'
                          ? 'bg-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-[#091511]/60 backdrop-blur-sm hover:bg-[#142D24]'
                      }`}
                    >
                      <div>
                        <div className={`text-sm font-bold ${selectedModel === 'GPT-Image-2' ? 'text-[#040D0A]' : 'text-white'}`}>GPT-Image-2</div>
                        <div className={`text-xs ${selectedModel === 'GPT-Image-2' ? 'text-[#040D0A]/70' : 'text-[#10B981]'}`}>更高质量更多分析</div>
                      </div>
                      <div className={`text-sm font-bold ${selectedModel === 'GPT-Image-2' ? 'text-[#040D0A]' : 'text-[#10B981]'}`}>⚡ 3 积分</div>
                    </button>
                    <button
                      onClick={() => setSelectedModel('NanoBanana2')}
                      className={`w-full px-3 py-2.5 border border-[#142D24] text-left transition-all flex items-center justify-between rounded-lg ${
                        selectedModel === 'NanoBanana2'
                          ? 'bg-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-[#091511]/60 backdrop-blur-sm hover:bg-[#142D24]'
                      }`}
                    >
                      <div>
                        <div className={`text-sm font-bold ${selectedModel === 'NanoBanana2' ? 'text-[#040D0A]' : 'text-white'}`}>NanoBanana2</div>
                        <div className={`text-xs ${selectedModel === 'NanoBanana2' ? 'text-[#040D0A]/70' : 'text-[#10B981]'}`}>快速图像生成</div>
                      </div>
                      <div className={`text-sm font-bold ${selectedModel === 'NanoBanana2' ? 'text-[#040D0A]' : 'text-[#10B981]'}`}>⚡ 3 积分</div>
                    </button>
                  </div>
                </div>

                {/* 画面比例 */}
                <div>
                  <label className="text-xs text-[#10B981] mb-1 block">画面比例</label>
                  <select
                    value={selectedRatio}
                    onChange={(e) => setSelectedRatio(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] text-sm text-white focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] focus:outline-none appearance-none cursor-pointer rounded-lg"
                  >
                    {ASPECT_RATIOS.map((ratio) => (
                      <option key={ratio.value} value={ratio.value} className="bg-[#091511]">
                        {ratio.label} ({ratio.note})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 第二栏：风格定义卡片 */}
            <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] rounded-xl p-4 md:p-5 shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🎨</span>
                <h3 className="text-base font-bold text-white">风格定义</h3>
              </div>

              <div className="space-y-3">
                {/* 系统风格 */}
                <div>
                  <label className="text-xs text-[#10B981] mb-1.5 block">系统风格</label>
                  <select
                    value={selectedStyleId || ''}
                    onChange={(e) => handleStyleChange(Number(e.target.value))}
                    className="w-full px-3 py-3 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] text-sm text-white focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] focus:outline-none appearance-none cursor-pointer rounded-lg"
                  >
                    <option value="" className="bg-[#091511]">选择风格...</option>
                    {customStylesList.length > 0 && (
                      <optgroup label="⭐ 我的自定义风格" className="bg-[#091511]">
                        {customStylesList.map(style => (
                          <option key={style.id} value={style.id} className="bg-[#091511]">{style.name}</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="🔥 顶级爆款" className="bg-[#091511]">
                      {HANDDRAWN_STYLES.filter(s => s.category === '顶级爆款').map(style => (
                        <option key={style.id} value={style.id} className="bg-[#091511]">{style.name}</option>
                      ))}
                    </optgroup>
                    {['特色极简', '现代数码手账', '传统复古美学', '教育与学术板书', '潮流前沿艺术'].map(category => (
                      <optgroup key={category} label={category} className="bg-[#091511]">
                        {HANDDRAWN_STYLES.filter(s => s.category === category).map(style => (
                          <option key={style.id} value={style.id} className="bg-[#091511]">{style.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* 风格名称 */}
                <div>
                  <label className="text-xs text-[#10B981] mb-1.5 block">风格名称</label>
                  <input
                    type="text"
                    value={customStyleName}
                    onChange={(e) => setCustomStyleName(e.target.value)}
                    placeholder="输入风格名称..."
                    className="w-full px-3 py-3 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] text-sm text-white focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] focus:outline-none placeholder-[#64748B] rounded-lg"
                  />
                </div>

                {/* 风格描述 */}
                <div>
                  <label className="text-xs text-[#10B981] mb-1.5 block">风格描述 Prompt</label>
                  <textarea
                    value={customStylePrompt}
                    onChange={(e) => setCustomStylePrompt(e.target.value)}
                    placeholder="输入风格描述..."
                    rows={3}
                    className="w-full px-4 py-3 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] text-sm text-white focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] focus:outline-none resize-none h-24 placeholder-[#64748B] rounded-lg"
                  />
                </div>

                {/* 我的自定义风格 */}
                <div>
                  <h4 className="text-xs font-bold mb-2 text-white">✨ 我的自定义风格</h4>
                  {customStylesList.length === 0 ? (
                    <div className="py-3 px-3 bg-[#091511]/30 border border-[#142D24] rounded-lg">
                      <p className="text-xs text-[#10B981] font-normal text-center">暂无自定义风格，可在上方输入名称与描述后点击下方保存</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {customStylesList.map((style) => (
                        <div
                          key={style.id}
                          className={`border border-[#142D24] px-3 py-2 text-xs font-mono font-medium cursor-pointer transition-all flex items-center gap-2 rounded-lg ${
                            selectedStyleId === style.id
                              ? 'bg-[#10B981] text-[#040D0A] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                              : 'bg-[#091511]/60 backdrop-blur-sm text-white hover:bg-[#142D24]'
                          }`}
                        >
                          <span onClick={() => handleSelectCustomStyle(style)}>{style.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCustomStyle(style.id)
                            }}
                            className="hover:text-red-400 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 保存按钮 */}
                <button
                  onClick={handleSaveCustomStyle}
                  className="w-full py-3 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] text-sm text-white hover:border-[#10B981] hover:text-[#10B981] transition-all rounded-lg"
                >
                  💾 保存自定义风格
                </button>

                {/* 分隔线 */}
                <div className="border-t border-[#142D24] pt-4">
                  {/* 开始生成按钮 */}
                  <button
                    onClick={handleGenerate}
                    disabled={generationStatus === 'loading'}
                    className={`w-full py-3 bg-[#10B981] text-[#040D0A] font-bold text-sm border border-[#142D24] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(16,185,129,0.4)] rounded-lg ${
                      generationStatus === 'loading' ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]'
                    }`}
                  >
                    {generationStatus === 'loading' ? (
                      <>
                        <div className="w-5 h-5 border-2 border-[#040D0A] border-t-transparent animate-spin"></div>
                        生成中...
                      </>
                    ) : (
                      <>🚀 开始生成</>
                    )}
                  </button>

                  {/* 成本信息 */}
                  <div className="mt-3 p-3 bg-[#091511]/30 border border-[#142D24] rounded-lg text-center">
                    <div className="flex justify-center gap-4 text-xs">
                      <span className="text-[#10B981]">
                        模型单价: <span className="font-bold text-white">{modelPrice}</span> 积分
                      </span>
                      <span className="text-[#10B981]">
                        生成数量: <span className="font-bold text-white">{outputCount}</span> 张
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-[#10B981]">
                      总成本: <span className="font-bold text-[#10B981]">{totalCost}</span> 积分
                      <span className="mx-3 text-[#142D24]">|</span>
                      余额: <span className="font-bold text-white">{profile?.credits || 0}</span> 积分
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 第三栏：生成预览卡片 */}
            <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] rounded-xl p-4 md:p-5 shadow-2xl transition-all duration-300 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🖼️</span>
                  <h3 className="text-base font-bold text-white">生成预览</h3>
                  {generatedImages.length > 0 && (
                    <span className="text-xs text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                      {generatedImages.length} 张
                    </span>
                  )}
                </div>
                {generationStatus === 'success' && generatedImages.length > 0 && (
                  <button
                    onClick={() => {
                      generatedImages.forEach((url, idx) => {
                        setTimeout(() => handleDownload(url, idx), idx * 300)
                      })
                    }}
                    className="px-3 py-1.5 bg-[#091511] text-[#10B981] text-xs font-bold border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-lg flex items-center gap-1"
                  >
                    📦 批量保存
                  </button>
                )}
              </div>
              
              <div className="flex-1 flex flex-col min-h-0">
                <div
                  className={`flex-1 w-full bg-[#040D0A] border-2 border-[#142D24] flex items-center justify-center overflow-hidden rounded-lg`}
                >
                  {generationStatus === 'idle' && (
                    <div className="text-center p-8">
                      <div className="text-5xl mb-4">🎨</div>
                      <p className="text-base text-[#10B981] mb-2">暂无生成记录</p>
                      <p className="text-sm text-[#64748B]">请在左侧输入内容并选择风格后<br />点击开始生成</p>
                    </div>
                  )}

                  {generationStatus === 'loading' && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-5xl mb-4 animate-bounce">🎨</div>
                        <p className="text-base text-[#10B981] mb-2">正在创作中...</p>
                        <p className="text-sm text-[#64748B]">AI 正在绘制您的知识卡片<br />请稍候</p>
                      </div>
                    </div>
                  )}

                  {generationStatus === 'success' && generatedImages.length === 1 && (
                    <img
                      src={generatedImages[0]}
                      alt="Generated"
                      className="w-full h-full object-contain"
                    />
                  )}

                  {generationStatus === 'success' && generatedImages.length > 1 && (
                    <div className="w-full h-full p-2 grid grid-cols-2 grid-rows-2 gap-2">
                      {generatedImages.slice(0, 4).map((url, index) => (
                        <div key={index} className="relative group overflow-hidden rounded-lg bg-[#091511]/50 border border-[#142D24]">
                          <img
                            src={url}
                            alt={`Generated ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDownload(url, index) }}
                              className="px-3 py-1.5 bg-[#10B981] text-[#040D0A] text-xs font-bold rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(16,185,129,0.6)] transition-all"
                            >
                              📥 下载
                            </button>
                          </div>
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-[#10B981] rounded-full flex items-center justify-center">
                            <span className="text-[#040D0A] font-bold text-xs">{index + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {generationStatus === 'success' && generatedImages.length === 1 && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDownload(generatedImages[0], 0)}
                      className="flex-1 py-2.5 bg-[#10B981] text-[#040D0A] text-sm font-bold border border-[#142D24] shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] transition-all rounded-lg"
                    >
                      📥 下载图片
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ChangePasswordModal
        show={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  )
}