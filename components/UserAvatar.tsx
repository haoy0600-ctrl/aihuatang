'use client'

import { useState } from 'react'
import { resolveAvatarUrl } from '@/lib/avatar'

type UserAvatarProps = {
  avatarUrl?: string | null
  alt?: string
  className?: string
}

export function UserAvatar({ avatarUrl, alt = '头像', className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <span
        className={`flex items-center justify-center bg-[#06110D] text-xs font-black text-[#39FF93] ${className}`}
        aria-label={alt}
      >
        AI
      </span>
    )
  }

  return (
    <img
      src={resolveAvatarUrl(avatarUrl)}
      alt={alt}
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
