'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { HANDDRAWN_STYLES, HanddrawnStyle } from '@/config/styles'

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

const QUALITY_OPTIONS = [
  { label: '标准', value: 'standard' },
  { label: '高清', value: 'hd' },
  { label: '超清', value: 'ultra' },
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
  const [selectedQuality, setSelectedQuality] = useState('标准')
  const [selectedStyleId, setSelectedStyleId] = useState<number | null>(null)
  const [customStyleName, setCustomStyleName] = useState('')
  const [customStylePrompt, setCustomStylePrompt] = useState('')
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle')
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [customStylesList, setCustomStylesList] = useState<CustomStyle[]>([])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordChangeError, setPasswordChangeError] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

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

  const handleChangePassword = async () => {
    setPasswordChangeError('')

    if (!newPassword) {
      setPasswordChangeError('请输入新密码')
      return
    }

    if (newPassword.length < 6) {
      setPasswordChangeError('密码长度至少6位')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError('两次输入的密码不一致')
      return
    }

    setIsChangingPassword(true)

    if (!supabase) {
      setPasswordChangeError('系统配置未完成')
      setIsChangingPassword(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      setPasswordChangeError(`修改密码失败: ${error.message}`)
    } else {
      setShowChangePassword(false)
      setNewPassword('')
      setConfirmNewPassword('')
      alert('密码修改成功！下次登录请使用新密码')
    }

    setIsChangingPassword(false)
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
          styleKeywords: style.styleKeywords,
          layoutDirectives: customStylePrompt || style.layoutDirectives,
          aspectRatio: selectedRatio,
          modelType: selectedModel,
          imageCount: outputCount,
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

  const modelPrice = selectedModel === 'GPT-Image-2' ? 3 : 5
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
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="animate-pulse">
          <h1 className="text-4xl font-black tracking-widest bg-gradient-to-r from-[#00F2FE] via-[#94A3B8] to-[#00E676] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,254,0.6)] hover:drop-shadow-[0_0_20px_rgba(0,242,254,0.9)] transition-all duration-300 select-none italic mb-4">AI画堂</h1>
          <p className="text-[#00F2FE]">正在加载...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen max-w-[100vw] max-h-[100vh] overflow-hidden flex flex-col bg-[#0B0D17]">
      <header className="bg-[#0B0D17] border-b border-[#202B3A] flex-shrink-0">
        <div className="flex justify-between items-center w-full px-6 py-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-[#10B981] border border-[#202B3A] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <span className="text-[#0B0D17] font-bold text-sm">AI</span>
            </div>
            <h1 className="text-lg font-black tracking-widest bg-gradient-to-r from-[#00F2FE] via-[#94A3B8] to-[#00E676] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,254,0.6)] hover:drop-shadow-[0_0_20px_rgba(0,242,254,0.9)] transition-all duration-300 select-none italic">AI画堂</h1>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="px-4 py-2 bg-[#10B981] text-[#0B0D17] font-bold text-sm border border-[#202B3A] shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all">
              创作
            </Link>
            <Link href="/records" className="px-4 py-2 bg-[#141923] text-white font-bold text-sm border border-[#202B3A] hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all">
              记录
            </Link>
            <Link href="/recharge" className="px-4 py-2 bg-[#141923] text-white font-bold text-sm border border-[#202B3A] hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all">
              充值
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#00F2FE]">
              <span>{new Date().toLocaleDateString('zh-CN')}</span>
              <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
            </div>
            <div className="px-3 py-1.5 bg-[#141923] border border-[#202B3A] flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#10B981] border border-[#202B3A]"></span>
              <span className="text-xs text-[#00F2FE]">积分</span>
              <span className="font-bold text-white text-sm">{profile?.credits || 0}</span>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 bg-[#141923] border border-[#202B3A] flex items-center justify-center hover:border-[#00F2FE] transition-colors"
              >
                <span className="text-white font-bold text-sm">
                  {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                </span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-10 w-56 bg-[#141923] border border-[#202B3A] shadow-lg z-50">
                  <div className="p-4 border-b border-[#202B3A]">
                    <p className="text-xs text-[#00F2FE] mb-1">当前账号</p>
                    <p className="text-sm text-white font-medium truncate">{user?.email || '未登录'}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => { router.push('/records'); setShowUserMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors"
                    >
                      生成记录
                    </button>
                    <button 
                      onClick={() => { router.push('/recharge'); setShowUserMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors"
                    >
                      积分充值
                    </button>
                    <div className="border-t border-[#202B3A] my-1"></div>
                    <button 
                      onClick={() => { setShowChangePassword(true); setShowUserMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors"
                    >
                      修改密码
                    </button>
                    <button 
                      onClick={() => { handleLogout(); setShowUserMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#1a2230] transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        <div className="col-span-3 flex flex-col gap-4 h-full overflow-y-auto pr-1">
          <div>
            <h2 className="text-lg font-bold mb-1 text-white">创作工坊</h2>
            <p className="text-xs text-[#00F2FE]">输入内容，选择风格，生成知识卡片</p>
          </div>

          <div className="bg-[#141923] border border-[#202B3A] p-4 flex-1 flex flex-col overflow-hidden rounded-lg">
            <div className="mb-4">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">生成模式</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setGenMode('text')}
                  className={`flex-1 py-2.5 text-sm font-bold border border-[#202B3A] transition-all ${
                    genMode === 'text'
                      ? 'bg-[#00E676] text-[#0A0F1D] shadow-[0_0_15px_rgba(0,230,118,0.4)]'
                      : 'bg-[#0B0D17] text-white hover:bg-[#1a2230]'
                  }`}
                >
                  📝 文生图
                </button>
                <button
                  onClick={() => setGenMode('image')}
                  className={`flex-1 py-2.5 text-sm font-bold border border-[#202B3A] transition-all ${
                    genMode === 'image'
                      ? 'bg-[#00E676] text-[#0A0F1D] shadow-[0_0_15px_rgba(0,230,118,0.4)]'
                      : 'bg-[#0B0D17] text-white hover:bg-[#1a2230]'
                  }`}
                >
                  🖼 图生图
                </button>
              </div>
            </div>

            {genMode === 'text' && (
              <div className="mb-4">
                <label className="text-xs text-[#00F2FE] mb-1.5 block">文字内容</label>
                
                <div className="flex items-center gap-1.5 mb-2">
                  {Array.from({ length: totalTabs }).map((_, index) => {
                    const textContent = textSegments[index] || ''
                    const textLength = textContent.length
                    const isActive = activeTab === index + 1
                    
                    // 状态判断
                    const isEmpty = textLength === 0
                    const hasContent = textLength > 0 && textLength <= 150
                    const isOverLength = textLength > 150
                    
                    return (
                      <button
                        key={index}
                        onClick={() => setActiveTab(index + 1)}
                        className={`relative w-8 h-8 text-sm font-bold border border-[#202B3A] transition-all duration-200 ${
                          isActive
                            ? 'bg-[#00F2FE] text-[#0B0D17] ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0D111A] shadow-[0_0_15px_rgba(0,242,254,0.6)]'
                            : isEmpty
                              ? 'bg-[#0B0D17] text-[#64748B] hover:bg-[#1E293B] hover:text-[#94A3B8]'
                              : 'bg-[#0B0D17] text-white hover:bg-[#1E293B] hover:shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        }`}
                      >
                        {index + 1}
                        
                        {/* 状态微章 - 有内容时显示 */}
                        {hasContent && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                          </span>
                        )}
                        
                        {/* 状态微章 - 字数过多警告 */}
                        {isOverLength && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-3 w-3 rounded-full bg-amber-400 opacity-75 animate-ping"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]"></span>
                          </span>
                        )}
                      </button>
                    )
                  })}
                  {totalTabs < 10 && (
                    <button
                      onClick={handleAddTab}
                      className="w-8 h-8 text-sm font-bold border border-dashed border-[#202B3A] bg-[#0B0D17] text-[#00F2FE] hover:border-[#10B981] hover:text-[#10B981] transition-all"
                    >
                      +
                    </button>
                  )}
                </div>

                {totalTabs > 1 && (
                  <button
                    onClick={handleRemoveTab}
                    className="mb-2 text-xs text-[#00F2FE] hover:text-red-400 flex items-center gap-1"
                  >
                    🗑 删除当前段落
                  </button>
                )}

                <textarea
                  value={textSegments[activeTab - 1] || ''}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="请输入内容..."
                  className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none resize-none h-32 placeholder-[#ABC4FF]"
                />

                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-[#00F2FE]">第 {activeTab} / {totalTabs} 段</span>
                  <span className="text-xs text-[#00F2FE]">{currentWordCount} 字</span>
                </div>
              </div>
            )}

            {genMode === 'image' && (
              <div className="mb-4">
                <label className="text-xs text-[#00F2FE] mb-1.5 block">参考图片</label>
                
                <div
                  className="border border-dashed border-[#202B3A] p-5 text-center hover:border-[#10B981] hover:border-solid transition-all cursor-pointer bg-[#0B0D17]"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <div className="text-2xl mb-2">📤</div>
                    <div className="text-sm text-[#00F2FE]">点击或拖拽上传参考图片</div>
                    <div className="text-xs text-[#ABC4FF] mt-1">支持多图上传，最多 10 张</div>
                  </label>
                </div>

                {uploadedImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {uploadedImages.map((url, index) => (
                      <div key={index} className="relative aspect-square border border-[#202B3A] overflow-hidden">
                        <img src={url} alt={`参考图 ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemoveImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 text-white text-xs flex items-center justify-center hover:bg-red-500 transition-colors border border-[#202B3A]"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">模型选择</label>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedModel('GPT-Image-2')}
                  className={`w-full px-4 py-3 border border-[#202B3A] text-left transition-all flex items-center justify-between ${
                    selectedModel === 'GPT-Image-2'
                      ? 'bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-[#0B0D17] hover:bg-[#1a2230]'
                  }`}
                >
                  <div>
                    <div className={`text-sm font-bold ${selectedModel === 'GPT-Image-2' ? 'text-black' : 'text-white'}`}>GPT-Image-2</div>
                    <div className="text-[10px] text-[#00F2FE]">更高质量更多分析</div>
                  </div>
                  <div className={`text-xs font-bold ${selectedModel === 'GPT-Image-2' ? 'text-black' : 'text-[#10B981]'}`}>⚡ 3 积分</div>
                </button>
                <button
                  onClick={() => setSelectedModel('NanoBanana2')}
                  className={`w-full px-4 py-3 border border-[#202B3A] text-left transition-all flex items-center justify-between ${
                    selectedModel === 'NanoBanana2'
                      ? 'bg-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'bg-[#0B0D17] hover:bg-[#1a2230]'
                  }`}
                >
                  <div>
                    <div className={`text-sm font-bold ${selectedModel === 'NanoBanana2' ? 'text-black' : 'text-white'}`}>NanoBanana2</div>
                    <div className="text-[10px] text-[#00F2FE]">快速图像生成</div>
                  </div>
                  <div className={`text-xs font-bold ${selectedModel === 'NanoBanana2' ? 'text-black' : 'text-[#10B981]'}`}>⚡ 3 积分</div>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">画面比例</label>
              <select
                value={selectedRatio}
                onChange={(e) => setSelectedRatio(e.target.value)}
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none appearance-none cursor-pointer"
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <option key={ratio.value} value={ratio.value} className="bg-[#141923]">
                    {ratio.label} ({ratio.note})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[#00F2FE] mb-1.5 block">图片清晰度</label>
              <select
                value={selectedQuality}
                onChange={(e) => setSelectedQuality(e.target.value)}
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none appearance-none cursor-pointer"
              >
                {QUALITY_OPTIONS.map((quality) => (
                  <option key={quality.value} value={quality.value} className="bg-[#141923]">
                    {quality.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="col-span-4 flex flex-col justify-start gap-4 h-full overflow-y-auto pr-1">
          <div className="bg-[#141923] border border-[#202B3A] p-4 rounded-lg">
            <h3 className="text-sm font-bold mb-4 text-white">🎨 风格定义</h3>

            <div className="mb-4">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">系统风格</label>
              <select
                value={selectedStyleId || ''}
                onChange={(e) => handleStyleChange(Number(e.target.value))}
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#141923]">选择风格...</option>
                {customStylesList.length > 0 && (
                  <optgroup label="⭐ 我的自定义风格" className="bg-[#141923]">
                    {customStylesList.map(style => (
                      <option key={style.id} value={style.id} className="bg-[#141923]">{style.name}</option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="🔥 顶级爆款" className="bg-[#141923]">
                  {HANDDRAWN_STYLES.filter(s => s.category === '顶级爆款').map(style => (
                    <option key={style.id} value={style.id} className="bg-[#141923]">{style.name}</option>
                  ))}
                </optgroup>
                {['特色极简', '现代数码手账', '传统复古美学', '教育与学术板书', '潮流前沿艺术'].map(category => (
                  <optgroup key={category} label={category} className="bg-[#141923]">
                    {HANDDRAWN_STYLES.filter(s => s.category === category).map(style => (
                      <option key={style.id} value={style.id} className="bg-[#141923]">{style.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">风格名称</label>
              <input
                type="text"
                value={customStyleName}
                onChange={(e) => setCustomStyleName(e.target.value)}
                placeholder="输入风格名称..."
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
              />
            </div>

            <div className="mb-5">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">风格描述 Prompt</label>
              <textarea
                value={customStylePrompt}
                onChange={(e) => setCustomStylePrompt(e.target.value)}
                placeholder="输入风格描述..."
                rows={8}
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none resize-none min-h-[200px] placeholder-[#ABC4FF]"
              />
            </div>

            <div className="mb-4">
              <h4 className="text-xs font-bold mb-2 text-white">✨ 我的自定义风格</h4>
              {customStylesList.length === 0 ? (
                <div className="py-3">
                  <p className="text-xs text-[#00F2FE] font-normal">暂无自定义风格，可在上方输入名称与描述后点击下方保存</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {customStylesList.map((style) => (
                    <div
                      key={style.id}
                      className={`border border-[#202B3A] px-3 py-1.5 text-xs font-mono font-medium cursor-pointer transition-all flex items-center gap-2 ${
                        selectedStyleId === style.id
                          ? 'bg-[#10B981] text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                          : 'bg-[#0B0D17] text-white hover:bg-[#1a2230]'
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

            <button
              onClick={handleSaveCustomStyle}
              className="w-full py-2.5 bg-[#0B0D17] border border-[#202B3A] text-sm text-white hover:border-[#10B981] hover:text-[#10B981] transition-all"
            >
              💾 保存自定义风格
            </button>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generationStatus === 'loading'}
            className={`w-full py-4 bg-[#00E676] text-[#0A0F1D] font-bold text-lg border border-[#202B3A] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,230,118,0.4)] ${
              generationStatus === 'loading' ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(0,230,118,0.6)]'
            }`}
          >
            {generationStatus === 'loading' ? (
              <>
                <div className="w-5 h-5 border-2 border-[#0A0F1D] border-t-transparent animate-spin"></div>
                生成中...
              </>
            ) : (
              <>🚀 开始生成</>
            )}
          </button>

          <div className="bg-[#141923] border border-[#202B3A] p-4 text-center">
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-[#00F2FE]">
                模型单价: <span className="font-bold text-[#00E676]">{modelPrice}</span> 积分
              </span>
              <span className="text-[#00F2FE]">
                生成数量: <span className="font-bold text-[#00E676]">{outputCount}</span> 张
              </span>
              <span className="text-[#00F2FE]">
                总成本: <span className="font-bold text-[#00E676]">{totalCost}</span> 积分
              </span>
            </div>
            <div className="mt-2 text-xs text-[#00F2FE]">
              余额: <span className="font-bold text-white">{profile?.credits || 0}</span> 积分
            </div>
          </div>
        </div>

        <div className="col-span-5 flex flex-col items-center justify-center h-full overflow-hidden bg-[#141923] border border-[#202B3A] p-4 rounded-lg">
          <h3 className="text-sm font-bold mb-3 text-white">🖼 生成预览</h3>
          
          <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
            <div
              className={`w-full ${getAspectClass()} bg-[#0B0D17] border border-[#202B3A] flex items-center justify-center overflow-hidden`}
            >
              {generationStatus === 'idle' && (
                <div className="text-center p-8">
                  <div className="text-4xl mb-3">🎨</div>
                  <p className="text-sm text-[#00F2FE]">暂无生成记录</p>
                  <p className="text-xs text-[#ABC4FF] mt-1">请在左侧输入内容并选择风格后<br />点击开始生成</p>
                </div>
              )}

              {generationStatus === 'loading' && (
                <div className="w-full h-full flex flex-col p-4 gap-4">
                  <div className="h-1/3 bg-[#0B0D17] border border-[#202B3A] animate-pulse"></div>
                  <div className="h-2 bg-[#0B0D17] animate-pulse"></div>
                  <div className="h-2 bg-[#0B0D17] animate-pulse" style={{ width: '80%' }}></div>
                  <div className="h-1/3 bg-[#0B0D17] border border-[#202B3A] animate-pulse mt-auto"></div>
                </div>
              )}

              {generationStatus === 'success' && generatedImages.length > 0 && (
                <img
                  src={generatedImages[0]}
                  alt="Generated"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          </div>

          {generationStatus === 'success' && generatedImages.length > 0 && (
            <div className="mt-3 w-full">
              <button
                onClick={() => handleDownload(generatedImages[0], 0)}
                className="w-full py-3 bg-[#00E676] text-[#0A0F1D] text-sm font-bold border border-[#202B3A] shadow-[0_0_15px_rgba(0,230,118,0.4)] hover:shadow-[0_0_20px_rgba(0,230,118,0.6)] transition-all"
              >
                📥 下载图片
              </button>
            </div>
          )}
        </div>
      </main>

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#141923] border border-[#202B3A] p-8 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-6 text-center">🔐 修改密码</h3>
            
            {passwordChangeError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-400 text-sm">
                {passwordChangeError}
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
              />
            </div>

            <div className="mb-6">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">确认新密码</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowChangePassword(false)
                  setNewPassword('')
                  setConfirmNewPassword('')
                  setPasswordChangeError('')
                }}
                className="flex-1 py-3 bg-[#0B0D17] border border-[#202B3A] text-white font-bold text-sm hover:border-[#00F2FE] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className={`flex-1 py-3 bg-[#00E676] text-[#0A0F1D] font-bold text-sm border border-[#202B3A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                  isChangingPassword ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(0,230,118,0.6)]'
                }`}
              >
                {isChangingPassword ? '保存中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}