'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'

type SelectedPackageType = '10' | '30' | '100' | 'custom'
type PaymentMethodType = 'alipay' | 'wechat'

const PACKAGES = [
  { id: '10' as const, name: '体验版', credits: 100, price: 10, bonus: '' },
  { id: '30' as const, name: '进阶版', credits: 320, price: 30, bonus: '多送20积分' },
  { id: '100' as const, name: '专业版', credits: 1200, price: 100, bonus: '多送200积分' },
]

export default function RechargePage() {
  const [selectedPackage, setSelectedPackage] = useState<SelectedPackageType>('10')
  const [customAmount, setCustomAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('alipay')
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<{ credits: number } | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
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
    const fetchProfile = async () => {
      if (!supabase) {
        setProfile({ credits: 3 })
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      
      if (!sessionData?.session) {
        setProfile({ credits: 3 })
        return
      }

      setUser(sessionData.session.user)
      const userId = sessionData.session.user.id

      const { data: profileData } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single()
      
      if (profileData) {
        setProfile({ credits: profileData.credits })
      }
    }

    fetchProfile()
  }, [])

  const getSelectedCredits = (): number => {
    if (selectedPackage === 'custom') {
      const amount = parseInt(customAmount || '0')
      return amount >= 10 ? amount * 10 : 0
    }
    const pkg = PACKAGES.find(p => p.id === selectedPackage)
    return pkg?.credits || 0
  }

  const getSelectedPrice = (): number => {
    if (selectedPackage === 'custom') {
      return parseInt(customAmount || '0')
    }
    const pkg = PACKAGES.find(p => p.id === selectedPackage)
    return pkg?.price || 0
  }

  const handleRecharge = async () => {
    const price = getSelectedPrice()
    const credits = getSelectedCredits()

    if (selectedPackage === 'custom' && (price < 10 || credits <= 0)) {
      alert('请输入至少10元')
      return
    }

    setIsProcessing(true)
    setSuccessMessage('')

    if (!supabase) {
      setSuccessMessage('系统配置未完成，请稍后重试')
      setIsProcessing(false)
      return
    }

    const { data: sessionData } = await supabase.auth.getSession()
    
    if (!sessionData?.session) {
      setSuccessMessage('请先登录')
      setIsProcessing(false)
      return
    }

    const userId = sessionData.session.user.id
    const currentCredits = profile?.credits || 0
    const newCredits = currentCredits + credits

    const { error } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', userId)

    if (error) {
      console.error('Recharge error:', error)
      setSuccessMessage('充值失败，请稍后重试')
      setIsProcessing(false)
      return
    }

    setProfile({ credits: newCredits })
    setSuccessMessage(`充值成功！已获得 ${credits} 积分`)
    
    setTimeout(() => {
      setSuccessMessage('')
    }, 5000)

    setIsProcessing(false)
  }

  const handleCustomFocus = () => {
    setSelectedPackage('custom')
  }

  const getPaymentIcon = (method: PaymentMethodType) => {
    if (method === 'alipay') {
      return (
        <svg viewBox="0 0 24 24" className="w-8 h-8">
          <circle cx="12" cy="12" r="10" fill="#1677FF"/>
          <path d="M8.5 15c-.8 0-1.5-.7-1.5-1.5S7.7 12 8.5 12s1.5.7 1.5 1.5S9.3 15 8.5 15zm7 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm-3.5-6c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5z" fill="white"/>
        </svg>
      )
    }
    return (
      <svg viewBox="0 0 24 24" className="w-8 h-8">
        <circle cx="12" cy="12" r="10" fill="#07C160"/>
        <path d="M8.6 15.4c-.3-.2-.5-.5-.5-.8 0-.3.2-.6.5-.8.3-.2.6-.2.8-.1.1.1 2.1 1.3 4.4 1.3.8 0 1.5-.1 2.1-.3.3-.1.6.1.7.4.1.3-.1.6-.4.7-.9.4-1.9.6-3 .6-2.5 0-4.7-1.2-6.2-3zM7.9 13c-.3-.2-.5-.5-.5-.8 0-.3.2-.6.5-.8.3-.2.6-.2.8-.1 2.5 1.5 5.7 1.5 8.3 0 .2-.1.5-.1.8.1.3.2.5.5.5.8 0 .3-.2.6-.5.8-2.9 1.8-6.5 1.8-9.4 0z" fill="white"/>
      </svg>
    )
  }

  return (
    <div className="min-h-screen bg-[#040D0A]">
      <header className="bg-[#040D0A] border-b border-[#142D24]">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center w-full py-2 sm:py-3">
            <Link href="/" className="flex items-center h-10 select-none hover:opacity-80 transition-opacity">
              <img 
                src="/logo.png?v=2" 
                alt="AI画堂" 
                className="h-full w-auto object-contain"
              />
            </Link>

            {/* 手机端隐藏导航 */}
            <nav className="hidden md:flex items-center gap-2 sm:gap-3">
              <Link href="/dashboard" className="px-3 sm:px-4 py-2 bg-[#091511]/60 backdrop-blur-sm text-white font-bold text-sm border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-lg">
                创作
              </Link>
              <Link href="/records" className="px-3 sm:px-4 py-2 bg-[#091511]/60 backdrop-blur-sm text-white font-bold text-sm border border-[#142D24] hover:bg-[#142D24] hover:border-[#10B981] transition-all rounded-lg">
                记录
              </Link>
              <Link href="/recharge" className="px-3 sm:px-4 py-2 bg-[#10B981] text-[#040D0A] font-bold text-sm border border-[#142D24] shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all rounded-lg">
                充值
              </Link>
            </nav>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* 手机端隐藏时间 */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-[#10B981]">
                <span>{new Date().toLocaleDateString('zh-CN')}</span>
                <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
              </div>
              {/* 积分显示 */}
              <div className="px-2 sm:px-3 py-1 sm:py-1.5 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center gap-1 sm:gap-1.5 rounded-lg">
                <span className="w-2 h-2 bg-[#10B981] rounded-full"></span>
                <span className="text-xs text-[#10B981] hidden sm:inline">积分</span>
                <span className="font-bold text-white text-sm">{profile?.credits || 0}</span>
              </div>
              {/* 用户头像 */}
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 sm:w-9 sm:h-9 bg-[#091511]/60 backdrop-blur-sm border border-[#142D24] flex items-center justify-center hover:border-[#10B981] transition-colors rounded-lg"
                >
                  <span className="text-white font-bold text-sm">
                    {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 top-10 w-48 sm:w-56 bg-[#091511]/95 backdrop-blur-md border border-[#142D24] shadow-2xl z-50 rounded-xl overflow-hidden">
                    <div className="p-3 sm:p-4 border-b border-[#142D24]">
                      <p className="text-xs text-[#10B981] mb-1">当前账号</p>
                      <p className="text-sm text-white font-medium truncate">{user?.email || '未登录'}</p>
                    </div>
                    {/* 手机端显示导航链接 */}
                    <div className="p-2 border-b border-[#142D24] md:hidden">
                      <Link href="/dashboard" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg">
                        🎨 创作工坊
                      </Link>
                      <Link href="/records" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg">
                        📁 生成记录
                      </Link>
                      <Link href="/recharge" onClick={() => setShowUserMenu(false)} className="block w-full text-left px-3 py-2 text-sm text-white hover:bg-[#142D24] hover:text-[#10B981] transition-colors rounded-lg">
                        💰 积分充值
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
                        onClick={() => { if (supabase) supabase.auth.signOut(); window.location.href = '/login'; }}
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
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">积分充值</h2>
              <p className="text-xs text-[#10B981] mt-0.5">当前余额：<span className="text-[#00E676] font-bold">{profile?.credits || 0}</span> 积分</p>
            </div>
            <div className="bg-[#091511] border border-[#142D24] px-3 py-1.5 rounded-lg">
              <p className="text-[#10B981] text-xs">🎁 新用户福利：QQ邮箱注册即送6积分，免费测试3张图！</p>
            </div>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-[#10B981]/20 border border-[#10B981] text-[#10B981] text-center text-sm rounded-lg">
              {successMessage}
            </div>
          )}

          {/* 充值套餐卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => {
                  setSelectedPackage(pkg.id)
                  setCustomAmount('')
                }}
                className={`relative cursor-pointer border transition-all rounded-xl ${
                  selectedPackage === pkg.id
                    ? 'border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : 'border-[#142D24] hover:border-[#10B981] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                } bg-[#091511]/60 backdrop-blur-md p-5`}
              >
                {selectedPackage === pkg.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-[#10B981] rounded-full flex items-center justify-center">
                    <span className="text-[#040D0A] font-bold text-xs">✓</span>
                  </div>
                )}
                
                <h3 className="text-xs text-[#10B981] mb-1">{pkg.name}</h3>
                <div className="text-xl font-bold text-white mb-0.5">{pkg.credits}</div>
                <div className="text-xs text-[#10B981] mb-1">积分</div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xs text-[#10B981]">¥</span>
                  <span className="text-lg font-bold text-white">{pkg.price}</span>
                </div>
                
                {pkg.bonus && (
                  <div className="mt-3 px-2 py-1 bg-[#10B981]/20 border border-[#10B981] inline-block rounded">
                    <span className="text-[#10B981] text-xs font-bold">{pkg.bonus}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 自定义充值与支付方式 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-3">自定义充值</h3>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
                <div className="flex-1">
                  <label className="block text-[#10B981] text-xs mb-1">充值金额（元）</label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    onFocus={handleCustomFocus}
                    onClick={handleCustomFocus}
                    placeholder="最低10元起充"
                    min="10"
                    className={`w-full px-3 py-2 border text-white text-sm focus:outline-none transition-all rounded-lg ${
                      selectedPackage === 'custom'
                        ? 'bg-[#040D0A] border-[#10B981] ring-1 ring-[#10B981]'
                        : 'bg-[#040D0A] border-[#142D24] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]'
                    } placeholder-[#64748B]`}
                  />
                </div>
                
                <span className="text-[#10B981] text-lg font-bold self-center hidden sm:block">=</span>
                
                <div className="flex-1">
                  <label className="block text-[#10B981] text-xs mb-1">获得积分</label>
                  <div className={`w-full px-3 py-2 border bg-[#040D0A] rounded-lg ${
                    selectedPackage === 'custom'
                      ? 'border-[#10B981] ring-1 ring-[#10B981]'
                      : 'border-[#142D24]'
                  }`}>
                    <span className="text-base font-bold text-[#10B981]">
                      {getSelectedCredits()}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[#10B981] text-xs mb-3">按 1:10 比例换算，最低10元起充</p>

              <button
                onClick={handleRecharge}
                disabled={isProcessing || (selectedPackage === 'custom' && (parseInt(customAmount || '0') < 10))}
                className={`w-full px-4 py-2.5 bg-[#10B981] text-[#040D0A] font-bold text-sm border border-[#142D24] shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all rounded-lg ${
                  isProcessing || (selectedPackage === 'custom' && (parseInt(customAmount || '0') < 10))
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                }`}
              >
                {isProcessing ? '处理中...' : `确认充值 ¥${getSelectedPrice()}`}
              </button>
            </div>

            <div className="bg-[#091511]/60 backdrop-blur-md border border-[#142D24] p-5 rounded-xl">
              <h3 className="text-sm font-bold text-white mb-3">支付方式</h3>
              
              <div className="space-y-2">
                <div
                  onClick={() => setPaymentMethod('alipay')}
                  className={`flex items-center gap-3 p-2.5 cursor-pointer border transition-all rounded-lg ${
                    paymentMethod === 'alipay'
                      ? 'border-[#10B981] bg-[#10B981]/5'
                      : 'border-[#142D24] hover:border-[#10B981]'
                  }`}
                >
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                    {getPaymentIcon('alipay')}
                  </div>
                  <span className="flex-1 text-white font-bold text-sm">支付宝</span>
                  {paymentMethod === 'alipay' && (
                    <div className="w-4 h-4 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#040D0A] font-bold text-xs">✓</span>
                    </div>
                  )}
                </div>

                <div
                  onClick={() => setPaymentMethod('wechat')}
                  className={`flex items-center gap-3 p-2.5 cursor-pointer border transition-all rounded-lg ${
                    paymentMethod === 'wechat'
                      ? 'border-[#10B981] bg-[#10B981]/5'
                      : 'border-[#142D24] hover:border-[#10B981]'
                  }`}
                >
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                    {getPaymentIcon('wechat')}
                  </div>
                  <span className="flex-1 text-white font-bold text-sm">微信支付</span>
                  {paymentMethod === 'wechat' && (
                    <div className="w-4 h-4 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-[#040D0A] font-bold text-xs">✓</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 p-2.5 bg-[#040D0A] border border-[#142D24] rounded-lg">
                <p className="text-[#10B981] text-xs">
                  <span className="font-bold">💡 温馨提示：</span><br />
                  • 充值成功后积分即时到账<br />
                  • 积分无使用期限，可累积使用<br />
                  • 如有问题请联系客服
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard"
              className="flex-1 px-4 py-2.5 bg-[#091511] text-white font-bold text-center text-sm border border-[#142D24] hover:border-[#10B981] hover:text-[#10B981] transition-all rounded-lg"
            >
              返回创作
            </Link>
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
