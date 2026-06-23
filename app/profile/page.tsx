'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'

interface UserProfile {
  id: string
  email: string
  credits: number
  created_at?: string
  avatar_url?: string
}

const compressImage = (file: File, maxSizeKB: number = 200): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target?.result as string
      
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('无法创建画布'))
          return
        }
        
        let { width, height } = img
        const maxDimension = 512
        
        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height)
          width = width * ratio
          height = height * ratio
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        let quality = 0.9
        let blob: Blob
        
        const compress = () => {
          canvas.toBlob((result) => {
            if (!result) {
              reject(new Error('压缩失败'))
              return
            }
            
            const sizeKB = result.size / 1024
            
            if (sizeKB <= maxSizeKB || quality <= 0.1) {
              blob = result
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              })
              resolve(compressedFile)
            } else {
              quality -= 0.1
              compress()
            }
          }, 'image/jpeg', quality)
        }
        
        compress()
      }
      
      img.onerror = () => {
        reject(new Error('图片加载失败'))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
  })
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    const fetchUserAndProfile = async () => {
      const storedSession = localStorage.getItem('ai_handdrawn_login_session')
      if (!storedSession) {
        router.push('/login')
        return
      }

      let session: any
      try {
        session = JSON.parse(storedSession)
      } catch {
        router.push('/login')
        return
      }

      const now = Date.now()
      if (!session.email || session.expiresAt < now) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.email })
        })

        const data = await response.json()

        if (!data.success || !data.user || !data.profile) {
          router.push('/login')
          return
        }

        setUser(data.user)
        setProfile(data.profile)
      } catch (error) {
        console.error('Fetch profile error:', error)
        router.push('/login')
      }
    }

    fetchUserAndProfile()
  }, [router])

  const handleLogout = async () => {
    localStorage.removeItem('ai_handdrawn_login_session')
    router.push('/login')
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const compressedFile = await compressImage(file, 200)
      setUploadProgress(50)

      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('userId', profile?.id || '')

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        body: formData
      })

      setUploadProgress(100)

      const data = await response.json()

      if (data.success) {
        setProfile(prev => prev ? { ...prev, avatar_url: data.avatarUrl } : null)
        alert('头像上传成功！')
      } else {
        alert(data.error || '上传失败')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('图片压缩失败，请重试')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-[#040D0A] flex items-center justify-center">
        <p className="text-[#03F09C] text-sm">正在加载...</p>
      </div>
    )
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#040D0A]">
      <header className="bg-[#040D0A] border-b border-[#142D24] flex-shrink-0">
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
              <Link href="/dashboard" className="px-5 py-2.5 bg-[#091511]/60 backdrop-blur-sm text-white font-semibold text-base tracking-wide md:text-lg border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-xl">
                创作
              </Link>
              <Link href="/records" className="px-5 py-2.5 bg-[#091511]/60 backdrop-blur-sm text-white font-semibold text-base tracking-wide md:text-lg border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-xl">
                记录
              </Link>
              <Link href="/recharge" className="px-5 py-2.5 bg-[#091511]/60 backdrop-blur-sm text-white font-semibold text-base tracking-wide md:text-lg border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-xl">
                卡密兑换
              </Link>
              <Link href="/profile" className="px-5 py-2.5 bg-[#10B981] text-[#040D0A] font-semibold text-base tracking-wide md:text-lg border border-[#142D24] shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all rounded-xl">
                个人中心
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#10B981]">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
              </div>
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center gap-1 sm:gap-1.5 rounded-lg">
                <span className="w-2 h-2 bg-[#10B981] rounded-full"></span>
                <span className="text-xs text-[#10B981] hidden sm:inline">积分</span>
                <span className="font-bold text-white text-sm">{profile?.credits || 0}</span>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center justify-center hover:border-[#10B981] transition-colors rounded-lg overflow-hidden"
                >
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="头像" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-sm">
                      {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                    </span>
                  )}
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 sm:w-56 bg-[#091511]/95 backdrop-blur-md border border-[#142D24] shadow-2xl z-50 rounded-xl overflow-hidden">
                    <div className="p-3 sm:p-4 border-b border-[#142D24]">
                      <p className="text-xs text-[#10B981] mb-1">当前账号</p>
                      <p className="text-sm text-white font-medium truncate">{user?.email || '未登录'}</p>
                    </div>
                    <div className="p-2 border-b border-[#142D24] md:hidden">
                      <button 
                        onClick={() => { router.push('/dashboard'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg"
                      >
                        🎨 创作工坊
                      </button>
                      <button 
                        onClick={() => { router.push('/records'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg"
                      >
                        📁 生成记录
                      </button>
                      <button 
                        onClick={() => { router.push('/recharge'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg"
                      >
                        🔑 卡密兑换
                      </button>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { router.push('/dashboard'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg hidden md:block"
                      >
                        创作工坊
                      </button>
                      <button 
                        onClick={() => { router.push('/records'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg hidden md:block"
                      >
                        生成记录
                      </button>
                      <button 
                        onClick={() => { router.push('/recharge'); setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg hidden md:block"
                      >
                        🔑 卡密兑换
                      </button>
                      <div className="border-t border-[#142D24] my-1 hidden md:block"></div>
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

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] rounded-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#142D24]">
              <div className="flex items-center gap-4">
                <div 
                  className="relative w-16 h-16 bg-[#10B981] border border-[#142D24] flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)] rounded-xl overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                  onClick={handleAvatarClick}
                >
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="头像" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#040D0A] font-bold text-2xl">
                      {user?.email ? user.email.substring(0, 1).toUpperCase() : 'A'}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold">更换头像</span>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <span className="text-xs text-[#10B981]">{uploadProgress}%</span>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <div>
                  <h2 className="text-xl font-bold text-white">{user?.email}</h2>
                  <p className="text-sm text-[#10B981] mt-1">用户ID: {profile?.id.substring(0, 8)}...</p>
                </div>
              </div>
            </div>

            <div className="flex border-b border-[#142D24]">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-3 text-sm font-bold transition-all ${
                  activeTab === 'info'
                    ? 'bg-[#10B981] text-[#040D0A]'
                    : 'bg-[#091511]/60 text-white hover:bg-[#142D24]'
                }`}
              >
                👤 基本信息
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 py-3 text-sm font-bold transition-all ${
                  activeTab === 'password'
                    ? 'bg-[#10B981] text-[#040D0A]'
                    : 'bg-[#091511]/60 text-white hover:bg-[#142D24]'
                }`}
              >
                🔐 修改密码
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="bg-[#040D0A] border border-[#142D24] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#10B981]">邮箱地址</span>
                      <span className="text-sm text-white font-medium">{profile?.email || '-'}</span>
                    </div>
                  </div>

                  <div className="bg-[#040D0A] border border-[#142D24] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#10B981]">账号ID</span>
                      <span className="text-sm text-white font-mono">{profile?.id || '-'}</span>
                    </div>
                  </div>

                  <div className="bg-[#040D0A] border border-[#142D24] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#10B981]">当前积分</span>
                      <span className="text-lg font-bold text-[#10B981]">{profile?.credits || 0}</span>
                    </div>
                  </div>

                  <div className="bg-[#040D0A] border border-[#142D24] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#10B981]">注册时间</span>
                      <span className="text-sm text-white">{formatDate(profile?.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Link
                      href="/recharge"
                      className="flex-1 py-3 bg-[#10B981] text-[#040D0A] font-bold text-sm border border-[#142D24] text-center shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all rounded-lg"
                    >
                      🔑 卡密兑换
                    </Link>
                    <Link
                      href="/records"
                      className="flex-1 py-3 bg-[#091511]/60 text-white font-bold text-sm border border-[#142D24] text-center hover:border-[#10B981] transition-all rounded-lg"
                    >
                      📋 生成记录
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="bg-[#040D0A] border border-[#142D24] p-6 rounded-xl">
                  <h3 className="text-lg font-bold text-white mb-4 text-center">🔐 修改密码</h3>
                  <p className="text-xs text-[#10B981] mb-4 text-center">请输入原密码和新密码完成修改</p>
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full py-3 bg-[#10B981] text-[#040D0A] font-bold text-sm border border-[#142D24] shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all rounded-lg"
                  >
                    修改密码
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ChangePasswordModal
        show={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <TermsModal
        show={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      <footer className="fixed bottom-0 left-0 right-0 py-2 bg-[#040D0A]/95 border-t border-[#142D24]/50 backdrop-blur-sm z-40">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          <p className="text-[10px] text-gray-500">
            登录或使用本站即代表您同意{' '}
            <button 
              onClick={() => setShowTermsModal(true)}
              className="text-[#10B981] hover:text-[#00E676] underline underline-offset-1 transition-colors"
            >
              《安全合规与使用须知》
            </button>
          </p>
        </div>
      </footer>
    </div>
  )
}