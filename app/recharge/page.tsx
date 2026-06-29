'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'
import { resolveAvatarUrl } from '@/lib/avatar'
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
  highlight?: boolean
}

const RECHARGE_PLANS: RechargePlan[] = [
  { credits: 100, price: 10, title: '体验入门包' },
  { credits: 320, price: 29, title: '常用轻量包' },
  { credits: 700, price: 59, title: '高频创作包', highlight: true },
  { credits: 1300, price: 99, title: '工作室进阶包' },
  { credits: 2800, price: 199, title: '长期高阶包' },
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
  const [showWechatModal, setShowWechatModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<RechargePlan | null>(null)
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

  const wechatCopyText = useMemo(() => {
    if (!selectedPlan) return CUSTOMER_SERVICE_WECHAT
    return `${CUSTOMER_SERVICE_WECHAT}（我要购买 ${selectedPlan.credits} 积分 / ${selectedPlan.price} 元）`
  }, [selectedPlan])

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
      if (!data.success) {
        showToast(data.error || data.message || '兑换失败，请稍后重试。', 'error')
        return
      }

      setProfile((prev) => ({
        credits: data.totalCredits ?? prev?.credits ?? 0,
        avatar_url: prev?.avatar_url,
      }))
      setCardCode('')
      cardCodeInputRef.current?.focus()
      showToast('兑换成功，对应积分已到账。', 'success')
    } catch (error) {
      console.error('Redeem card error:', error)
      showToast('网络异常，请稍后重试。', 'error')
    } finally {
      setIsRedeeming(false)
    }
  }

  const handleCopyWechat = async () => {
    try {
      await navigator.clipboard.writeText(wechatCopyText)
      showToast('客服微信已复制，可以直接去微信粘贴联系。', 'success')
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
            <Link href="/" className="flex select-none items-center transition-opacity hover:opacity-80">
              <img src="/logo.svg?v=3" alt="AI画堂" className="h-20 w-20 object-contain" />
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              <NavLink href="/dashboard">创作中心</NavLink>
              <NavLink href="/records">生成记录</NavLink>
              <NavLink href="/recharge" active>
                充值中心
              </NavLink>
              <NavLink href="/announcements">站内公告</NavLink>
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
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.24em] text-[#10B981]">充值与兑换</p>
              <h1 className="text-3xl font-black text-white sm:text-4xl">查看充值方案，卡密到账后立即可用</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9BB7AD] sm:text-base">
                这里可以直接看到所有积分套餐，也可以兑换你已经拿到的官方卡密。充值仍然通过客服发卡的方式完成，但不用再靠记忆去对金额，页面里已经把价格和积分对应关系整理好了。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSelectedPlan(RECHARGE_PLANS.find((item) => item.highlight) || RECHARGE_PLANS[2])
                    setShowWechatModal(true)
                  }}
                  className="rounded-xl bg-gradient-to-r from-[#10B981] to-[#06B6D4] px-5 py-3 text-sm font-bold text-[#04110D] shadow-[0_0_20px_rgba(16,185,129,0.28)] transition-all hover:shadow-[0_0_28px_rgba(16,185,129,0.42)]"
                >
                  联系客服购买
                </button>
                <button
                  onClick={() => cardCodeInputRef.current?.focus()}
                  className="rounded-xl border border-[#1E4C3D] bg-[#0B1512] px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-[#10B981]"
                >
                  直接兑换卡密
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-[#163428] bg-[#07110D] p-5">
              <div className="rounded-2xl border border-[#123527] bg-[#091A14] p-4">
                <p className="text-sm text-[#7DE8B5]">当前可用积分</p>
                <div className="mt-3 flex items-end justify-between">
                  <span className="text-4xl font-black text-white">{profile?.credits ?? 0}</span>
                  <span className="rounded-full border border-[#1E4C3D] bg-[#0E1A15] px-3 py-1 text-xs text-[#9BB7AD]">
                    实时同步
                  </span>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-[#123527] bg-[#091A14] p-4">
                <p className="text-sm text-[#7DE8B5]">官方兑换说明</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[#B9CCC5]">
                  <li>1. 官方卡密统一以 <span className="font-mono text-white">AHT-</span> 开头。</li>
                  <li>2. 兑换成功后会立刻给当前账号加积分。</li>
                  <li>3. 如需购买新卡密，直接选下方套餐联系微信客服即可。</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-[#142D24] bg-[#08120F] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">充值方案</h2>
                <p className="mt-1 text-sm text-[#9BB7AD]">所有套餐和对应金额都在这里，选中后可直接联系购买。</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {RECHARGE_PLANS.map((plan) => (
                <button
                  key={plan.credits}
                  type="button"
                  onClick={() => {
                    setSelectedPlan(plan)
                    setShowWechatModal(true)
                  }}
                  className={`rounded-2xl border p-5 text-left transition-all ${
                    plan.highlight
                      ? 'border-[#10B981]/50 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(9,21,17,0.92))] shadow-[0_0_22px_rgba(16,185,129,0.16)]'
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
                  <div className="mt-5 flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#6E8D82]">售价</p>
                      <p className="mt-1 text-2xl font-bold text-white">¥{plan.price}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#10B981]">查看购买方式</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#142D24] bg-[#08120F] p-5 sm:p-6">
            <h2 className="text-xl font-bold text-white">卡密兑换</h2>
            <p className="mt-2 text-sm leading-6 text-[#9BB7AD]">
              已经拿到客服发给你的卡密，可以直接在这里兑换。支持回车提交。
            </p>

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

            <div className="mt-6 rounded-2xl border border-[#123527] bg-[#091A14] p-4">
              <p className="text-sm font-semibold text-[#8CF5CA]">客服购买方式</p>
              <p className="mt-2 text-sm leading-6 text-[#B9CCC5]">
                购买前先选好上面的套餐，然后复制客服微信，直接说明你想要的积分档位。客服确认后会发对应卡密，你回来兑换即可。
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSelectedPlan(RECHARGE_PLANS.find((item) => item.highlight) || RECHARGE_PLANS[2])
                    setShowWechatModal(true)
                  }}
                  className="rounded-xl border border-[#1E4C3D] bg-[#0C1814] px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-[#10B981]"
                >
                  打开购买说明
                </button>
                <button
                  onClick={() => void handleCopyWechat()}
                  className="rounded-xl border border-[#10B981]/35 bg-[#10B981]/10 px-4 py-2 text-sm font-semibold text-[#8CF5CA] transition-colors hover:bg-[#10B981]/15"
                >
                  复制客服微信
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {showWechatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#1A3A2D] bg-[#08120F] p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black text-white">联系客服购买</h3>
                <p className="mt-2 text-sm leading-6 text-[#9BB7AD]">
                  {selectedPlan
                    ? `你当前选择的是 ${selectedPlan.credits} 积分 / ¥${selectedPlan.price}。复制下方客服微信后，直接把这个套餐信息发给客服即可。`
                    : '复制客服微信后，直接联系购买你需要的积分档位。'}
                </p>
              </div>
              <button
                onClick={() => setShowWechatModal(false)}
                className="rounded-lg border border-[#1A3A2D] px-3 py-1 text-sm text-[#B9CCC5] transition-colors hover:border-[#10B981] hover:text-white"
              >
                关闭
              </button>
            </div>

            <div className="rounded-2xl border border-[#123527] bg-[#091A14] p-5">
              <p className="text-sm text-[#7DE8B5]">客服微信</p>
              <p className="mt-2 font-mono text-2xl font-black text-white">{CUSTOMER_SERVICE_WECHAT}</p>
              {selectedPlan && (
                <div className="mt-4 rounded-2xl border border-[#173427] bg-[#07110D] p-4">
                  <p className="text-sm text-[#8CF5CA]">推荐发送给客服的话术</p>
                  <p className="mt-2 text-sm leading-6 text-[#D0E4DB]">
                    你好，我要购买 <span className="font-semibold text-white">{selectedPlan.credits} 积分</span>
                    （¥{selectedPlan.price}）套餐，请发我对应卡密。
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => void handleCopyWechat()}
                className="flex-1 rounded-xl bg-gradient-to-r from-[#10B981] to-[#06B6D4] px-4 py-3 text-sm font-bold text-[#04110D]"
              >
                复制客服微信
              </button>
              <button
                onClick={() => setShowWechatModal(false)}
                className="flex-1 rounded-xl border border-[#1A3A2D] bg-[#0B1512] px-4 py-3 text-sm font-semibold text-white"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#142D24]/50 bg-[#040D0A]/95 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-400">
          登录或使用本网站即代表你已阅读并同意
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
