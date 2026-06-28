'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'
import { resolveAvatarUrl } from '@/lib/avatar'

type UserInfo = {
  email?: string
}

type ProfileInfo = {
  credits: number
  avatar_url?: string
}

type ToastType = 'success' | 'error'

export default function RechargePage() {
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<UserInfo | null>(null)
  const [profile, setProfile] = useState<ProfileInfo | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [cardCode, setCardCode] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<ToastType>('success')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showWechatModal, setShowWechatModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const cardCodeInputRef = useRef<HTMLInputElement>(null)

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
    const fetchProfile = async () => {
      const session = getStoredSession()
      if (!session) {
        setProfile({ credits: 0 })
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({}),
        })

        const data = await response.json()

        if (!data.success) {
          setProfile({ credits: 0 })
          return
        }

        setUser(data.user)
        setProfile({
          credits: data.profile?.credits ?? 0,
          avatar_url: data.profile?.avatar_url,
        })
      } catch (error) {
        console.error('Profile fetch error:', error)
        setProfile({ credits: 0 })
      }
    }

    void fetchProfile()
  }, [])

  const showToast = (message: string, type: ToastType) => {
    setToastMessage(message)
    setToastType(type)
    window.setTimeout(() => setToastMessage(''), 3000)
  }

  const handleRedeemCard = async () => {
    const cleanCode = cardCode.trim().toUpperCase()

    if (!cleanCode) {
      showToast('请输入卡密。', 'error')
      return
    }

    setIsRedeeming(true)

    try {
      const session = getStoredSession()
      if (!session) {
        showToast('请先登录。', 'error')
        return
      }

      const response = await fetch('/api/user/redeem-card', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ cardCode: cleanCode }),
      })
      const data = await response.json()

      if (data.success) {
        showToast('兑换成功，对应积分已充值到账。', 'success')
        setProfile((prev) => ({
          credits: data.totalCredits ?? prev?.credits ?? 0,
          avatar_url: prev?.avatar_url,
        }))
        setCardCode('')
        cardCodeInputRef.current?.focus()
      } else {
        showToast(data.error || data.message || '兑换失败。', 'error')
      }
    } catch (error) {
      console.error('Redeem error:', error)
      showToast('网络异常，请稍后重试。', 'error')
    } finally {
      setIsRedeeming(false)
    }
  }

  const handleCopyWechat = async () => {
    try {
      await navigator.clipboard.writeText('YH509235')
      showToast('微信号已复制，去微信添加客服即可。', 'success')
    } catch (error) {
      console.error('Copy wechat error:', error)
      showToast('复制失败，请手动添加微信号：YH509235。', 'error')
    }
  }

  const handleLogout = () => {
    clearStoredSession()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-[#040D0A]">
      <header className="border-b border-[#142D24] bg-[#040D0A]">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-2 sm:py-3">
            <Link href="/" className="flex items-center select-none transition-opacity hover:opacity-80">
              <img src="/logo.svg?v=2" alt="AI画堂" className="h-20 w-20 object-contain" />
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <NavLink href="/dashboard">创作中心</NavLink>
              <NavLink href="/records">生成记录</NavLink>
              <NavLink href="/recharge" active>
                卡密兑换
              </NavLink>
            </nav>

            <div className="hidden items-center gap-4 md:flex">
              <div className="hidden items-center gap-2 text-xs text-[#10B981] sm:flex">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="font-mono text-sm font-bold text-white">{currentTime}</span>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-[#142D24] bg-[#091511]/60 px-2 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span className="hidden text-xs text-[#10B981] sm:inline">积分</span>
                <span className="text-sm font-bold text-white">{profile?.credits ?? 0}</span>
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-[#142D24] bg-[#091511]/60 transition-colors hover:border-[#10B981] sm:h-9 sm:w-9"
                >
                  <img src={resolveAvatarUrl(profile?.avatar_url)} alt="头像" className="h-full w-full object-cover" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-[#142D24] bg-[#091511]/95 shadow-2xl backdrop-blur-md">
                    <div className="border-b border-[#142D24] p-3 sm:p-4">
                      <p className="mb-1 text-xs text-[#10B981]">当前账号</p>
                      <p className="truncate text-sm font-medium text-white">{user?.email || '未登录'}</p>
                    </div>
                    <div className="p-2">
                      <MenuButton onClick={() => (window.location.href = '/dashboard')}>创作中心</MenuButton>
                      <MenuButton onClick={() => (window.location.href = '/records')}>生成记录</MenuButton>
                      <MenuButton onClick={() => (window.location.href = '/profile')}>个人中心</MenuButton>
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

      <main className="p-4 sm:p-6">
        <div className="mx-auto max-w-lg">
          {toastMessage && (
            <div
              className={`fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl px-6 py-3 shadow-2xl backdrop-blur-md transition-all duration-300 ${
                toastType === 'success'
                  ? 'border border-[#10B981] bg-[#10B981]/90 text-[#040D0A]'
                  : 'border border-red-500 bg-red-500/90 text-white'
              }`}
            >
              <span className="text-sm font-bold">{toastMessage}</span>
            </div>
          )}

          <div className="rounded-3xl border border-[#10B981]/30 bg-gradient-to-br from-[#10B981]/5 to-[#06B6D4]/5 p-6 shadow-xl">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-black text-white">官方卡密兑换中心</h1>
              <p className="mt-2 text-sm text-[#10B981]">
                当前余额：<span className="font-bold text-[#00E676]">{profile?.credits ?? 0}</span> 积分
              </p>
            </div>

            <p className="mb-4 text-xs text-[#10B981]">请输入以 `AHT-` 开头的官方卡密激活码</p>

            <div className="flex flex-col gap-3">
              <input
                ref={cardCodeInputRef}
                type="text"
                value={cardCode}
                onChange={(event) => setCardCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleRedeemCard()
                  }
                }}
                placeholder="请输入以 AHT- 开头的官方卡密激活码"
                className="w-full rounded-lg border border-[#142D24] bg-[#040D0A] px-4 py-3 text-sm font-mono text-white outline-none transition-all placeholder:text-[#64748B] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/30"
              />

              <button
                onClick={() => void handleRedeemCard()}
                disabled={isRedeeming || !cardCode.trim()}
                className={`w-full rounded-lg border px-4 py-3 text-sm font-bold transition-all ${
                  isRedeeming || !cardCode.trim()
                    ? 'cursor-not-allowed border-[#142D24] bg-[#091511]/60 text-gray-500'
                    : 'border-transparent bg-gradient-to-r from-[#10B981] to-[#06B6D4] text-[#040D0A] shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                }`}
              >
                {isRedeeming ? '兑换中...' : '立即兑换积分'}
              </button>
            </div>

            <p className="mt-4 text-center text-xs text-gray-400">
              还没有卡密？
              <button
                onClick={() => setShowWechatModal(true)}
                className="ml-1 font-medium text-[#10B981] underline underline-offset-2 transition-colors hover:text-[#00E676]"
              >
                点击联系官方客服
              </button>
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="flex-1 rounded-lg border border-[#142D24] bg-[#091511] px-4 py-2.5 text-center text-sm font-bold text-white transition-all hover:border-[#10B981] hover:text-[#10B981]"
            >
              返回创作
            </Link>
          </div>
        </div>
      </main>

      {showWechatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[#142D24] bg-[#091511] p-6 text-center">
            <h3 className="text-lg font-bold text-white">联系官方客服</h3>
            <p className="mt-3 text-sm text-gray-300">微信号：YH509235</p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={handleCopyWechat}
                className="flex-1 rounded-xl bg-[#10B981] px-4 py-3 text-sm font-bold text-[#04120D]"
              >
                复制微信号
              </button>
              <button
                onClick={() => setShowWechatModal(false)}
                className="flex-1 rounded-xl border border-[#142D24] px-4 py-3 text-sm font-semibold text-white"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

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
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        danger ? 'text-red-400 hover:bg-[#142D24]' : 'text-white hover:bg-[#142D24] hover:text-[#10B981]'
      }`}
    >
      {children}
    </button>
  )
}
