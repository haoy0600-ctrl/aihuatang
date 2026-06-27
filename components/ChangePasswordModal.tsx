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
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const resetForm = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmNewPassword('')
    setError('')
    setIsLoading(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setError('')

    if (!oldPassword) {
      setError('请输入原密码')
      return
    }

    if (!newPassword) {
      setError('请输入新密码')
      return
    }

    if (newPassword.length < 6) {
      setError('密码长度至少 6 位')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('两次输入的新密码不一致')
      return
    }

    if (oldPassword === newPassword) {
      setError('新密码不能和原密码相同')
      return
    }

    const session = getStoredSession()
    if (!session) {
      setError('登录状态已失效，请重新登录')
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

      const data = await response.json()
      if (!response.ok || !data.success) {
        setError(data.error || '修改密码失败')
        setIsLoading(false)
        return
      }

      handleClose()
      alert('密码修改成功，下次登录请使用新密码')
    } catch (submitError) {
      console.error('Change password error:', submitError)
      setError('修改密码失败，请稍后重试')
      setIsLoading(false)
    }
  }

  if (!show) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-[#202B3A] bg-[#141923] p-8">
        <h3 className="mb-6 text-center text-xl font-bold text-white">修改密码</h3>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500 bg-red-500/20 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1.5 block text-xs text-[#00F2FE]">原密码</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            placeholder="请输入原密码"
            className="w-full rounded-lg border border-[#202B3A] bg-[#0B0D17] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#ABC4FF] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs text-[#00F2FE]">新密码</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="请输入新密码（至少 6 位）"
            className="w-full rounded-lg border border-[#202B3A] bg-[#0B0D17] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#ABC4FF] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]"
          />
        </div>

        <div className="mb-6">
          <label className="mb-1.5 block text-xs text-[#00F2FE]">确认新密码</label>
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            placeholder="请再次输入新密码"
            className="w-full rounded-lg border border-[#202B3A] bg-[#0B0D17] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#ABC4FF] focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 rounded-lg border border-[#202B3A] bg-[#0B0D17] py-3 text-sm font-bold text-white transition-all hover:border-[#00F2FE]"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`flex-1 rounded-lg border border-[#202B3A] bg-[#00E676] py-3 text-sm font-bold text-[#0A0F1D] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
              isLoading ? 'cursor-not-allowed opacity-50' : 'hover:shadow-[0_0_20px_rgba(0,230,118,0.6)]'
            }`}
          >
            {isLoading ? '保存中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  )
}
