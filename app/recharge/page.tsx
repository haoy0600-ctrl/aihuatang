'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'
import { TermsModal } from '@/components/TermsModal'

export default function RechargePage() {
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<{ credits: number; avatar_url?: string } | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [cardCode, setCardCode] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showWechatModal, setShowWechatModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const cardCodeInputRef = useRef<HTMLInputElement>(null)

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
    const fetchProfile = async () => {
      const storedSession = localStorage.getItem('ai_handdrawn_login_session')
      if (!storedSession) {
        setProfile({ credits: 3 })
        return
      }

      let session: any
      try {
        session = JSON.parse(storedSession)
      } catch {
        setProfile({ credits: 3 })
        return
      }

      const now = Date.now()
      if (!session.email || session.expiresAt < now) {
        setProfile({ credits: 3 })
        return
      }

      try {
        const response = await fetch('/api/auth/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: session.email })
        })

        const data = await response.json()

        if (!data.success) {
          setProfile({ credits: 3 })
          return
        }

        setUser(data.user)

        if (data.profile) {
          setProfile({ credits: data.profile.credits })
        }
      } catch (error) {
        console.error('Profile fetch error:', error)
        setProfile({ credits: 3 })
      }
    }

    fetchProfile()
  }, [])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToastMessage(message)
    setToastType(type)
    setTimeout(() => {
      setToastMessage('')
    }, 3000)
  }

  const handleRedeemCard = async () => {
    const cleanCode = cardCode.trim().toUpperCase()
    
    if (!cleanCode) {
      showToast('请输入卡密', 'error')
      return
    }

    setIsRedeeming(true)

    try {
      const storedSession = localStorage.getItem('ai_handdrawn_login_session')
      if (!storedSession) {
        showToast('请先登录', 'error')
        setIsRedeeming(false)
        return
      }

      let session: any
      try {
        session = JSON.parse(storedSession)
      } catch {
        showToast('请先登录', 'error')
        setIsRedeeming(false)
        return
      }

      const now = Date.now()
      if (!session.email || session.expiresAt < now) {
        showToast('请先登录', 'error')
        setIsRedeeming(false)
        return
      }

      const meResponse = await fetch('/api/auth/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.email })
      })

      const meData = await meResponse.json()

      if (!meData.success || !meData.user) {
        showToast('请先登录', 'error')
        setIsRedeeming(false)
        return
      }

      const userId = meData.user.id

      const response = await fetch('/api/user/redeem-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardCode: cleanCode, userId }),
      })

      const data = await response.json()

      if (data.success) {
        showToast('🎉 激活成功！对应积分已注入您的账户！', 'success')
        setProfile({ credits: data.totalCredits })
        
        setCardCode('')
        cardCodeInputRef.current?.focus()
      } else {
        showToast(data.error || '激活失败', 'error')
      }
    } catch (error) {
      showToast('网络错误，请重试', 'error')
    } finally {
      setIsRedeeming(false)
    }
  }

  const handleCopyWechat = () => {
    navigator.clipboard.writeText('YH509235')
    showToast('🎉 复制成功！快去微信搜索添加主理人对账吧~', 'success')
  }

  return (
    <div className="min-h-screen bg-[#040D0A]">
      <header className="bg-[#040D0A] border-b border-[#142D24]">
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
              <Link href="/recharge" className="px-5 py-2.5 bg-[#10B981] text-[#040D0A] font-semibold text-base tracking-wide md:text-lg border border-[#142D24] shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] transition-all rounded-xl">
                卡密兑换
              </Link>
            </nav>

            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="md:hidden w-10 h-10 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center justify-center hover:border-[#10B981] transition-colors rounded-lg"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="hidden md:flex items-center gap-4">
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
                      <Link href="/dashboard" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg">
                        🎨 创作工坊
                      </Link>
                      <Link href="/records" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg">
                        📁 生成记录
                      </Link>
                      <Link href="/recharge" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg">
                        🔑 卡密兑换
                      </Link>
                    </div>
                    <div className="p-2">
                      <Link href="/dashboard" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg hidden md:block">
                        创作工坊
                      </Link>
                      <Link href="/records" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg hidden md:block">
                        生成记录
                      </Link>
                      <div className="border-t border-[#142D24] my-1 hidden md:block"></div>
                      <button 
                        onClick={() => { window.location.href = '/profile'; setShowUserMenu(false) }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg"
                      >
                        个人中心
                      </button>
                      <button 
                        onClick={() => { localStorage.removeItem('ai_handdrawn_login_session'); window.location.href = '/login'; }}
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

      <main className="p-4 sm:p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex flex-col items-center justify-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-white text-center">🔑 官方卡密激活/兑换中心</h2>
              <p className="text-sm text-[#10B981] mt-1 text-center">当前余额：<span className="text-[#00E676] font-bold">{profile?.credits || 0}</span> 积分</p>
            </div>
          </div>

          {toastMessage && (
            <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-300 ${
              toastType === 'success'
                ? 'bg-[#10B981]/90 border border-[#10B981] text-[#040D0A]'
                : 'bg-red-500/90 border border-red-500 text-white'
            }`}>
              <span className="font-bold text-sm">{toastMessage}</span>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#10B981]/5 to-[#06B6D4]/5 border border-[#10B981]/30 p-6 rounded-xl shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[#10B981] text-xl">🎫</span>
              <h3 className="text-base font-bold text-white">卡密激活</h3>
            </div>
            
            <p className="text-xs text-[#10B981] mb-4">
              请输入以 AHT- 开头的官方卡密激活码
            </p>
            
            <div className="flex flex-col gap-3">
              <input
                ref={cardCodeInputRef}
                type="text"
                value={cardCode}
                onChange={(e) => setCardCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRedeemCard()
                  }
                }}
                placeholder="请输入以 AHT- 开头的官方卡密激活码"
                className="w-full px-4 py-3 bg-[#040D0A] border border-[#142D24] text-white text-sm font-mono focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/30 focus:outline-none transition-all rounded-lg placeholder-[#64748B]"
              />
              
              <button
                onClick={handleRedeemCard}
                disabled={isRedeeming || !cardCode.trim()}
                className={`w-full px-4 py-3 font-bold text-sm border transition-all rounded-lg ${
                  isRedeeming || !cardCode.trim()
                    ? 'bg-[#091511]/60 border-[#142D24] text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#10B981] to-[#06B6D4] text-[#040D0A] border-transparent shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                }`}
              >
                {isRedeeming ? '激活中...' : '立即激活获取积分'}
              </button>
            </div>

            <p className="text-gray-400 text-xs mt-4 text-center">
              没有卡密？{' '}
              <button 
                onClick={() => setShowWechatModal(true)}
                className="text-[#10B981] hover:text-[#00E676] font-medium underline underline-offset-2 transition-colors"
              >
                [点击联系官方客服]
              </button>
            </p>

            <p className="text-[#10B981] text-xs mt-3 text-center">
              💡 支持连续叠加激活，激活成功后自动清空输入框，可立即输入下一张卡密
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Link
              href="/dashboard"
              className="flex-1 px-4 py-2.5 bg-[#091511] text-white font-bold text-center text-sm border border-[#142D24] hover:border-[#10B981] hover:text-[#10B981] transition-all rounded-lg"
            >
              返回创作
            </Link>
          </div>
        </div>
      </main>

      {showWechatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWechatModal(false)}
          ></div>
          <div className="relative bg-[#091511] border border-[#142D24] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowWechatModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-[#142D24] text-white rounded-full flex items-center justify-center hover:bg-[#10B981] hover:text-[#040D0A] transition-colors"
            >
              ✕
            </button>
            
            <h3 className="text-lg font-bold text-white text-center mb-4">🔥 官方人工客服</h3>
            
            <div className="mb-4">
              <div className="w-36 h-36 mx-auto bg-white rounded-xl p-2 shadow-lg">
                <img 
                  src="/wechat-qrcode.png?v=1" 
                  alt="微信二维码" 
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">扫码添加官方客服微信</p>
            </div>
            
            <button
              onClick={handleCopyWechat}
              className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-green-500/30 hover:from-green-500 hover:to-green-400 transition-all active:scale-95"
            >
              📋 一键复制微信号 (YH509235)
            </button>
            
            <div className="mt-4 pt-4 border-t border-[#142D24]">
              <p className="text-xs text-[#10B981] font-bold mb-2">💡 充值价格表（多卡可连续叠加激活）：</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p><span className="text-white">10元</span> ➔ <span className="text-[#10B981]">100积分</span></p>
                <p><span className="text-white">29元</span> ➔ <span className="text-[#10B981]">320积分</span></p>
                <p><span className="text-white">59元</span> ➔ <span className="text-[#10B981]">700积分</span></p>
                <p><span className="text-white">99元</span> ➔ <span className="text-[#10B981]">1300积分</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        show={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <TermsModal
        show={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      <footer className="fixed bottom-0 left-0 right-0 py-2 bg-[#091511]/95 border-t border-[#142D24]/50 backdrop-blur-sm z-40">
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