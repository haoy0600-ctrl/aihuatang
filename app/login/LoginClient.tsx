'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  type LoginSession,
  authHeaders,
  clearRememberedAccount,
  clearStoredSession,
  getRememberedAccount,
  getStoredSession,
  saveRememberedAccount,
  saveStoredSession,
} from '@/lib/session'
import { BrandLogo } from '@/components/BrandLogo'
import { hardNavigate } from '@/lib/fresh-navigation'
import { supabase } from '@/lib/supabase'

const QQ_EMAIL_REGEX = /^[^\s@]+@qq\.com$/i
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/

function validateQQEmail(value: string, fieldName = 'QQ 邮箱') {
  if (!value) return `请输入${fieldName}`
  if (!QQ_EMAIL_REGEX.test(value.trim())) return `请输入有效的${fieldName}`
  return ''
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isRegister, setIsRegister] = useState(false)
  const [account, setAccount] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [sendSuccess, setSendSuccess] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberAccount, setRememberAccount] = useState(true)

  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [recoveryAccessToken, setRecoveryAccessToken] = useState('')
  const [recoveryRefreshToken, setRecoveryRefreshToken] = useState('')
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState('')
  const [recoverySubmitting, setRecoverySubmitting] = useState(false)
  const [recoveryMessage, setRecoveryMessage] = useState('')

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? 0 : prev - 1))
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [countdown])

  useEffect(() => {
    const mode = searchParams.get('mode')
    const remembered = getRememberedAccount()
    if (remembered) {
      setAccount(remembered)
      setForgotEmail(remembered)
      setRememberAccount(true)
    } else {
      setRememberAccount(false)
    }

    const session = getStoredSession()
    if (session && mode !== 'recovery') {
      hardNavigate('/dashboard')
    }
  }, [router, searchParams])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mode = searchParams.get('mode')
    const queryType = searchParams.get('type')
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const hashParams = new URLSearchParams(hash)
    const hashType = hashParams.get('type')
    const accessToken = hashParams.get('access_token') || searchParams.get('access_token') || ''
    const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token') || ''
    const code = searchParams.get('code') || hashParams.get('code') || ''
    const tokenHash = searchParams.get('token_hash') || hashParams.get('token_hash') || ''

    const shouldEnterRecovery =
      mode === 'recovery' ||
      queryType === 'recovery' ||
      hashType === 'recovery' ||
      Boolean(accessToken || code || tokenHash)
    if (!shouldEnterRecovery) return

    setIsRecoveryMode(true)
    setShowForgotPassword(false)
    setError('')
    setForgotError('')
    setResetSent(false)
    setRecoveryAccessToken(accessToken)
    setRecoveryRefreshToken(refreshToken)

    if (!accessToken && supabase && (code || tokenHash)) {
      void (async () => {
        try {
          const result = code
            ? await supabase.auth.exchangeCodeForSession(code)
            : await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })

          if (result.data.session?.access_token) {
            setRecoveryAccessToken(result.data.session.access_token)
            setRecoveryRefreshToken(result.data.session.refresh_token || '')
            setError('')
            setRecoveryMessage('已验证重置邮件，请直接设置新的登录密码。')
          } else if (result.error) {
            setError(result.error.message || '重置链接无效或已过期，请重新发送重置邮件。')
          }
        } catch (recoveryError) {
          console.error('Failed to verify recovery link:', recoveryError)
          setError('重置链接验证失败，请重新发送重置邮件。')
        }
      })()
    }

    if (accessToken || refreshToken || hash) {
      window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}?mode=recovery`)
    }
  }, [searchParams])

  const saveSession = (userId: string, userEmail: string, authSession: any) => {
    const session: LoginSession = {
      id: userId,
      email: userEmail,
      accessToken: authSession.accessToken,
      refreshToken: authSession.refreshToken,
      expiresAt: authSession.expiresAt || Date.now() + 30 * 24 * 60 * 60 * 1000,
    }

    saveStoredSession(session)
    if (rememberAccount) {
      saveRememberedAccount(userEmail)
    } else {
      clearRememberedAccount()
    }
  }

  const ensureProfileExists = async (
    userId: string,
    userEmail: string,
    nextUsername?: string,
    notifyRegister = false,
  ) => {
    try {
      const response = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ userId, userEmail, username: nextUsername, notifyRegister }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        return { success: false, error: data.error || '创建用户资料失败。' }
      }
      return { success: true, error: '' }
    } catch (profileError) {
      console.error('Failed to ensure profile:', profileError)
      return { success: false, error: '创建用户资料失败，请稍后重试。' }
    }
  }

  const handleSendCode = async () => {
    setError('')
    setSendSuccess('')

    const usernameValue = username.trim()
    if (!usernameValue) {
      setError('请先输入用户名。')
      return
    }
    if (!USERNAME_REGEX.test(usernameValue)) {
      setError('用户名只能使用 3-20 位字母、数字、下划线或短横线。')
      return
    }

    const emailError = validateQQEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }

    setIsSending(true)
    try {
      const checkResponse = await fetch('/api/auth/register-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: usernameValue }),
      })
      const checkData = await checkResponse.json()
      if (!checkResponse.ok || !checkData.success) {
        setError(checkData.error || '注册检查失败，请稍后重试。')
        return
      }

      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error || '验证码发送失败。')
        return
      }

      setCountdown(60)
      setSendSuccess('验证码已发送，请查收邮箱。')
    } catch (sendError) {
      console.error('Send code error:', sendError)
      setError('验证码发送失败，请稍后重试。')
    } finally {
      setIsSending(false)
    }
  }

  const handlePasswordLogin = async () => {
    setError('')
    setSendSuccess('')

    if (!account.trim()) {
      setError('请输入邮箱或用户名。')
      return
    }
    if (!password) {
      setError('请输入密码。')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.trim(), password }),
      })

      const data = await response.json()
      if (!response.ok || !data.success || !data.user || !data.session?.accessToken) {
        setError(data.error || '登录失败，请稍后重试。')
        return
      }

      saveSession(data.user.id, data.user.email || account, data.session)
      await ensureProfileExists(data.user.id, data.user.email || account)
      hardNavigate('/dashboard')
    } catch (loginError) {
      console.error('Login error:', loginError)
      setError('登录失败，请稍后重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegister = async () => {
    setError('')
    setSendSuccess('')

    const usernameValue = username.trim()
    if (!usernameValue) {
      setError('请输入用户名。')
      return
    }
    if (!USERNAME_REGEX.test(usernameValue)) {
      setError('用户名只能使用 3-20 位字母、数字、下划线或短横线。')
      return
    }

    const emailError = validateQQEmail(email)
    if (emailError) {
      setError(emailError)
      return
    }
    if (!token || token.length !== 6) {
      setError('请输入 6 位邮箱验证码。')
      return
    }
    if (!password || password.length < 6) {
      setError('密码长度至少 6 位。')
      return
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致。')
      return
    }

    setIsSubmitting(true)

    try {
      const checkResponse = await fetch('/api/auth/register-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username: usernameValue }),
      })
      const checkData = await checkResponse.json()
      if (!checkResponse.ok || !checkData.success) {
        setError(checkData.error || '注册检查失败，请稍后重试。')
        return
      }

      const verifyResponse = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      })

      const verifyData = await verifyResponse.json()
      if (!verifyResponse.ok || !verifyData.success || !verifyData.user || !verifyData.session?.accessToken) {
        setError(verifyData.error || '验证码错误或已过期，请重新获取。')
        return
      }

      saveSession(verifyData.user.id, verifyData.user.email || email, verifyData.session)

      const updateResponse = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password }),
      })

      const updateData = await updateResponse.json()
      if (!updateResponse.ok || !updateData.success) {
        setError(updateData.error || '注册失败，密码设置未完成。')
        return
      }

      const profileResult = await ensureProfileExists(
        verifyData.user.id,
        verifyData.user.email || email,
        usernameValue,
        true,
      )
      if (!profileResult.success) {
        setError(profileResult.error)
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

      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const loginData = await loginResponse.json()

      if (!loginResponse.ok || !loginData.success || !loginData.user || !loginData.session?.accessToken) {
        clearStoredSession()
        setError(loginData.error || '注册成功，但自动登录失败，请返回登录页使用新密码登录。')
        return
      }

      saveSession(loginData.user.id, loginData.user.email || email, loginData.session)
      hardNavigate('/dashboard')
    } catch (registerError) {
      console.error('Register error:', registerError)
      setError('注册失败，请稍后重试。')
    } finally {
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
      if (!response.ok || !data.success) {
        setForgotError(data.error || '发送失败，请稍后重试。')
        return
      }

      setResetSent(true)
    } catch (resetError) {
      console.error('Reset password error:', resetError)
      setForgotError('发送失败，请稍后重试。')
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleRecoveryPasswordReset = async () => {
    setError('')
    setRecoveryMessage('')

    if (!recoveryAccessToken) {
      setError('重置链接无效或已过期，请重新发送重置邮件。')
      return
    }
    if (!recoveryPassword || recoveryPassword.length < 6) {
      setError('新密码长度至少 6 位。')
      return
    }
    if (recoveryPassword !== recoveryConfirmPassword) {
      setError('两次输入的新密码不一致。')
      return
    }

    setRecoverySubmitting(true)

    try {
      saveStoredSession({
        id: 'recovery-temp-user',
        email: forgotEmail || account || 'recovery@aihuatang.top',
        accessToken: recoveryAccessToken,
        refreshToken: recoveryRefreshToken || undefined,
        expiresAt: Date.now() + 30 * 60 * 1000,
      })

      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ password: recoveryPassword }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        clearStoredSession()
        setError(data.error || '重置密码失败，请重新获取邮件。')
        return
      }

      clearStoredSession()
      setRecoveryMessage('密码重置成功，请使用新密码登录。')
      setIsRecoveryMode(false)
      setRecoveryPassword('')
      setRecoveryConfirmPassword('')
      setRecoveryAccessToken('')
      setRecoveryRefreshToken('')
    } catch (resetError) {
      console.error('Recovery reset error:', resetError)
      clearStoredSession()
      setError('重置密码失败，请稍后重试。')
    } finally {
      setRecoverySubmitting(false)
    }
  }

  const openForgotPassword = () => {
    setShowForgotPassword(true)
    setForgotEmail(account)
    setForgotError('')
    setResetSent(false)
  }

  return (
    <div className="grid min-h-screen w-full grid-cols-1 bg-[#0D111A] md:grid-cols-2">
      <div className="relative hidden items-center justify-center overflow-hidden bg-[#0D111A] p-8 md:flex lg:p-12">
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
          <div className="mx-auto mb-6 flex justify-center">
            <BrandLogo className="justify-center" />
          </div>

          <p className="mx-auto mb-8 max-w-md text-lg text-[#64748B]">
            面向自媒体创作者的高质感图文生成与智能排版工具。
          </p>

          <div className="mx-auto max-w-sm space-y-4 text-left">
            <FeatureCard icon="AI" title="高效生成" description="输入主题与要点，快速生成可直接发布的知识图卡。" />
            <FeatureCard icon="风格" title="多种视觉风格" description="覆盖简约、商业、科普、课程封面等常用内容模板。" />
            <FeatureCard icon="同步" title="多端协同" description="支持手机、平板和电脑连续创作，不必反复切换设备。" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-[#1E293B] p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center md:hidden">
            <div className="mx-auto mb-3 flex justify-center">
              <BrandLogo className="justify-center" />
            </div>
            <p className="text-sm text-[#64748B]">自媒体知识图卡与视觉排版工作台</p>
          </div>

          {!isRegister ? (
            <div className="border border-[#334155] bg-[#1E293B] p-4 sm:p-6">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">{isRecoveryMode ? '重置密码' : '欢迎回来'}</h2>
                <p className="mt-1 text-sm text-[#64748B]">
                  {isRecoveryMode ? '请设置新的登录密码' : '登录后继续你的创作'}
                </p>
              </div>

              {error && <MessageBox tone="error">{error}</MessageBox>}
              {sendSuccess && <MessageBox tone="success">{sendSuccess}</MessageBox>}
              {recoveryMessage && <MessageBox tone="success">{recoveryMessage}</MessageBox>}

              {isRecoveryMode ? (
                <div className="space-y-4">
                  <MessageBox tone="success">已验证重置邮件，请直接设置新的登录密码。</MessageBox>

                  <div>
                    <FieldLabel>新密码</FieldLabel>
                    <PasswordInput
                      value={recoveryPassword}
                      onChange={setRecoveryPassword}
                      visible={showPassword}
                      onToggleVisible={() => setShowPassword((prev) => !prev)}
                      placeholder="请输入新密码"
                      disabled={recoverySubmitting}
                    />
                  </div>

                  <div>
                    <FieldLabel>确认新密码</FieldLabel>
                    <PasswordInput
                      value={recoveryConfirmPassword}
                      onChange={setRecoveryConfirmPassword}
                      visible={showConfirmPassword}
                      onToggleVisible={() => setShowConfirmPassword((prev) => !prev)}
                      placeholder="请再次输入新密码"
                      disabled={recoverySubmitting}
                    />
                  </div>

                  <button
                    onClick={handleRecoveryPasswordReset}
                    disabled={recoverySubmitting}
                    className={`w-full bg-[#00E676] py-3.5 text-base font-bold text-[#0D111A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                      recoverySubmitting ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[0_0_25px_rgba(0,230,118,0.6)]'
                    }`}
                  >
                    {recoverySubmitting ? '重置中...' : '确认重置密码'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <FieldLabel>邮箱 / 用户名</FieldLabel>
                      <input
                        type="text"
                        value={account}
                        onChange={(event) => setAccount(event.target.value)}
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

                    <label className="flex cursor-pointer items-center gap-2 text-sm text-[#94A3B8]">
                      <input
                        type="checkbox"
                        checked={rememberAccount}
                        onChange={(event) => setRememberAccount(event.target.checked)}
                        className="h-4 w-4 accent-[#00E676]"
                      />
                      记住账号
                    </label>

                    <button
                      onClick={handlePasswordLogin}
                      disabled={isSubmitting}
                      className={`w-full bg-[#00E676] py-3.5 text-base font-bold text-[#0D111A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
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
                </>
              )}
            </div>
          ) : (
            <div className="border border-[#334155] bg-[#1E293B] p-4 sm:p-6">
              <div className="mb-6 text-center">
                <h2 className="text-xl font-bold text-white">创建账号</h2>
                <p className="mt-1 text-sm text-[#64748B]">注册后赠送 8 积分，可直接测试生成</p>
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
                    placeholder="请输入密码"
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
                  className={`w-full bg-[#00E676] py-3.5 text-base font-bold text-[#0D111A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                    isSubmitting ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[0_0_25px_rgba(0,230,118,0.6)]'
                  }`}
                >
                  {isSubmitting ? '注册中...' : '注册并进入创作台'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-[#334155] bg-[#1E293B] p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">重置密码</h3>
                <p className="mt-1 text-sm text-[#64748B]">输入注册邮箱，我们会发送重置链接</p>
              </div>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="text-2xl text-[#64748B] transition-colors hover:text-white"
              >
                ×
              </button>
            </div>

            {forgotError && <MessageBox tone="error">{forgotError}</MessageBox>}
            {resetSent && <MessageBox tone="success">邮件已发送，请查收邮箱并按提示重置密码。</MessageBox>}

            <div className="space-y-4">
              <div>
                <FieldLabel>QQ 邮箱</FieldLabel>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="请输入注册使用的 QQ 邮箱"
                  className="w-full border border-[#334155] bg-[#0D111A] px-4 py-3 text-white outline-none transition-all placeholder:text-[#475569] focus:border-[#00E676]"
                  disabled={isSendingReset}
                />
              </div>

              <button
                onClick={handleForgotPassword}
                disabled={isSendingReset}
                className={`w-full bg-[#00E676] py-3.5 text-base font-bold text-[#0D111A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
                  isSendingReset ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[0_0_25px_rgba(0,230,118,0.6)]'
                }`}
              >
                {isSendingReset ? '发送中...' : '发送重置邮件'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoginPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D111A] text-sm text-[#8CF5CA]">
      正在加载登录页面...
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-[#CBD5E1]">{children}</label>
}

function MessageBox({
  children,
  tone,
}: {
  children: React.ReactNode
  tone: 'error' | 'success'
}) {
  return (
    <div
      className={`mb-4 border px-4 py-3 text-sm ${
        tone === 'error'
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-[#00E676]/30 bg-[#00E676]/10 text-[#8CF5CA]'
      }`}
    >
      {children}
    </div>
  )
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
        className="w-full border border-[#334155] bg-[#0D111A] px-4 py-3 pr-12 text-white outline-none transition-all placeholder:text-[#475569] focus:border-[#00E676]"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={onToggleVisible}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] transition-colors hover:text-white"
      >
        {visible ? '隐藏' : '显示'}
      </button>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="border border-[#334155] bg-[#111827]/70 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-[34px] text-sm font-bold text-[#00E676]">{icon}</div>
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
        </div>
      </div>
    </div>
  )
}
