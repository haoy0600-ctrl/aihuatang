'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BrandLogo } from '@/components/BrandLogo'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { UserAvatar } from '@/components/UserAvatar'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

interface UserProfile {
  id: string
  email: string
  username?: string | null
  credits: number
  created_at?: string
  avatar_url?: string | null
}

interface UserInfo {
  email?: string
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
          reject(new Error('无法处理头像图片'))
          return
        }

        let { width, height } = image
        const maxDimension = 512

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        context.drawImage(image, 0, 0, width, height)

        let quality = 0.9
        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('头像压缩失败'))
                return
              }

              const sizeKB = blob.size / 1024
              if (sizeKB <= maxSizeKB || quality <= 0.2) {
                const baseName = file.name.replace(/\.[^.]+$/, '')
                resolve(
                  new File([blob], `${baseName || 'avatar'}.jpg`, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  }),
                )
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

      image.onerror = () => reject(new Error('图片加载失败，请换一张图片重试'))
    }

    reader.onerror = () => reject(new Error('文件读取失败，请重试'))
  })

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<UserInfo | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
    updateTime()
    const timer = window.setInterval(updateTime, 1000)
    return () => window.clearInterval(timer)
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

        if (!response.ok || !data.success || !data.user || !data.profile) {
          clearStoredSession()
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

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件。')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const compressedFile = await compressImage(file)
      setUploadProgress(50)

      const formData = new FormData()
      formData.append('file', compressedFile)

      const response = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        headers: authHeaders(false),
        body: formData,
      })
      const data = await response.json()
      setUploadProgress(100)

      if (!response.ok || !data.success) {
        alert(data.error || data.message || '头像上传失败，请稍后重试。')
        return
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: data.avatarUrl } : prev))
    } catch (error) {
      console.error('Upload avatar error:', error)
      alert(error instanceof Error ? error.message : '图片处理失败，请重试。')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (!profile || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040D0A]">
        <p className="text-sm text-[#03F09C]">正在加载...</p>
      </div>
    )
  }

  const email = profile.email || user.email || ''
  const displayName = profile.username || email || 'AI画堂用户'
  const createdAt = profile.created_at ? new Date(profile.created_at).toLocaleDateString('zh-CN') : '-'

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#040D0A] text-white">
      <header className="border-b border-[#142D24] bg-[#040D0A]">
        <div className="mx-auto max-w-[1400px] px-3 min-[981px]:px-8">
          <div className="flex w-full items-center justify-between py-2 min-[981px]:py-3">
            <Link href="/" className="min-w-0 flex-1 select-none transition-opacity hover:opacity-80 min-[981px]:flex-none">
              <BrandLogo className="max-w-[132px] min-[981px]:max-w-none" />
            </Link>

            <nav className="hidden items-center gap-4 min-[981px]:flex">
              <NavLink href="/dashboard">创作中心</NavLink>
              <NavLink href="/records">生成记录</NavLink>
              <NavLink href="/recharge">卡密兑换</NavLink>
              <NavLink href="/profile" active>
                个人中心
              </NavLink>
            </nav>

            <div className="flex shrink-0 items-center gap-2 min-[981px]:gap-4">
              <div className="hidden items-center gap-2 text-xs text-[#10B981] min-[981px]:flex">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="font-mono text-sm font-bold text-white">{currentTime}</span>
              </div>

              <Link
                href="/recharge"
                className="flex items-center gap-1 rounded-lg border border-[#142D24] bg-[#091511]/60 px-2 py-1 min-[981px]:gap-1.5 min-[981px]:px-3 min-[981px]:py-1.5"
              >
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span className="hidden text-xs text-[#10B981] min-[981px]:inline">积分</span>
                <span className="text-sm font-bold text-white">{profile.credits || 0}</span>
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-[#142D24] bg-[#091511]/60 transition-colors hover:border-[#10B981]"
                  aria-label="打开用户菜单"
                >
                  <UserAvatar avatarUrl={profile.avatar_url || undefined} className="h-full w-full object-cover" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-[#142D24] bg-[#091511]/95 shadow-2xl backdrop-blur-md">
                    <div className="border-b border-[#142D24] p-3">
                      <p className="mb-1 text-xs text-[#10B981]">当前账号</p>
                      <p className="break-all text-sm font-medium text-white">{email || '未登录'}</p>
                    </div>
                    <div className="p-2">
                      <MenuButton onClick={() => router.push('/dashboard')}>创作中心</MenuButton>
                      <MenuButton onClick={() => router.push('/records')}>生成记录</MenuButton>
                      <MenuButton onClick={() => router.push('/recharge')}>卡密兑换</MenuButton>
                      <MenuButton onClick={() => setShowChangePassword(true)}>修改密码</MenuButton>
                      <div className="my-1 border-t border-[#142D24]" />
                      <MenuButton danger onClick={handleLogout}>
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

      <main className="mx-auto w-full max-w-[920px] flex-1 px-3 py-5 min-[981px]:py-8">
        <section className="rounded-2xl border border-[#142D24] bg-[#091511]/70 p-4 shadow-2xl backdrop-blur-md min-[981px]:rounded-3xl min-[981px]:p-6">
          <div className="flex flex-col gap-5 min-[981px]:flex-row min-[981px]:items-center min-[981px]:justify-between">
            <div className="flex min-w-0 flex-col gap-4 min-[520px]:flex-row min-[520px]:items-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[#10B981]/30 bg-[#0B1511] min-[981px]:h-24 min-[981px]:w-24 min-[981px]:rounded-3xl"
                aria-label="更换头像"
              >
                <UserAvatar avatarUrl={profile.avatar_url || undefined} className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-xs text-white">更换头像</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              <div className="min-w-0">
                <h1 className="break-all text-2xl font-black leading-tight text-white min-[981px]:text-3xl">
                  {displayName}
                </h1>
                <p className="mt-2 break-all text-xs leading-relaxed text-[#10B981] min-[981px]:text-sm">
                  账号 ID：{profile.id}
                </p>
                {uploading && <p className="mt-2 text-xs text-[#8CF5CA]">头像上传中：{uploadProgress}%</p>}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowChangePassword(true)}
              className="w-full rounded-2xl border border-[#10B981]/30 bg-[#0E1C17] px-5 py-3 text-sm font-semibold text-[#D9FFF0] transition hover:border-[#10B981] min-[981px]:w-auto"
            >
              修改密码
            </button>
          </div>

          <div className="mt-8 grid gap-4 min-[981px]:grid-cols-2">
            <InfoCard label="用户名" value={profile.username || '未设置'} />
            <InfoCard label="邮箱地址" value={email || '-'} />
            <InfoCard label="当前积分" value={`${profile.credits || 0}`} strong />
            <InfoCard label="注册时间" value={createdAt} />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 min-[981px]:grid-cols-2">
            <Link
              href="/recharge"
              className="w-full rounded-2xl bg-[#10B981] px-5 py-3 text-center text-sm font-bold text-[#04120D] shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              前往卡密兑换
            </Link>
            <Link
              href="/records"
              className="w-full rounded-2xl border border-[#142D24] bg-[#0A1411] px-5 py-3 text-center text-sm font-semibold text-white transition hover:border-[#10B981]"
            >
              查看生成记录
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#142D24] bg-[#040D0A]/95 py-3 text-center text-xs text-gray-400">
        使用本站即代表你同意
        <button type="button" onClick={() => setShowTermsModal(true)} className="ml-1 text-[#10B981] underline underline-offset-2">
          《安全合规与使用须知》
        </button>
      </footer>

      <ChangePasswordModal show={showChangePassword} onClose={() => setShowChangePassword(false)} />
      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-[#10B981] text-[#04120D]' : 'text-white hover:bg-[#101E18]'
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
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white hover:bg-[#123527] hover:text-[#10B981]'
      }`}
    >
      {children}
    </button>
  )
}

function InfoCard({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#142D24] bg-[#07110E] px-5 py-4">
      <p className="text-sm text-[#7FDDBB]">{label}</p>
      <p className={`mt-2 break-all ${strong ? 'text-2xl font-black text-[#10B981]' : 'text-base text-white'}`}>
        {value}
      </p>
    </div>
  )
}
