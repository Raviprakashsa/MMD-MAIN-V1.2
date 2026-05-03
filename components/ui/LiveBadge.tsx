'use client'

interface LiveBadgeProps {
  className?: string
}

export function LiveBadge({ className = '' }: Readonly<LiveBadgeProps>) {
  return (
    <span className={`pulse-indicator text-xs font-semibold text-emerald-400 ${className}`}>
      Live
    </span>
  )
}
