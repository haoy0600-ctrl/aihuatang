'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoginSession, authHeaders, getStoredSession, saveStoredSession } from '@/lib/session'

const QQ_EMAIL_REGEX = /^[^\s@]+@qq\.com$/

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState('')
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [sendSuccess, setSendSuccess] = useState('')

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined

    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? 0 : prev - 1))
      }, 1000)
    }

    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [countdown])

  useEffect(() => {
    try {
      const session = getStoredSession()
      if (session) {
        setEmail(session.email)
        router.push('/dashboard')
      }
    } catch (sessionError) {
      console.error('Failed to restore session:', sessionError)
    }
  }, [router])

  const saveSession = (userId: string, userEmail: string, authSession: any) => {
    const session: LoginSession = {
      id: userId,
      email: userEmail,
      accessToken: authSession.accessToken,
      refreshToken: authSession.refreshToken,
      expiresAt: authSession.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000,
    }

    saveStoredSession(session)
  }

  const ensureProfileExists = async (userId: string, userEmail: string, nextUsername?: string) => {
    try {
      const response = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId, userEmail, username: nextUsername }),
      })

      const data = await response.json()
      if (!data.success) {
        console.error('Failed to ensure profile:', data.error)
      }
    } catch (profileError) {
      console.error('Failed to ensure profile:', profileError)
    }
  }

  const validateQQEmail = (value: string, fieldName = 'QQ 邮箱') => {
    if (!value) {
      return `请输入${fieldName}`
    }

    if (!QQ_EMAIL_REGEX.test(value)) {
      return `请输入有效的${fieldName}`
    }

    return ''
  }

  const openForgotPassword = () => {
    setShowForgotPassword(true)
    setForgotEmail(email)
    setForgotError('')
    setResetSent(false)
  }

  const handleSendCode = async () => {
    setError('')
    setSendSuccess('')

    const emailError = validateQQEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }

    if (isRegister) {
      setIsSending(true)
      try {
        const checkResponse = await fetch('/api/auth/register-check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        const checkData = await checkResponse.json()
        if (!checkData.success) {
          setError(checkData.error || '当前环境暂时无法注册，请稍后再试')
          setIsSending(false)
          return
        }
      } catch (checkError) {
        console.error('Register check failed:', checkError)
      }
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (!data.success) {
        setError(`发送失败：${data.error}`)
        setIsSending(false)
        return
      }

      setCountdown(60)
      setSendSuccess('验证码已发送，请查收邮箱。')
    } catch (sendError) {
      console.error('Send code error:', sendError)
      setError('验证码发送失败，请稍后重试')
    } finally {
      setIsSending(false)
    }
  }

  const handlePasswordLogin = async () => {
    setError('')
    setSendSuccess('')

    if (!email) {
      setError('请输入邮箱或用户名')
      return
    }

    if (!password) {
      setError('请输入密码')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      if (!data.success) {
        setError(`登录失败：${data.error}`)
        setIsSubmitting(false)
        return
      }

      if (!data.user || !data.session?.accessToken) {
        setError('登录失败：未获取到有效会话')
        setIsSubmitting(false)
        return
      }

      saveSession(data.user.id, data.user.email || email, data.session)
      await ensureProfileExists(data.user.id, data.user.email || email)
      router.push('/dashboard')
    } catch (loginError) {
      console.error('Login error:', loginError)
      setError('登录失败，请稍后重试')
      setIsSubmitting(false)
    }
  }

  const handleRegister = async () => {
    setError('')
    setSendSuccess('')

    if (!username.trim()) {
      setError('请输入用户名')
      return
    }

    const emailError = validateQQEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }

    if (!token || token.length !== 6) {
      setError('请输入 6 位验证码')
      return
    }

    if (!password) {
      setError('请输入密码')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少 6 位')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setIsSubmitting(true)

    try {
      const verifyResponse = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      })

      const verifyData = await verifyResponse.json()
      if (!verifyData.success) {
        setError('验证码错误或已过期，请重新获取')
        setIsSubmitting(false)
        return
      }

      if (!verifyData.user || !verifyData.session?.accessToken) {
        setError('注册失败：未获取到有效会话')
        setIsSubmitting(false)
        return
      }

      saveSession(verifyData.user.id, verifyData.user.email || email, verifyData.session)

      const updateResponse = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password }),
      })

      const updateData = await updateResponse.json()
      if (!updateData.success) {
        setError(`注册失败：${updateData.error}`)
        setIsSubmitting(false)
        return
      }

      try {
        await fetch('/api/auth/register-check', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })
      } catch (recordError) {
        console.error('Failed to record register success:', recordError)
      }

      await ensureProfileExists(verifyData.user.id, verifyData.user.email || email, username.trim())
      router.push('/dashboard')
    } catch (registerError) {
      console.error('Register error:', registerError)
      setError('注册失败，请稍后重试')
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    setForgotError('')

    const emailError = validateQQEmail(forgotEmail)
    if (emailError) {
      setForgotError(emailError)
      return
    }

    setIsSendingReset(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })

      const data = await response.json()
      if (!data.success) {
        setForgotError(`发送失败：${data.error}`)
        setIsSendingReset(false)
        return
      }

      setResetSent(true)
    } catch (resetError) {
      console.error('Reset password error:', resetError)
      setForgotError('发送失败，请稍后重试')
    } finally {
      setIsSendingReset(false)
    }
  }

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-[#0D111A] md:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-[#0D111A] p-8 lg:p-12 md:flex">
        <div className="absolute inset-0 opacity-20">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                'linear-gradient(rgba(0,230,118,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,230,118,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative z-10 text-center">
          <div className="mx-auto mb-6 h-24 w-24 sm:h-28 sm:w-28">
            <img src="/logo.png?v=6" alt="AI画堂" className="h-full w-full rounded-xl object-contain" />
          </div>

          <h1 className="mb-4 text-3xl font-bold text-white">AI画堂</h1>
          <p className="mx-auto mb-8 max-w-md text-lg text-[#64748B]">
            面向自媒体创作者的高质感图文生成与智能排版工具。
          </p>

          <div className="mx-auto max-w-sm space-y-4 text-left">
            <FeatureCard
              icon="AI"
              title="高效生成"
              description="输入主题与要点，快速生成可直接发布的知识图卡。"
            />
            <FeatureCard
              icon="风格"
              title="多种视觉风格"
              description="覆盖简约、商业、科普、课程封面等常用内容模版。"
            />
            <FeatureCard
              icon="同步"
              title="多端协同"
              description="支持手机、平板和电脑连续创作，不必反复切换设备。"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#1E293B] p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center md:hidden">
            <div className="mx-auto mb-3 h-36 w-36">
              <img src="/logo.png?v=6" alt="AI画堂" className="h-full w-full rounded-xl object-contain" />
            </div>
            <p className="text-sm text-[#64748B]">自媒体知识图卡与视觉排版工作台</p>
          </div>

          {!isRegister ? (
            <div className="border border-[#334155] bg-[#1E293B] p-4 sm:p-6">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">欢迎回来</h2>
                <p className="mt-1 text-sm text-[#64748B]">登录后继续你的创作</p>
              </div>

              {error && <MessageBox tone="error">{error}</MessageBox>}
              {sendSuccess && <MessageBox tone="success">{sendSuccess}</MessageBox>}

              <div className="space-y-4">
                <div>
                  <FieldLabel>邮箱 / 用户名</FieldLabel>
                  <input
                    type="text"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="请输入邮箱或用户名"
                    className="w-full border border-[#334155] bg-[#0D111A] px-4 py-3 text-white outline-none transition-all placeholder:text-[#475569] focus:border-[#00E676]"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <FieldLabel>密码</FieldLabel>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    visible={showPassword}
                    onToggleVisible={() => setShowPassword((prev) => !prev)}
                    placeholder="请输入密码"
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  onClick={handlePasswordLogin}
                  disabled={isSubmitting}
                  className={`mt-6 w-full bg-[#00E676] py-3.5 text-base font-bold text-[#0D111A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                    isSubmitting ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[0_0_25px_rgba(0,230,118,0.6)]'
                  }`}
                >
                  {isSubmitting ? '登录中...' : '登录'}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-[#64748B]">
                还没有账号？
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true)
                    setError('')
                    setSendSuccess('')
                  }}
                  className="ml-1 text-[#00E676] hover:underline"
                >
                  立即注册
                </button>
              </p>

              <p className="mt-2 text-center text-xs text-[#475569]">
                <button onClick={openForgotPassword} className="text-[#00E676] transition-colors hover:underline">
                  忘记密码？
                </button>
              </p>

              <div className="mt-6 text-center text-xs text-[#64748B]">
                登录即表示你同意
                <Link href="/terms" className="mx-1 text-[#00E676] hover:underline">
                  使用条款
                </Link>
                与
                <Link href="/privacy" className="ml-1 text-[#00E676] hover:underline">
                  隐私政策
                </Link>
              </div>
            </div>
          ) : (
            <div className="border border-[#334155] bg-[#1E293B] p-4 sm:p-6">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">创建账号</h2>
                <p className="mt-1 text-sm text-[#64748B]">注册后即可开始体验 AI画堂</p>
              </div>

              {error && <MessageBox tone="error">{error}</MessageBox>}
              {sendSuccess && <MessageBox tone="success">{sendSuccess}</MessageBox>}

              <div className="space-y-4">
                <div>
                  <FieldLabel>用户名</FieldLabel>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="请输入用户名"
                    className="w-full border border-[#334155] bg-[#0D111A] px-4 py-3 text-white outline-none transition-all placeholder:text-[#475569] focus:border-[#00E676]"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <FieldLabel>QQ 邮箱</FieldLabel>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="请输入 QQ 邮箱"
                    className="w-full border border-[#334155] bg-[#0D111A] px-4 py-3 text-white outline-none transition-all placeholder:text-[#475569] focus:border-[#00E676]"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <FieldLabel>验证码</FieldLabel>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={token}
                      onChange={(event) => setToken(event.target.value.slice(0, 6))}
                      placeholder="请输入邮箱验证码"
                      className="flex-1 border border-[#334155] bg-[#0D111A] px-4 py-3 text-white outline-none transition-all placeholder:text-[#475569] focus:border-[#00E676]"
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={handleSendCode}
                      disabled={isSending || countdown > 0 || isSubmitting}
                      className={`px-3 py-3 text-sm font-medium transition-all sm:px-4 ${
                        isSending || countdown > 0 || isSubmitting
                          ? 'cursor-not-allowed bg-[#334155] text-[#64748B]'
                          : 'bg-[#00E676] text-[#0D111A] hover:shadow-[0_0_15px_rgba(0,230,118,0.5)]'
                      }`}
                    >
                      {isSending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                </div>

                <div>
                  <FieldLabel>密码</FieldLabel>
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    visible={showPassword}
                    onToggleVisible={() => setShowPassword((prev) => !prev)}
                    placeholder="请输入密码（至少 6 位）"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <FieldLabel>确认密码</FieldLabel>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={showConfirmPassword}
                    onToggleVisible={() => setShowConfirmPassword((prev) => !prev)}
                    placeholder="请再次输入密码"
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  onClick={handleRegister}
                  disabled={isSubmitting}
                  className={`mt-6 w-full bg-[#00E676] py-3.5 text-base font-bold text-[#0D111A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                    isSubmitting ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[0_0_25px_rgba(0,230,118,0.6)]'
                  }`}
                >
                  {isSubmitting ? '注册中...' : '注册'}
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-[#64748B]">
                已有账号？
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false)
                    setError('')
                    setSendSuccess('')
                  }}
                  className="ml-1 text-[#00E676] hover:underline"
                >
                  返回登录
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md border border-[#334155] bg-[#1E293B] p-6">
            <h3 className="mb-4 text-xl font-bold text-white">找回密码</h3>

            {forgotError && <MessageBox tone="error">{forgotError}</MessageBox>}

            {resetSent ? (
              <div className="text-center">
                <div className="mb-4 text-5xl">✓</div>
                <p className="mb-4 text-[#00E676]">重置密码邮件已发送，请前往邮箱查收。</p>
                <p className="mb-4 text-sm text-[#64748B]">打开邮件中的链接后即可重新设置密码。</p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false)
                    setResetSent(false)
                  }}
                  className="w-full bg-[#00E676] py-3 font-bold text-[#0D111A]"
                >
                  我知道了
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <FieldLabel>QQ 邮箱</FieldLabel>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(event) => setForgotEmail(event.target.value)}
                    placeholder="请输入注册时使用的 QQ 邮箱"
                    className="w-full border border-[#334155] bg-[#0D111A] px-4 py-3 text-white outline-none placeholder:text-[#475569] focus:border-[#00E676]"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 bg-[#334155] py-3 font-medium text-white"
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
                    {isSendingReset ? '发送中...' : '发送重置邮件'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 border border-[#334155] bg-[#1E293B]/50 p-3">
      <span className="min-w-[36px] text-xs font-bold text-[#00E676]">{icon}</span>
      <div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-[#64748B]">{description}</p>
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-[#94A3B8]">{children}</label>
}

function MessageBox({
  tone,
  children,
}: {
  tone: 'error' | 'success'
  children: React.ReactNode
}) {
  const className =
    tone === 'error'
      ? 'bg-red-500/10 border border-red-500/30 text-red-400 p-3 mb-6 text-sm'
      : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 mb-6 text-sm'

  return <div className={className}>{children}</div>
}

function PasswordInput({
  value,
  onChange,
  visible,
  onToggleVisible,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggleVisible: () => void
  placeholder: string
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border border-[#334155] bg-[#0D111A] px-4 py-3 pr-10 text-white outline-none transition-all placeholder:text-[#475569] focus:border-[#00E676]"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] transition-colors hover:text-[#00E676]"
      >
        {visible ? (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        )}
      </button>
    </div>
  )
}
