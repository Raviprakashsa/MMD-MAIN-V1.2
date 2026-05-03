'use client'

import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface InteractiveCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass'
  interactive?: boolean
  glow?: 'primary' | 'accent' | 'none'
}

export default function InteractiveCard({
  children,
  className,
  variant = 'default',
  interactive = true,
  glow = 'none',
  ...props
}: Readonly<InteractiveCardProps>) {
  const baseStyles = 'rounded-xl border transition-all duration-250'
  
  const variantStyles = {
    default: 'bg-[#0F1623] border-[#1E293B]',
    elevated: 'surface-elevated',
    glass: 'glass',
  }

  const glowStyles = {
    primary: 'hover:shadow-glow-primary',
    accent: 'hover:shadow-glow-accent',
    none: '',
  }

  const interactiveClass = interactive ? 'card-interactive' : ''

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        glowStyles[glow],
        interactiveClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
