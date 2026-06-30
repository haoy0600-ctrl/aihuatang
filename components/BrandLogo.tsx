'use client'

import { useState } from 'react'

type BrandLogoProps = {
  compact?: boolean
  className?: string
}

export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {!imageFailed ? (
        <img
          src="/logo.svg?v=4"
          alt="AI画堂"
          onError={() => setImageFailed(true)}
          className={compact ? 'h-8 w-8 shrink-0 object-contain' : 'h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12'}
        />
      ) : (
        <span
          className={
            compact
              ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#163128] bg-[#06110D] text-sm font-black text-[#39FF93]'
              : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#163128] bg-[#06110D] text-base font-black text-[#39FF93] sm:h-12 sm:w-12'
          }
        >
          AI
        </span>
      )}
      <span className={compact ? 'truncate text-lg font-bold text-white' : 'truncate text-xl font-bold text-white sm:text-2xl'}>
        AI画堂
      </span>
    </span>
  )
}
