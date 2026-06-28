'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

interface UserProfile {
  id: string
  email: string
  credits: number
  created_at?: string
  avatar_url?: string
}

const compressImage = (file: File, maxSizeKB = 200): Promise<File> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const image = new Image()
      image.src = event.target?.result as string

      image.onload = () => {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')

        if (!context) {
          reject(new Error('无法创建画布'))
          return
        }

        let { width, height } = image
        const maxDimension = 512

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height)
          width *= ratio
          height *= ratio
        }

        canvas.width = width
        canvas.height = height
        context.drawImage(image, 0, 0, width, height)

        let quality = 0.9

        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('压缩失败'))
                return
              }

              const sizeKB = blob.size / 1024
              if (sizeKB <= maxSizeKB || quality <= 0.1) {
                resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
                return
              }

              quality -= 0.1
              compress()
            },
            'image/jpeg',
            quality,
          )
        }

        compress()
      }

      image.onerror = () => reject(new Error('图片加载失败'))
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
  })

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email?: string } | null>(null)
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
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }))
    }

    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      const session = getStoredSession()
      if (!session) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({}),
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

    void fetchUserAndProfile()
  }, [router])

  const handleLogout = () => {
    clearStoredSession()
    router.push('/login')
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const compressedFile = await compressImage(file, 200)
      setUploadProgress(50)

      const formData = new FormData()
      formData.append('file', compressedFile)

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        headers: authHeaders(false),
        body: formData,
      })

      setUploadProgress(100)
      const data = await response.json()

      if (data.success) {
        setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatarUrl } : null))
        alert('头像上传成功。')
      } else {
        alert(data.error || data.message || '上传失败。')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('图片处理失败，请重试。')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAvatarClick = () => fileInputRef.current?.click()

  if (!profile || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040D0A]">
        <p className="text-sm text-[#03F09C]">正在加载...</p>
      </div>
    )
  }

  const formatDate = (dateString?: string) =>
    dateString ? new Date(dateString).toLocaleDateString('zh-CN') : '-'

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#040D0A]">
      <header className="flex-shrink-0 border-b border-[#142D24] bg-[#040D0A]">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-2 sm:py-3">
            <Link href="/" className="flex items-center select-none transition-opacity hover:opacity-80">
              <img src="/logo.png?v=6" alt="AI画堂" className="h-20 w-20 object-contain" />
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <NavLink href="/dashboard">创作中心</NavLink>
              <NavLink href="/records">生成记录</NavLink>
              <NavLink href="/recharge">卡密兑换</NavLink>
              <NavLink href="/profile" active>
                个人中心
              </NavLink>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 text-xs text-[#10B981] sm:flex">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="font-mono text-sm font-bold text-white">{currentTime}</span>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-[#142D24] bg-[#091511]/60 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span className="hidden text-xs text-[#10B981] sm:inline">积分</span>
                <span className="text-sm font-bold text-white">{profile.credits || 0}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[#142D24] bg-[#091511]/60 transition-colors hover:border-[#10B981] sm:h-9 sm:w-9"
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="头像" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                    </span>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-[#142D24] bg-[#091511]/95 shadow-2xl backdrop-blur-md">
                    <div className="border-b border-[#142D24] p-3 sm:p-4">
                      <p className="mb-1 text-xs text-[#10B981]">当前账号</p>
                      <p className="truncate text-sm font-medium text-white">{user?.email || '未登录'}</p>
                    </div>
                    <div className="p-2">
                      <MenuButton onClick={() => { router.push('/dashboard'); setShowUserMenu(false) }}>
                        创作中心
                      </MenuButton>
                      <MenuButton onClick={() => { router.push('/records'); setShowUserMenu(false) }}>
                        生成记录
                      </MenuButton>
                      <MenuButton onClick={() => { router.push('/recharge'); setShowUserMenu(false) }}>
                        卡密兑换
                      </MenuButton>
                      <div className="my-1 border-t border-[#142D24]" />
                      <MenuButton danger onClick={() => { handleLogout(); setShowUserMenu(false) }}>
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

      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-xl border border-[#142D24] bg-[#091511]/60 shadow-2xl backdrop-blur-md">
            <div className="border-b border-[#142D24] p-6">
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-[#142D24] bg-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-transform hover:scale-105"
                  onClick={handleAvatarClick}
                >
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="头像" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-[#040D0A]">
                      {user?.email ? user.email.substring(0, 1).toUpperCase() : 'A'}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
                    <span className="text-xs font-bold text-white">更换头像</span>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <div className="text-center">
                        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-[#10B981] border-t-transparent" />
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
                  <p className="mt-1 text-sm text-[#10B981]">用户 ID：{profile.id.substring(0, 8)}...</p>
                </div>
              </div>
            </div>

            <div className="flex border-b border-[#142D24]">
              <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')}>
                基本信息
              </TabButton>
              <TabButton active={activeTab === 'password'} onClick={() => setActiveTab('password')}>
                修改密码
              </TabButton>
            </div>

            <div className="p-6">
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <InfoRow label="邮箱地址" value={profile.email || '-'} />
                  <InfoRow label="账户 ID" value={profile.id || '-'} mono />
                  <InfoRow label="当前积分" value={String(profile.credits || 0)} highlight />
                  <InfoRow label="注册时间" value={formatDate(profile.created_at)} />

                  <div className="mt-6 flex gap-3">
                    <Link
                      href="/recharge"
                      className="flex-1 rounded-lg border border-[#142D24] bg-[#10B981] py-3 text-center text-sm font-bold text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                    >
                      卡密兑换
                    </Link>
                    <Link
                      href="/records"
                      className="flex-1 rounded-lg border border-[#142D24] bg-[#091511]/60 py-3 text-center text-sm font-bold text-white transition-all hover:border-[#10B981]"
                    >
                      生成记录
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="rounded-xl border border-[#142D24] bg-[#040D0A] p-6">
                  <h3 className="mb-4 text-center text-lg font-bold text-white">修改密码</h3>
                  <p className="mb-4 text-center text-xs text-[#10B981]">建议定期更新密码，保障账户安全。</p>
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full rounded-lg border border-[#142D24] bg-[#10B981] py-3 text-sm font-bold text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                  >
                    打开修改密码面板
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ChangePasswordModal show={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />

      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#1e293b]/50 bg-[#030712]/95 py-2.5 backdrop-blur-sm">
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
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border px-5 py-2.5 text-base font-semibold tracking-wide transition-all md:text-lg ${
        active
          ? 'border-[#142D24] bg-[#10B981] text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)]'
          : 'border-[#142D24] bg-[#091511]/60 text-white hover:border-[#10B981] hover:bg-[#142D24]'
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
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        danger
          ? 'text-red-400 hover:bg-[#142D24]'
          : 'text-white hover:bg-[#142D24] hover:text-[#10B981]'
      }`}
    >
      {children}
    </button>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-bold transition-all ${
        active ? 'bg-[#10B981] text-[#040D0A]' : 'bg-[#091511]/60 text-white hover:bg-[#142D24]'
      }`}
    >
      {children}
    </button>
  )
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string
  value: string
  mono?: boolean
  highlight?: boolean
}) {
  return (
    <div className="rounded-lg border border-[#142D24] bg-[#040D0A] p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-[#10B981]">{label}</span>
        <span className={`${mono ? 'font-mono' : ''} ${highlight ? 'text-lg font-bold text-[#10B981]' : 'text-sm text-white'}`}>
          {value}
        </span>
      </div>
    </div>
  )
}
