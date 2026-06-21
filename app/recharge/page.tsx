'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'

export default function RechargePage() {
  const [currentTime, setCurrentTime] = useState('')
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<{ credits: number } | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  const [cardCode, setCardCode] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
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
    // =========================================
    // 🔒 前端安全清洗：空格裁剪 + 强转大写
    // =========================================
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
        
        // ✅ 清空输入框并立即聚焦，支持连续无缝叠加激活
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

            {/* 移动端菜单按钮 */}
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
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">🔑 官方卡密激活/兑换中心</h2>
              <p className="text-xs text-[#10B981] mt-0.5">当前余额：<span className="text-[#00E676] font-bold">{profile?.credits || 0}</span> 积分</p>
            </div>
            <div className="bg-[#091511] border border-[#142D24] px-3 py-1.5 rounded-lg">
              <p className="text-[#10B981] text-xs">🎁 新用户福利：QQ邮箱注册即送6积分，免费测试3张图！</p>
            </div>
          </div>

          {/* Toast 提示 */}
          {toastMessage && (
            <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md transition-all duration-300 ${
              toastType === 'success'
                ? 'bg-[#10B981]/90 border border-[#10B981] text-[#040D0A]'
                : 'bg-red-500/90 border border-red-500 text-white'
            }`}>
              <span className="font-bold text-sm">{toastMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 左侧：微信引流面板 */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
              <h3 className="text-lg font-bold text-white mb-4">🔥 官方人工充值 / 激活码获取通道</h3>
              
              {/* 二维码区域 */}
              <div className="mb-4">
                <div className="w-48 h-48 mx-auto bg-white rounded-xl p-2 shadow-lg">
                  <img 
                    src="/wechat-qrcode.png?v=1" 
                    alt="微信二维码" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-3">电脑端用户：请直接使用手机微信扫码添加</p>
              </div>
              
              {/* 一键复制微信号 */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText('YH509235')
                  showToast('🎉 复制成功！快去微信搜索添加主理人对账吧~', 'success')
                }}
                className="w-full mb-4 px-4 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-green-500/30 hover:from-green-500 hover:to-green-400 transition-all active:scale-95"
              >
                📋 点击一键复制主理人微信
              </button>
              
              {/* 价格表 */}
              <div className="pt-4 border-t border-zinc-700">
                <p className="text-[#10B981] text-xs font-bold mb-3">💡 充值价格表（多卡可连续叠加激活）：</p>
                <div className="space-y-2 text-left">
                  <p className="text-sm"><span className="text-white">10元</span> ➔ <span className="text-[#10B981]">100 积分</span>（尝鲜体验款）</p>
                  <p className="text-sm"><span className="text-white">29元</span> ➔ <span className="text-[#10B981]">320 积分</span>（自媒体高频推荐 🌟）</p>
                  <p className="text-sm"><span className="text-white">59元</span> ➔ <span className="text-[#10B981]">700 积分</span>（金牌教师打包款）</p>
                  <p className="text-sm"><span className="text-white">99元</span> ➔ <span className="text-[#10B981]">1300 积分</span>（机构尊享大额款 💎）</p>
                  <p className="text-sm"><span className="text-white">199元</span> ➔ <span className="text-[#10B981]">2800 积分</span>（工作室终极清仓款 🚀）</p>
                </div>
              </div>
            </div>

            {/* 右侧：卡密激活 */}
            <div className="bg-gradient-to-br from-[#10B981]/5 to-[#06B6D4]/5 border border-[#10B981]/30 p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#10B981] text-xl">🎫</span>
                <h3 className="text-sm font-bold text-white">卡密激活</h3>
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

              <p className="text-[#10B981] text-xs mt-3">
                💡 支持连续叠加激活，激活成功后自动清空输入框，可立即输入下一张卡密
              </p>
            </div>
          </div>

          {/* 红框高亮合规安全禁令 */}
          <div className="mt-6 p-4 bg-[#091511]/80 border-2 border-red-500/30 rounded-xl">
            <div className="flex items-start gap-2 mb-3">
              <span className="text-yellow-400 text-xl">⚠️</span>
              <h4 className="text-sm font-bold text-white">【重要】AI画堂·安全合规与使用须知</h4>
            </div>
            <p className="text-xs text-gray-300 mb-4">
              本站为自动化 AI 绘画创意辅助工具，各行各业用户在享受高效生图的同时，必须严格遵守国家网络安全法律法规。
            </p>
            
            <div className="mb-4">
              <h5 className="text-xs font-bold text-red-400 mb-2">🔴 【全站严厉禁止生成的违规内容】：</h5>
              <ul className="space-y-1 text-xs text-gray-300 pl-3">
                <li>• 严禁生成任何涉及色情、低俗、裸露及擦边暴力的图片。</li>
                <li>• 严禁生成政治敏感、散布谣言、丑化特定人物或涉及国家安全的违法内容。</li>
                <li>• 严禁用于任何侵犯他人肖像权、名誉权、商业欺诈或违规引流的黑色产业链。</li>
              </ul>
            </div>
            
            <div className="mb-4">
              <h5 className="text-xs font-bold text-yellow-400 mb-2">💡 【如何避免违规与处罚说明】：</h5>
              <ul className="space-y-1 text-xs text-gray-300 pl-3">
                <li>• 平台已部署后端敏感词自动拦截过滤系统（包含但不限于政治、暴力、色情等中英文关键词）。</li>
                <li>• 请在输入 Prompt 提示词时主动规范自身的创作意图。</li>
                <li>• 一经发现恶意尝试绕过风控、生成违规内容者，平台将采取【直接永久封禁账号、清空剩余积分、不予退款】的铁腕处罚，情节严重者将依法向有关部门上报其注册邮箱与访问 IP！</li>
              </ul>
            </div>
            
            <p className="text-xs text-gray-400">
              💬 关于售后：大算力完全消耗在海外下游接口。若遇网络延迟卡密未到账、或生图超时失败，积分会自动退回。若有账目疑问，请点击上方复制主理人微信人工核对。
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

      <ChangePasswordModal
        show={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  )
}
