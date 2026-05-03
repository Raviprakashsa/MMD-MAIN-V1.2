'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InteractiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
  pulseOnValid?: boolean
}

const InteractiveButton = forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      pulseOnValid = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
    
    const variantStyles = {
      primary: 'btn-primary bg-[#6366F1] text-white hover:bg-[#5558E3] focus-visible:ring-[#6366F1]',
      secondary: 'btn-secondary bg-[#1E293B] text-white hover:bg-[#2D3B4F] focus-visible:ring-[#2D3B4F]',
      accent: 'btn-accent bg-[#06B6D4] text-[#0B0F19] hover:bg-[#22D3EE] focus-visible:ring-[#06B6D4]',
      ghost: 'btn-secondary bg-transparent text-slate-300 hover:bg-[#1E293B]/50',
      danger: 'btn-primary bg-[#EF4444] text-white hover:bg-[#DC2626] focus-visible:ring-[#EF4444]',
    }
    
    const sizeStyles = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    }

    const pulseClass = pulseOnValid && !isLoading && !disabled ? 'pulse-glow' : ''

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          pulseClass,
          isLoading && 'btn-loading',
          className
        )}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="btn-loading-spinner h-4 w-4" />
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)

InteractiveButton.displayName = 'InteractiveButton'

export default InteractiveButton
