'use client'

import { useState } from 'react'
import { authHeaders, getStoredSession } from '@/lib/session'

interface ChangePasswordProps {
  show: boolean
  onClose: () => void
}

export function ChangePasswordModal({ show, onClose }: ChangePasswordProps) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setMessage('')
    setError('')
    setIsLoading(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setMessage('')
    setError('')

    if (!oldPassword.trim()) {
      setError('请输入当前密码')
      return
    }

    if (newPassword.length < 6) {
      setError('新密码至少需要 6 位')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('两次输入的新密码不一致')
      return
    }

    if (oldPassword === newPassword) {
      setError('新密码不能和当前密码相同')
      return
    }

    if (!getStoredSession()) {
      setError('登录状态已失效，请重新登录后再修改密码')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          oldPassword,
          newPassword,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.success) {
        setError(data.error || '修改密码失败，请确认当前密码是否正确')
        setIsLoading(false)
        return
      }

      setMessage('密码修改成功，下次登录请使用新密码。')
      setTimeout(handleClose, 900)
    } catch (submitError) {
      console.error('Change password error:', submitError)
      setError('网络异常，请稍后重试')
      setIsLoading(false)
    }
  }

  if (!show) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-[#203B34] bg-[#0B1411] p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white">修改登录密码</h3>
            <p className="mt-1 text-sm text-[#8FB5A8]">为了账号安全，请先输入当前密码。</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#203B34] text-white transition hover:border-[#10B981] hover:text-[#10B981]"
            aria-label="关闭"
          >
            x
          </button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-500/50 bg-red-500/15 p-3 text-sm text-red-200">{error}</div>}
        {message && (
          <div className="mb-4 rounded-xl border border-[#10B981]/50 bg-[#10B981]/15 p-3 text-sm text-[#B7F7D9]">{message}</div>
        )}

        <div className="space-y-4">
          <PasswordField label="当前密码" value={oldPassword} onChange={setOldPassword} placeholder="请输入当前密码" />
          <PasswordField label="新密码" value={newPassword} onChange={setNewPassword} placeholder="至少 6 位" />
          <PasswordField label="确认新密码" value={confirmNewPassword} onChange={setConfirmNewPassword} placeholder="再次输入新密码" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-[#203B34] py-3 text-sm font-bold text-white transition hover:border-[#10B981]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="rounded-xl bg-[#10B981] py-3 text-sm font-bold text-[#04110D] transition hover:bg-[#34D399] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? '保存中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-[#9EDCC9]">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#203B34] bg-[#050B09] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#637A72] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
      />
    </label>
  )
}
