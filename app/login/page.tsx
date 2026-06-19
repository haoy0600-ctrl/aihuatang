'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'ai_handdrawn_login_session'

interface LoginSession {
  email: string
  expiresAt: number
}

export default function LoginPage() {
  const router = useRouter()
  const [loginMode, setLoginMode] = useState<'password' | 'code'>('password')
  const [isRegister, setIsRegister] = useState(false)
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
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

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

  const handleRegister = async () => {
    setError('')

    if (!supabase) {
      setError('系统配置未完成，请稍后重试')
      return
    }

    if (!username) {
      setError('请输入用户名')
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

    if (!token || token.length !== 6) {
      setError('请输入6位验证码')
      return
    }

    if (!password) {
      setError('请输入密码')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少6位')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        setError(`注册失败: ${updateError.message}`)
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
    } else {
      setError('注册失败，请稍后重试')
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    setForgotError('')

    if (!supabase) {
      setForgotError('系统配置未完成，请稍后重试')
      return
    }

    if (!forgotEmail) {
      setForgotError('请输入邮箱地址')
      return
    }

    const emailRegex = /^[^\s@]+@qq\.com$/
    if (!emailRegex.test(forgotEmail)) {
      setForgotError('请输入有效的QQ邮箱')
      return
    }

    setIsSendingReset(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/login`,
    })

    if (resetError) {
      setForgotError(`发送失败: ${resetError.message}`)
      setIsSendingReset(false)
      return
    }

    setIsSendingReset(false)
    setResetSent(true)
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
    <div className="min-h-screen w-full grid grid-cols-1 md:grid-cols-2 bg-[#0D111A]">
      {/* 左栏 - 极客区 - 仅在 iPad 横屏及 PC 端展示 */}
      <div className="hidden md:flex flex-col justify-center items-center p-8 lg:p-12 bg-[#0D111A] relative overflow-hidden">
        {/* 网格背景 */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: 'linear-gradient(rgba(0,230,118,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,118,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-[#00E676] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(0,230,118,0.6)]">
            <svg className="w-10 h-10 text-[#0D111A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
          </div>
          
          <div className="flex items-center justify-center gap-1.5 h-10 select-none mb-3">
            <div className="w-10 h-10 bg-[#03F09C] rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(3,240,156,0.5)]">
              <svg className="w-5 h-5 text-[#040D0A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <span className="text-xl font-sans font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#03F09C] to-[#00F2FE]">AI</span>
            <span className="text-xl font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-[#03F09C] tracking-widest font-art ml-1">画堂</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-[#00E676] mb-4 italic">
            创坊 (SaaS)
          </h2>
          
          <p className="text-lg text-[#64748B] mb-8 max-w-md">
            自媒体爆款图形设计与智能排版素材工具箱
          </p>
          
          <div className="space-y-4 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 p-3 bg-[#1E293B]/50 border border-[#334155]">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="text-white font-bold text-sm">极速创作</h3>
                <p className="text-[#64748B] text-xs">一键生成高画质知识卡片</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#1E293B]/50 border border-[#334155]">
              <span className="text-2xl">🎨</span>
              <div>
                <h3 className="text-white font-bold text-sm">50+风格</h3>
                <p className="text-[#64748B] text-xs">大师级美术风格任选</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#1E293B]/50 border border-[#334155]">
              <span className="text-2xl">📱</span>
              <div>
                <h3 className="text-white font-bold text-sm">全平台支持</h3>
                <p className="text-[#64748B] text-xs">手机/平板/电脑无缝衔接</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右栏 - 表单区 - 所有设备可见 */}
      <div className="flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#1E293B]">
        <div className="w-full max-w-md">
          {/* 移动端 Logo */}
          <div className="md:hidden text-center mb-8">
            <div className="flex items-center justify-center gap-1.5 h-10 select-none mb-2">
              <div className="w-10 h-10 bg-[#03F09C] rounded-md flex items-center justify-center shadow-[0_0_15px_rgba(3,240,156,0.5)]">
                <svg className="w-5 h-5 text-[#040D0A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <span className="text-xl font-sans font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#03F09C] to-[#00F2FE]">AI</span>
              <span className="text-xl font-normal text-transparent bg-clip-text bg-gradient-to-r from-[#00F2FE] to-[#03F09C] tracking-widest font-art ml-1">画堂</span>
            </div>
            <p className="text-xs text-[#64748B] mt-2">自媒体爆款图形设计与智能排版素材工具箱</p>
          </div>

          {!isRegister ? (
            <div className="bg-[#1E293B] p-4 sm:p-6 border border-[#334155]">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">欢迎回来</h2>
                <p className="text-sm text-[#64748B] mt-1">登录AI画堂，开始创作</p>
              </div>

              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => { setLoginMode('password'); setError(''); setToken('') }}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                    loginMode === 'password'
                      ? 'bg-[#00E676] text-[#0D111A]'
                      : 'bg-[#334155] text-[#94A3B8] hover:bg-[#475569]'
                  }`}
                >
                  密码登录
                </button>
                <button
                  onClick={() => { setLoginMode('code'); setError(''); setPassword('') }}
                  className={`flex-1 py-2.5 text-sm font-medium transition-all ${
                    loginMode === 'code'
                      ? 'bg-[#00E676] text-[#0D111A]'
                      : 'bg-[#334155] text-[#94A3B8] hover:bg-[#475569]'
                  }`}
                >
                  验证码登录
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-6 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#94A3B8] font-medium mb-2">邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入邮箱..."
                    className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569] transition-all"
                    disabled={isSubmitting}
                  />
                </div>

                {loginMode === 'password' ? (
                  <div>
                    <label className="block text-sm text-[#94A3B8] font-medium mb-2">密码</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="请输入密码..."
                        className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569] transition-all pr-10"
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#00E676] transition-colors"
                      >
                        {showPassword ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-[#94A3B8] font-medium mb-2">验证码</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value.slice(0, 6))}
                        placeholder="请输入6位验证码..."
                        className="flex-1 px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569] transition-all"
                        disabled={isSubmitting}
                      />
                      <button
                        onClick={handleSendCode}
                        disabled={isSending || countdown > 0 || isSubmitting}
                        className={`px-3 sm:px-4 py-3 text-sm font-medium transition-all ${
                          isSending || countdown > 0 || isSubmitting
                            ? 'bg-[#334155] text-[#64748B] cursor-not-allowed'
                            : 'bg-[#00E676] text-[#0D111A] hover:shadow-[0_0_15px_rgba(0,230,118,0.5)]'
                        }`}
                      >
                        {isSending ? '发送中...' : countdown > 0 ? `${countdown}s` : '发送验证码'}
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={loginMode === 'password' ? handlePasswordLogin : handleCodeLogin}
                  disabled={isSubmitting}
                  className={`w-full mt-6 py-3.5 bg-[#00E676] text-[#0D111A] font-bold text-base shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_25px_rgba(0,230,118,0.6)]'
                  }`}
                >
                  {isSubmitting ? '验证中...' : '登录'}
                </button>

                {showLinkHint && loginMode === 'code' && (
                  <div className="mt-4 p-4 bg-[#00E676]/10 border border-[#00E676]/30 text-[#00E676] text-sm">
                    验证码已发送！请打开你的QQ邮箱查看。
                  </div>
                )}
              </div>

              <p className="text-center text-sm text-[#64748B] mt-6">
                还没有账号？ <a onClick={() => setIsRegister(true)} className="text-[#00E676] hover:underline cursor-pointer">立即注册</a>
              </p>
              
              <p className="text-center text-xs text-[#475569] mt-2">
                <button
                  onClick={() => { setShowForgotPassword(true); setForgotEmail(''); setForgotError(''); setResetSent(false); }}
                  className="text-[#00E676] hover:underline transition-colors"
                >
                  忘记密码？
                </button>
              </p>
            </div>
          ) : (
            <div className="bg-[#1E293B] p-4 sm:p-6 border border-[#334155]">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white">创建账号</h2>
                <p className="text-sm text-[#64748B] mt-1">注册AI画堂，开始创作之旅</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-6 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#94A3B8] font-medium mb-2">用户名</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名..."
                    className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569] transition-all"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#94A3B8] font-medium mb-2">QQ邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="请输入QQ邮箱..."
                    className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569] transition-all"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#94A3B8] font-medium mb-2">验证码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value.slice(0, 6))}
                      placeholder="请输入邮箱验证码..."
                      className="flex-1 px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569] transition-all"
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={handleSendCode}
                      disabled={isSending || countdown > 0 || isSubmitting}
                      className={`px-3 sm:px-4 py-3 text-sm font-medium transition-all ${
                        isSending || countdown > 0 || isSubmitting
                          ? 'bg-[#334155] text-[#64748B] cursor-not-allowed'
                          : 'bg-[#00E676] text-[#0D111A] hover:shadow-[0_0_15px_rgba(0,230,118,0.5)]'
                      }`}
                    >
                      {isSending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#94A3B8] font-medium mb-2">密码</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="请输入密码（至少6位）..."
                      className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569] transition-all pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#00E676] transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#94A3B8] font-medium mb-2">确认密码</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="请再次输入密码..."
                      className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569] transition-all pr-10"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#00E676] transition-colors"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleRegister}
                  disabled={isSubmitting}
                  className={`w-full mt-6 py-3.5 bg-[#00E676] text-[#0D111A] font-bold text-base shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_25px_rgba(0,230,118,0.6)]'
                  }`}
                >
                  {isSubmitting ? '注册中...' : '注册'}
                </button>
              </div>

              <p className="text-center text-sm text-[#64748B] mt-6">
                已有账号？ <a onClick={() => setIsRegister(false)} className="text-[#00E676] hover:underline cursor-pointer">返回登录</a>
              </p>
            </div>
          )}

          {/* 合规信息 - 像素级固定卡在右栏最底部 */}
          <div className="mt-8 text-center space-y-1">
            <p className="text-xs text-[#475569]">
              © 2026 AI画堂 · 自媒体爆款图形设计与智能排版素材工具箱
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-[#475569]">
              <Link href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-[#00E676] transition-colors">
                京ICP备XXXXXXXX号
              </Link>
              <span>|</span>
              <span>公网安备XXXXXXXXXXXXXXXX号</span>
            </div>
          </div>
        </div>
      </div>

      {/* 忘记密码弹窗 */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-[#334155] p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">忘记密码</h3>
            
            {forgotError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-4 text-sm">
                {forgotError}
              </div>
            )}

            {resetSent ? (
              <div className="text-center">
                <div className="text-5xl mb-4">📧</div>
                <p className="text-[#00E676] mb-4">密码重置链接已发送到您的邮箱！</p>
                <p className="text-[#64748B] text-sm mb-4">请登录邮箱点击链接重置密码</p>
                <button
                  onClick={() => { setShowForgotPassword(false); setResetSent(false) }}
                  className="w-full py-3 bg-[#00E676] text-[#0D111A] font-bold"
                >
                  知道了
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-[#94A3B8] font-medium mb-2">邮箱</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="请输入注册的QQ邮箱..."
                    className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569]"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 py-3 bg-[#334155] text-white font-medium"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleForgotPassword}
                    disabled={isSendingReset}
                    className={`flex-1 py-3 font-bold ${
                      isSendingReset ? 'bg-[#334155] text-[#64748B]' : 'bg-[#00E676] text-[#0D111A]'
                    }`}
                  >
                    {isSendingReset ? '发送中...' : '发送重置链接'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 设置密码弹窗 */}
      {showSetPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] border border-[#334155] p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">设置密码</h3>
            <p className="text-[#64748B] text-sm mb-4">您需要设置密码才能完成注册</p>
            
            {passwordError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-4 text-sm">
                {passwordError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#94A3B8] font-medium mb-2">新密码</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入密码（至少6位）..."
                  className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569]"
                />
              </div>
              <div>
                <label className="block text-sm text-[#94A3B8] font-medium mb-2">确认密码</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="请再次输入密码..."
                  className="w-full px-4 py-3 bg-[#0D111A] border border-[#334155] text-white focus:border-[#00E676] focus:outline-none placeholder-[#475569]"
                />
              </div>
              <button
                onClick={handleSetPassword}
                disabled={isSettingPassword}
                className={`w-full py-3 mt-2 font-bold ${
                  isSettingPassword ? 'bg-[#334155] text-[#64748B]' : 'bg-[#00E676] text-[#0D111A]'
                }`}
              >
                {isSettingPassword ? '设置中...' : '确认设置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
