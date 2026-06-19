'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ChangePasswordModal } from '@/components/ChangePasswordModal'

interface UserProfile {
  id: string
  email: string
  credits: number
  created_at?: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentTime, setCurrentTime] = useState('')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')

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
      if (!supabase) {
        router.push('/login')
        return
      }

      const { data: sessionData } = await supabase.auth.getSession()
      
      if (!sessionData?.session) {
        router.push('/login')
        return
      }

      setUser(sessionData.session.user)
      const userId = sessionData.session.user.id

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !profileData) {
        router.push('/login')
        return
      }

      setProfile(profileData)
    }

    fetchUserAndProfile()
  }, [router])

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push('/login')
  }

  if (!profile || !user) {
    return (
      <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-widest bg-gradient-to-r from-[#00F2FE] via-[#94A3B8] to-[#00E676] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,254,0.6)] hover:drop-shadow-[0_0_20px_rgba(0,242,254,0.9)] transition-all duration-300 select-none italic mb-4">AI画堂</h1>
          <p className="text-[#00F2FE]">正在加载...</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#0B0D17]">
      <header className="bg-[#0B0D17] border-b border-[#202B3A] flex-shrink-0">
        <div className="flex justify-between items-center w-full px-6 py-3">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-[#10B981] border border-[#202B3A] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <span className="text-[#0B0D17] font-bold text-sm">AI</span>
            </div>
            <h1 className="text-lg font-black tracking-widest bg-gradient-to-r from-[#00F2FE] via-[#94A3B8] to-[#00E676] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,254,0.6)] hover:drop-shadow-[0_0_20px_rgba(0,242,254,0.9)] transition-all duration-300 select-none italic">AI画堂</h1>
          </Link>

          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="px-4 py-2 bg-[#141923] text-white font-bold text-sm border border-[#202B3A] hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all">
              创作
            </Link>
            <Link href="/records" className="px-4 py-2 bg-[#141923] text-white font-bold text-sm border border-[#202B3A] hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all">
              记录
            </Link>
            <Link href="/recharge" className="px-4 py-2 bg-[#141923] text-white font-bold text-sm border border-[#202B3A] hover:bg-[#1a2230] hover:border-[#00F2FE] transition-all">
              充值
            </Link>
            <Link href="/profile" className="px-4 py-2 bg-[#10B981] text-[#0B0D17] font-bold text-sm border border-[#202B3A] shadow-[0_0_10px_rgba(16,185,129,0.3)] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all">
              个人中心
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#00F2FE]">
              <span>{new Date().toLocaleDateString('zh-CN')}</span>
              <span className="text-white font-mono font-bold text-sm">{currentTime}</span>
            </div>
            <div className="px-3 py-1.5 bg-[#141923] border border-[#202B3A] flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#10B981] border border-[#202B3A]"></span>
              <span className="text-xs text-[#00F2FE]">积分</span>
              <span className="font-bold text-white text-sm">{profile?.credits || 0}</span>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 bg-[#141923] border border-[#202B3A] flex items-center justify-center hover:border-[#00F2FE] transition-colors"
              >
                <span className="text-white font-bold text-sm">
                  {user?.email ? user.email.substring(0, 2).toUpperCase() : 'HA'}
                </span>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 top-10 w-56 bg-[#141923] border border-[#202B3A] shadow-lg z-50">
                  <div className="p-4 border-b border-[#202B3A]">
                    <p className="text-xs text-[#00F2FE] mb-1">当前账号</p>
                    <p className="text-sm text-white font-medium truncate">{user?.email || '未登录'}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => { router.push('/dashboard'); setShowUserMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors"
                    >
                      创作工坊
                    </button>
                    <button 
                      onClick={() => { router.push('/records'); setShowUserMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors"
                    >
                      生成记录
                    </button>
                    <button 
                      onClick={() => { router.push('/recharge'); setShowUserMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1a2230] hover:text-[#00F2FE] transition-colors"
                    >
                      积分充值
                    </button>
                    <div className="border-t border-[#202B3A] my-1"></div>
                    <button 
                      onClick={() => { handleLogout(); setShowUserMenu(false) }}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#1a2230] transition-colors"
                    >
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 overflow-auto">
        <div className="max-w-2xl mx-auto">
          <div className="bg-[#141923] border border-[#202B3A] rounded-lg overflow-hidden">
            <div className="p-6 border-b border-[#202B3A]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[#00F2FE] border border-[#202B3A] flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.4)]">
                  <span className="text-[#0B0D17] font-bold text-2xl">
                    {user?.email ? user.email.substring(0, 1).toUpperCase() : 'A'}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{user?.email}</h2>
                  <p className="text-sm text-[#00F2FE] mt-1">用户ID: {profile?.id.substring(0, 8)}...</p>
                </div>
              </div>
            </div>

            <div className="flex border-b border-[#202B3A]">
              <button
                onClick={() => setActiveTab('info')}
                className={`flex-1 py-3 text-sm font-bold transition-all ${
                  activeTab === 'info'
                    ? 'bg-[#00F2FE] text-[#0B0D17]'
                    : 'bg-[#141923] text-white hover:bg-[#1a2230]'
                }`}
              >
                👤 基本信息
              </button>
              <button
                onClick={() => setActiveTab('password')}
                className={`flex-1 py-3 text-sm font-bold transition-all ${
                  activeTab === 'password'
                    ? 'bg-[#00F2FE] text-[#0B0D17]'
                    : 'bg-[#141923] text-white hover:bg-[#1a2230]'
                }`}
              >
                🔐 修改密码
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'info' && (
                <div className="space-y-4">
                  <div className="bg-[#0B0D17] border border-[#202B3A] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#00F2FE]">邮箱地址</span>
                      <span className="text-sm text-white font-medium">{profile?.email || '-'}</span>
                    </div>
                  </div>

                  <div className="bg-[#0B0D17] border border-[#202B3A] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#00F2FE]">账号ID</span>
                      <span className="text-sm text-white font-mono">{profile?.id || '-'}</span>
                    </div>
                  </div>

                  <div className="bg-[#0B0D17] border border-[#202B3A] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#00F2FE]">当前积分</span>
                      <span className="text-lg font-bold text-[#00E676]">{profile?.credits || 0}</span>
                    </div>
                  </div>

                  <div className="bg-[#0B0D17] border border-[#202B3A] p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#00F2FE]">注册时间</span>
                      <span className="text-sm text-white">{formatDate(profile?.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Link
                      href="/recharge"
                      className="flex-1 py-3 bg-[#00E676] text-[#0A0F1D] font-bold text-sm border border-[#202B3A] text-center shadow-[0_0_15px_rgba(0,230,118,0.4)] hover:shadow-[0_0_20px_rgba(0,230,118,0.6)] transition-all"
                    >
                      💳 立即充值
                    </Link>
                    <Link
                      href="/records"
                      className="flex-1 py-3 bg-[#141923] text-white font-bold text-sm border border-[#202B3A] text-center hover:border-[#00F2FE] transition-all"
                    >
                      📋 生成记录
                    </Link>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="bg-[#0B0D17] border border-[#202B3A] p-6 rounded-lg">
                  <h3 className="text-lg font-bold text-white mb-4 text-center">🔐 修改密码</h3>
                  <p className="text-xs text-[#ABC4FF] mb-4 text-center">请输入原密码和新密码完成修改</p>
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="w-full py-3 bg-[#00F2FE] text-[#0B0D17] font-bold text-sm border border-[#202B3A] shadow-[0_0_15px_rgba(0,242,254,0.4)] hover:shadow-[0_0_20px_rgba(0,242,254,0.6)] transition-all"
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
    </div>
  )
}