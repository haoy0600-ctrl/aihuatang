'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { BrandLogo } from '@/components/BrandLogo'
import { UserAvatar } from '@/components/UserAvatar'
import { authHeaders, clearStoredSession, getStoredSession } from '@/lib/session'

type UserInfo = {
  email?: string
}

type ProfileInfo = {
  credits: number
  avatar_url?: string
}

type ToastType = 'success' | 'error'

type RechargePlan = {
  credits: number
  price: number
  title: string
  desc: string
  highlight?: boolean
}

const RECHARGE_PLANS: RechargePlan[] = [
  { credits: 100, price: 10, title: '体验入门', desc: '适合新用户试用流程、少量测试和临时出图。' },
  { credits: 320, price: 29, title: '轻量创作', desc: '适合日常图文、课程小批量生成。' },
  { credits: 700, price: 59, title: '高频创作', desc: '适合持续产出，单积分成本更低。', highlight: true },
  { credits: 1300, price: 99, title: '工作室进阶', desc: '适合多账号运营或集中制作素材。' },
  { credits: 2800, price: 199, title: '长期高阶', desc: '适合稳定批量生产和团队使用。' },
]

const CUSTOMER_SERVICE_WECHAT = 'YH509235'

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
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan>(RECHARGE_PLANS[2])
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
        if (!response.ok || !data.success) {
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

  const purchaseText = useMemo(
    () => `你好，我想购买 ${selectedPlan.credits} 积分（${selectedPlan.price} 元）套餐，请发我对应卡密。`,
    [selectedPlan],
  )

  const showToast = (message: string, type: ToastType) => {
    setToastMessage(message)
    setToastType(type)
    window.setTimeout(() => setToastMessage(''), 2800)
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
        showToast('请先登录后再兑换卡密。', 'error')
        return
      }

      const response = await fetch('/api/user/redeem-card', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ cardCode: cleanCode }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        showToast(data.error || data.message || '兑换失败，请稍后重试。', 'error')
        return
      }

      setProfile((prev) => ({
        credits: data.totalCredits ?? prev?.credits ?? 0,
        avatar_url: prev?.avatar_url,
      }))
      setCardCode('')
      cardCodeInputRef.current?.focus()
      showToast('兑换成功，积分已到账。', 'success')
    } catch (error) {
      console.error('Redeem card error:', error)
      showToast('网络异常，请稍后重试。', 'error')
    } finally {
      setIsRedeeming(false)
    }
  }

  const handleCopyPurchaseInfo = async () => {
    try {
      await navigator.clipboard.writeText(`客服微信：${CUSTOMER_SERVICE_WECHAT}\n${purchaseText}`)
      showToast('已复制客服微信和购买话术。', 'success')
    } catch (error) {
      console.error('Copy wechat error:', error)
      showToast(`复制失败，请手动添加微信：${CUSTOMER_SERVICE_WECHAT}`, 'error')
    }
  }

  const handleLogout = () => {
    clearStoredSession()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-[#040D0A] text-white">
      <header className="border-b border-[#142D24] bg-[#040D0A]">
        <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-8">
          <div className="flex w-full items-center justify-between py-2 sm:py-3">
            <Link href="/" className="min-w-0 flex-1 select-none transition-opacity hover:opacity-80 sm:flex-none">
              <BrandLogo className="max-w-[132px] sm:max-w-none" />
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <NavLink href="/dashboard">创作中心</NavLink>
              <NavLink href="/records">生成记录</NavLink>
              <NavLink href="/recharge" active>
                充值中心
              </NavLink>
              <NavLink href="/announcements">站内公告</NavLink>
            </nav>

            <div className="hidden shrink-0 items-center gap-4 md:flex">
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
                  <UserAvatar avatarUrl={profile?.avatar_url} className="h-full w-full object-cover" />
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

      {toastMessage && (
        <div
          className={`fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-xl px-6 py-3 shadow-2xl backdrop-blur-md ${
            toastType === 'success'
              ? 'border border-[#10B981] bg-[#10B981]/90 text-[#040D0A]'
              : 'border border-red-500 bg-red-500/90 text-white'
          }`}
        >
          <span className="text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section className="mb-8 rounded-3xl border border-[#10B981]/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.12),transparent_55%),#09110E] p-6 shadow-xl sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.24em] text-[#10B981]">充值与卡密兑换</p>
              <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">选择充值方案，再联系客服购买卡密</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9BB7AD] sm:text-base">
                页面直接展示各个金额的积分方案。选中方案后复制客服微信和购买话术，客服发卡密后回到这里兑换，积分会立即到账。
              </p>
              <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
                <button
                  onClick={() => void handleCopyPurchaseInfo()}
                  className="rounded-xl bg-gradient-to-r from-[#10B981] to-[#06B6D4] px-5 py-3 text-sm font-bold text-[#04110D] shadow-[0_0_20px_rgba(16,185,129,0.28)] transition-all hover:shadow-[0_0_28px_rgba(16,185,129,0.42)]"
                >
                  复制客服与方案
                </button>
                <button
                  onClick={() => cardCodeInputRef.current?.focus()}
                  className="rounded-xl border border-[#1E4C3D] bg-[#0B1512] px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-[#10B981]"
                >
                  我已有卡密，立即兑换
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#163428] bg-[#07110D] p-5">
              <p className="text-sm text-[#7DE8B5]">当前可用积分</p>
              <div className="mt-3 flex items-end justify-between">
                <span className="text-5xl font-black text-white">{profile?.credits ?? 0}</span>
                <span className="rounded-full border border-[#1E4C3D] bg-[#0E1A15] px-3 py-1 text-xs text-[#9BB7AD]">
                  实时同步
                </span>
              </div>
              <div className="mt-5 rounded-2xl border border-[#123527] bg-[#091A14] p-4">
                <p className="text-sm font-semibold text-[#8CF5CA]">兑换规则</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#B9CCC5]">
                  <li>1. 官方卡密通常以 AHT- 开头。</li>
                  <li>2. 卡密只能兑换一次，请勿转发给他人。</li>
                  <li>3. 兑换成功后，积分立即加入当前账号。</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-[#142D24] bg-[#08120F] p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-bold text-white">充值方案</h2>
              <p className="mt-1 text-sm text-[#9BB7AD]">点击任意方案即可切换右侧购买信息。</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {RECHARGE_PLANS.map((plan) => {
                const active = selectedPlan.credits === plan.credits
                return (
                  <button
                    key={plan.credits}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`rounded-2xl border p-5 text-left transition-all ${
                      active
                        ? 'border-[#10B981] bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(9,21,17,0.94))] shadow-[0_0_24px_rgba(16,185,129,0.16)]'
                        : 'border-[#1A3A2D] bg-[#0B1512] hover:border-[#10B981]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#7DE8B5]">{plan.title}</p>
                        <p className="mt-3 text-3xl font-black text-white">{plan.credits}</p>
                        <p className="mt-1 text-sm text-[#9BB7AD]">积分到账</p>
                      </div>
                      {plan.highlight && (
                        <span className="rounded-full border border-[#10B981]/40 bg-[#10B981]/12 px-3 py-1 text-xs font-semibold text-[#8CF5CA]">
                          推荐
                        </span>
                      )}
                    </div>
                    <p className="mt-4 min-h-[40px] text-sm leading-5 text-[#9BB7AD]">{plan.desc}</p>
                    <div className="mt-5 flex items-end justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#6E8D82]">售价</p>
                        <p className="mt-1 text-2xl font-bold text-white">¥{plan.price}</p>
                      </div>
                      <span className="text-sm font-semibold text-[#10B981]">{active ? '已选择' : '选择'}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[#142D24] bg-[#08120F] p-5 sm:p-6">
              <h2 className="text-xl font-bold text-white">购买信息</h2>
              <p className="mt-2 text-sm leading-6 text-[#9BB7AD]">已选方案会自动生成话术，复制后发给客服即可。</p>

              <div className="mt-5 rounded-2xl border border-[#123527] bg-[#091A14] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-[#7DE8B5]">客服微信</p>
                    <p className="mt-2 font-mono text-2xl font-black text-white">{CUSTOMER_SERVICE_WECHAT}</p>
                  </div>
                  <div className="rounded-xl border border-[#1E4C3D] bg-[#07110D] px-3 py-2 text-right">
                    <p className="text-xs text-[#7DE8B5]">当前方案</p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {selectedPlan.credits} 积分 / ¥{selectedPlan.price}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-[#173427] bg-[#07110D] p-4">
                  <p className="text-sm text-[#8CF5CA]">建议发送给客服</p>
                  <p className="mt-2 text-sm leading-6 text-[#D0E4DB]">{purchaseText}</p>
                </div>
              </div>

              <button
                onClick={() => void handleCopyPurchaseInfo()}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#10B981] to-[#06B6D4] px-4 py-3 text-sm font-bold text-[#04110D]"
              >
                复制客服微信和购买话术
              </button>
            </div>

            <div className="rounded-3xl border border-[#142D24] bg-[#08120F] p-5 sm:p-6">
              <h2 className="text-xl font-bold text-white">卡密兑换</h2>
              <p className="mt-2 text-sm leading-6 text-[#9BB7AD]">拿到客服发来的卡密后，粘贴到这里兑换。</p>

              <div className="mt-5 space-y-3">
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
                  placeholder="请输入官方卡密，例如 AHT-XXXX-XXXX"
                  className="w-full rounded-xl border border-[#1A3A2D] bg-[#040D0A] px-4 py-3 text-sm font-mono text-white outline-none transition-all placeholder:text-[#5F776B] focus:border-[#10B981]"
                />

                <button
                  onClick={() => void handleRedeemCard()}
                  disabled={isRedeeming || !cardCode.trim()}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                    isRedeeming || !cardCode.trim()
                      ? 'cursor-not-allowed border border-[#173427] bg-[#0D1713] text-[#587166]'
                      : 'bg-gradient-to-r from-[#10B981] to-[#06B6D4] text-[#04110D] shadow-[0_0_18px_rgba(16,185,129,0.25)] hover:shadow-[0_0_24px_rgba(16,185,129,0.38)]'
                  }`}
                >
                  {isRedeeming ? '兑换中...' : '立即兑换积分'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#142D24]/50 bg-[#040D0A]/95 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-400">
          登录或使用本站即代表您已阅读并同意
          <button
            onClick={() => setShowTermsModal(true)}
            className="ml-1 rounded px-1 text-[#00E676] underline underline-offset-2 transition-colors hover:text-[#00F2FE]"
          >
            《安全合规与使用须知》
          </button>
        </div>
      </footer>

      <TermsModal show={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <ChangePasswordModal show={showChangePassword} onClose={() => setShowChangePassword(false)} />
    </div>
  )
}

function NavLink({
  href,
  children,
  active = false,
}: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
        active
          ? 'border-transparent bg-[#10B981] text-[#04110D] shadow-[0_0_18px_rgba(16,185,129,0.35)]'
          : 'border-[#142D24] bg-[#091511]/60 text-white hover:border-[#10B981] hover:text-[#8CF5CA]'
      }`}
    >
      {children}
    </Link>
  )
}

function MenuButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white hover:bg-[#123527]'
      }`}
    >
      {children}
    </button>
  )
}
