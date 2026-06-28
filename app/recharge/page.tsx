'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

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
        setProfile({ credits: 3 })
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
          setProfile({ credits: 3 })
          return
        }

        setUser(data.user)
        setProfile({
          credits: data.profile?.credits ?? 3,
          avatar_url: data.profile?.avatar_url,
        })
      } catch (error) {
        console.error('Profile fetch error:', error)
        setProfile({ credits: 3 })
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

      const meResponse = await fetch('/api/auth/me', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      })
      const meData = await meResponse.json()

      if (!meData.success || !meData.user) {
        showToast('登录状态已失效，请重新登录。', 'error')
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
      showToast('复制失败，请手动添加微信号 YH509235。', 'error')
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
              <img src="/logo.png?v=6" alt="AI画堂" className="h-20 w-20 object-contain" />
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <NavLink href="/dashboard">创作中心</NavLink>
              <NavLink href="/records">生成记录</NavLink>
              <NavLink href="/recharge" active>
                卡密兑换
              </NavLink>
            </nav>

            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#142D24] bg-[#091511]/60 transition-colors hover:border-[#10B981] md:hidden"
            >
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

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
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="头像" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                    </span>
                  )}
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-10 z-50 w-56 overflow-hidden rounded-xl border border-[#142D24] bg-[#091511]/95 shadow-2xl backdrop-blur-md">
                    <div className="border-b border-[#142D24] p-3 sm:p-4">
                      <p className="mb-1 text-xs text-[#10B981]">当前账号</p>
                      <p className="truncate text-sm font-medium text-white">{user?.email || '未登录'}</p>
                    </div>
                    <div className="p-2">
                      <MenuButton onClick={() => { window.location.href = '/dashboard'; setShowUserMenu(false) }}>
                        创作中心
                      </MenuButton>
                      <MenuButton onClick={() => { window.location.href = '/records'; setShowUserMenu(false) }}>
                        生成记录
                      </MenuButton>
                      <MenuButton onClick={() => { window.location.href = '/profile'; setShowUserMenu(false) }}>
                        个人中心
                      </MenuButton>
                      <MenuButton onClick={() => { setShowChangePassword(true); setShowUserMenu(false) }}>
                        修改密码
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

          <div className="mb-6 flex flex-col items-center justify-center">
            <div>
              <h2 className="text-center text-xl font-bold text-white">官方卡密兑换中心</h2>
              <p className="mt-1 text-center text-sm text-[#10B981]">
                当前余额：<span className="font-bold text-[#00E676]">{profile?.credits ?? 0}</span> 积分
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#10B981]/30 bg-gradient-to-br from-[#10B981]/5 to-[#06B6D4]/5 p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xl text-[#10B981]">卡密</span>
              <h3 className="text-base font-bold text-white">兑换激活</h3>
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
                className="w-full rounded-lg border border-[#142D24] bg-[#040D0A] px-4 py-3 text-sm font-mono text-white outline-none transition-all placeholder-[#64748B] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/30"
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

            <p className="mt-3 text-center text-xs text-[#10B981]">
              支持连续多次激活。兑换成功后会自动清空输入框，方便继续下一张。
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowWechatModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[#142D24] bg-[#091511] p-6 shadow-2xl">
            <button
              onClick={() => setShowWechatModal(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#142D24] text-white transition-colors hover:bg-[#10B981] hover:text-[#040D0A]"
            >
              ×
            </button>

            <h3 className="mb-4 text-center text-lg font-bold text-white">官方人工客服</h3>

            <div className="mb-4">
              <div className="mx-auto h-36 w-36 rounded-xl bg-white p-2 shadow-lg">
                <img src="/wechat-qrcode.png?v=1" alt="微信二维码" className="h-full w-full object-contain" />
              </div>
              <p className="mt-2 text-center text-xs text-gray-400">扫码添加官方客服微信</p>
            </div>

            <button
              onClick={() => void handleCopyWechat()}
              className="w-full rounded-xl bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-green-500 hover:to-green-400 hover:shadow-green-500/30 active:scale-95"
            >
              一键复制微信号（YH509235）
            </button>

            <div className="mt-4 border-t border-[#142D24] pt-4">
              <p className="mb-2 text-xs font-bold text-[#10B981]">常用充值档位</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><span className="text-white">10 元</span> {'->'} <span className="text-[#10B981]">100 积分</span></p>
                <p><span className="text-white">29 元</span> {'->'} <span className="text-[#10B981]">320 积分</span></p>
                <p><span className="text-white">59 元</span> {'->'} <span className="text-[#10B981]">700 积分</span></p>
                <p><span className="text-white">99 元</span> {'->'} <span className="text-[#10B981]">1300 积分</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

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
