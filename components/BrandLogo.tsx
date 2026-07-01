type BrandLogoProps = {
  compact?: boolean
  className?: string
}

export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  const iconClass = compact
    ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#163128] bg-[#06110D] text-sm font-black text-[#39FF93]'
    : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#163128] bg-[#06110D] text-base font-black text-[#39FF93] sm:h-12 sm:w-12'
  const textClass = compact
    ? 'truncate text-base font-bold text-white sm:text-lg'
    : 'truncate text-lg font-bold text-white sm:text-2xl'

  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`} aria-label="AI画堂">
      <span className={iconClass} aria-hidden="true">
        <span className="leading-none">AI</span>
        <span className="ml-0.5 flex h-4 flex-col justify-end gap-0.5">
          <span className="block h-0.5 w-2 rounded-full bg-white" />
          <span className="block h-0.5 w-2 rounded-full bg-white" />
          <span className="block h-0.5 w-2 rounded-full bg-white" />
        </span>
      </span>
      <span className={textClass}>AI画堂</span>
    </span>
  )
}
