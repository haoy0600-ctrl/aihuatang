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
      setError('密码长度至少6位')
      return
    }

    if (newPassword !== confirmNewPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (oldPassword === newPassword) {
      setError('新密码不能与原密码相同')
      return
    }

    setIsLoading(true)

    try {
      const session = getStoredSession()
      if (!session) {
        setError('请先登录')
        return
      }

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ 
          oldPassword,
          newPassword 
        })
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || '修改密码失败')
      } else {
        onClose()
        alert('密码修改成功！下次登录请使用新密码')
      }
    } catch (err) {
      setError('修改密码失败，请重试')
    } finally {
      setIsLoading(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-[#141923] border border-[#202B3A] p-8 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-6 text-center">🔐 修改密码</h3>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-[#00F2FE] mb-1.5 block">原密码</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="请输入原密码"
            className="w-full px-4 py-3 bg-[#0B0D17] border border-[#202B3A] text-sm text-white focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE] focus:outline-none placeholder-[#ABC4FF]"
          />
        </div>

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
          <label className="text-xs text-[#00F2FE] mb-1.5 block">确认新密码</label>
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
            onClick={onClose}
            className="flex-1 py-3 bg-[#0B0D17] border border-[#202B3A] text-white font-bold text-sm hover:border-[#00F2FE] transition-all"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className={`flex-1 py-3 bg-[#00E676] text-[#0A0F1D] font-bold text-sm border border-[#202B3A] shadow-[0_0_15px_rgba(0,230,118,0.4)] transition-all ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-[0_0_20px_rgba(0,230,118,0.6)]'
            }`}
          >
            {isLoading ? '保存中...' : '确认修改'}
          </button>
        </div>
      </div>
    </div>
  )
}
