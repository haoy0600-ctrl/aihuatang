'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'ai_handdrawn_login_session'

interface LoginSession {
  email: string
  expiresAt: number
}

export default function LoginPage() {
  const router = useRouter()
  const [loginMode, setLoginMode] = useState<'password' | 'code'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLinkHint, setShowLinkHint] = useState(false)
  const [showSetPassword, setShowSetPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [countdown])

  useEffect(() => {
    const checkSession = () => {
      try {
        const storedSession = localStorage.getItem(STORAGE_KEY)
        if (storedSession) {
          const session: LoginSession = JSON.parse(storedSession)
          const now = Date.now()
          if (session.expiresAt > now) {
            setEmail(session.email)
          } else {
            localStorage.removeItem(STORAGE_KEY)
          }
        }
      } catch (e) {
        console.error('Failed to read session from localStorage:', e)
      }
    }

    checkSession()

    const checkAuth = async () => {
      if (!supabase) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkAuth()
  }, [router])

  const saveSession = (userEmail: string) => {
    const session: LoginSession = {
      email: userEmail,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }

  const ensureProfileExists = async (userId: string, userEmail: string) => {
    if (!supabase) return

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingProfile) {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          credits: 3,
          created_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Failed to create profile:', error)
      } else {
        console.log('Profile created successfully with 3 free credits')
      }
    }
  }

  const handleSendCode = async () => {
    setError('')
    
    if (!supabase) {
      setError('系统配置未完成，请稍后重试')
      return
    }
    
    if (!email) {
      setError('请输入邮箱地址')
      return
    }
    
    const emailRegex = /^[^\s@]+@qq\.com$/
    if (!emailRegex.test(email)) {
      setError('请输入有效的QQ邮箱')
      return
    }

    setIsSending(true)
    
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { 
        shouldCreateUser: true
      }
    })

    if (sendError) {
      console.error('Send code error:', sendError)
      setError(`发送失败: ${sendError.message}`)
      setIsSending(false)
      return
    }

    setIsSending(false)
    setCountdown(60)
    setShowLinkHint(true)
  }

  const handlePasswordLogin = async () => {
    setError('')

    if (!supabase) {
      setError('系统配置未完成，请稍后重试')
      return
    }

    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    if (!password) {
      setError('请输入密码')
      return
    }

    setIsSubmitting(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      setError(`登录失败: ${loginError.message}`)
      setIsSubmitting(false)
      return
    }

    saveSession(email)

    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      await ensureProfileExists(userData.user.id, userData.user.email || email)
    }

    setTimeout(() => {
      router.push('/dashboard')
    }, 500)
  }

  const handleCodeLogin = async () => {
    setError('')

    if (!supabase) {
      setError('系统配置未完成，请稍后重试')
      return
    }

    if (!email) {
      setError('请输入邮箱地址')
      return
    }

    if (!token || token.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    setIsSubmitting(true)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    })

    if (verifyError) {
      setError('验证码错误或已过期，请重新获取')
      setIsSubmitting(false)
      return
    }

    if (data?.session) {
      saveSession(email)
      
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user) {
        await ensureProfileExists(userData.user.id, userData.user.email || email)
      }

      if (!userData?.user?.email_confirmed_at) {
        setShowSetPassword(true)
      }

      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } else {
      setError('登录失败，请稍后重试')
      setIsSubmitting(false)
    }
  }

  const handleSetPassword = async () => {
    setPasswordError('')

    if (!newPassword) {
      setPasswordError('请输入密码')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('密码长度至少6位')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('两次输入的密码不一致')
      return
    }

    setIsSettingPassword(true)

    if (!supabase) {
      setPasswordError('系统配置未完成')
      setIsSettingPassword(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      setPasswordError(`设置密码失败: ${updateError.message}`)
      setIsSettingPassword(false)
      return
    }

    setIsSettingPassword(false)
    setShowSetPassword(false)
    setNewPassword('')
    setConfirmNewPassword('')
    alert('密码设置成功！下次可使用邮箱+密码直接登录')
  }

  return (
    <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#141923] border border-[#202B3A] p-8 rounded-lg">
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#10B981] border border-[#202B3A] flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
            <span className="text-[#0B0D17] font-bold text-lg">AI</span>
          </div>
          <h1 className="text-3xl font-black tracking-widest bg-gradient-to-r from-[#00F2FE] via-[#94A3B8] to-[#00E676] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,242,254,0.6)] hover:drop-shadow-[0_0_20px_rgba(0,242,254,0.9)] transition-all duration-300 select-none italic">AI画堂</h1>
          <p className="text-[#00F2FE] text-sm">自媒体爆款图形设计与智能排版素材工具箱</p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => { setLoginMode('password'); setError(''); setToken('') }}
            className={`flex-1 py-3 font-bold text-sm transition-all ${
              loginMode === 'password'
                ? 'bg-[#10B981] text-[#0B0D17] border border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-[#141923] text-white border border-[#202B3A] hover:border-[#00F2FE]'
            }`}
          >
            密码登录
          </button>
          <button
            onClick={() => { setLoginMode('code'); setError(''); setPassword('') }}
            className={`flex-1 py-3 font-bold text-sm transition-all ${
              loginMode === 'code'
                ? 'bg-[#10B981] text-[#0B0D17] border border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-[#141923] text-white border border-[#202B3A] hover:border-[#00F2FE]'
            }`}
          >
            验证码登录
          </button>
        </div>

        {error && (
          <div className="border border-red-500 bg-red-500/10 text-red-400 p-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="font-bold">!</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-[#00F2FE] font-medium mb-2">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的QQ邮箱..."
              className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
              disabled={isSubmitting}
            />
          </div>

          {loginMode === 'password' ? (
            <div>
              <label className="block text-[#00F2FE] font-medium mb-2">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码..."
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
                disabled={isSubmitting}
              />
            </div>
          ) : (
            <div>
              <label className="block text-[#00F2FE] font-medium mb-2">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.slice(0, 6))}
                  placeholder="请输入6位验证码..."
                  className="flex-1 px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
                  disabled={isSubmitting}
                />
                <button
                  onClick={handleSendCode}
                  disabled={isSending || countdown > 0 || isSubmitting}
                  className={`px-4 py-3 border border-[#202B3A] font-medium transition-all ${
                    isSending || countdown > 0 || isSubmitting
                      ? 'bg-[#1a2230] text-[#64748B] cursor-not-allowed'
                      : 'bg-[#10B981] text-[#0B0D17] hover:shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  }`}
                >
                  {isSending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={loginMode === 'password' ? handlePasswordLogin : handleCodeLogin}
            disabled={isSubmitting}
            className={`w-full mt-6 px-6 py-4 bg-[#00E676] text-[#0A0F1D] font-bold text-lg border border-[#202B3A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
              isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(0,230,118,0.6)]'
            }`}
          >
            {isSubmitting ? '验证中...' : '进入平台'}
          </button>

          {showLinkHint && loginMode === 'code' && (
            <div className="mt-4 p-4 bg-[#10B981]/20 border border-[#10B981] text-[#10B981]">
              <div className="flex items-center gap-2">
                <span className="font-bold">✓</span>
                <span>验证码已发送！请打开你的 QQ 邮箱，查看邮件中的6位验证码。</span>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-[#00F2FE] text-sm mt-6">
          注册即送 <span className="text-[#00E676] font-bold">3积分</span>，开启手绘之旅
        </p>
      </div>

      {showSetPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#141923] border border-[#202B3A] p-8 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-6 text-center">🔐 设置登录密码</h3>
            
            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-400 text-sm">
                {passwordError}
              </div>
            )}

            <div className="mb-4">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
              />
            </div>

            <div className="mb-6">
              <label className="text-xs text-[#00F2FE] mb-1.5 block">确认密码</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="请再次输入新密码"
                className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSetPassword(false)
                  setNewPassword('')
                  setConfirmNewPassword('')
                  setPasswordError('')
                }}
                className="flex-1 py-3 bg-[#0B0D17] border border-[#202B3A] text-white font-bold text-sm hover:border-[#00F2FE] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleSetPassword}
                disabled={isSettingPassword}
                className={`flex-1 py-3 bg-[#00E676] text-[#0A0F1D] font-bold text-sm border border-[#202B3A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                  isSettingPassword ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(0,230,118,0.6)]'
                }`}
              >
                {isSettingPassword ? '保存中...' : '确认设置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}