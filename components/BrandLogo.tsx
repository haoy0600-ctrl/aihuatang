'use client'

import { useState } from 'react'

type BrandLogoProps = {
  compact?: boolean
  className?: string
}

export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  const [imageFailed, setImageFailed] = useState(false)

  const iconClass = compact
    ? 'h-8 w-8 shrink-0 object-contain'
    : 'h-9 w-9 shrink-0 object-contain sm:h-12 sm:w-12'
  const fallbackClass = compact
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#163128] bg-[#06110D] text-sm font-black text-[#39FF93]'
    : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#163128] bg-[#06110D] text-base font-black text-[#39FF93] sm:h-12 sm:w-12'
  const textClass = compact
    ? 'truncate text-base font-bold text-white sm:text-lg'
    : 'truncate text-lg font-bold text-white sm:text-2xl'

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {!imageFailed ? (
        <img src="/logo.svg?v=4" alt="AI画堂" onError={() => setImageFailed(true)} className={iconClass} />
      ) : (
        <span className={fallbackClass}>AI</span>
      )}
      <span className={textClass}>AI画堂</span>
    </span>
  )
}
