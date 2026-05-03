'use client'

import { cn } from '@/lib/utils'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * StatusBadge - Semantic Status Visualization
 * ============================================
 * Neuropsychology Principle: "Visual scanning must be deterministic"
 * 
 * Color Language:
 * - Blue (brand): Trusted action, active states
 * - Gold: VIP/Premium tags, priority clients
 * - Coral: Attention needed, awaiting response, pending
 * - Red: Failure, error (STATIC - never animated, serious)
 * - Green: Done, success (quick confirmation pop)
 */

interface StatusBadgeProps {
  status: string
  className?: string
  showPulse?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// WCAG AA Compliant Status Colors - MagnusCopo Design System
const statusColors = {
  // === PIPELINE STAGES (Brand Blue Spectrum) ===
  'Open': 'bg-brand-100 text-brand-900 border-brand-200',
  'Active': 'bg-brand-100 text-brand-900 border-brand-200',
  'In Progress': 'bg-brand-100 text-brand-900 border-brand-200',
  
  // === RECRUITMENT FUNNEL ===
  'Sourced': 'bg-violet-50 text-violet-700 border-violet-200',
  'Screening': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Submitted': 'bg-blue-50 text-blue-700 border-blue-200',
  'Interview': 'bg-amber-50 text-amber-700 border-amber-200',
  'Offer': 'bg-teal-50 text-teal-700 border-teal-200',
  
  // === SUCCESS STATES (Green - Quick pop animation) ===
  'Filled': 'bg-success-light text-success-foreground border-emerald-200',
  'Placed': 'bg-success-light text-success-foreground border-emerald-200',
  'Hired': 'bg-success-light text-success-foreground border-emerald-200',
  'Approved': 'bg-success-light text-success-foreground border-emerald-200',
  'Completed': 'bg-success-light text-success-foreground border-emerald-200',
  
  // === ATTENTION STATES (Coral - Slow pulse when blocked) ===
  'Pending': 'bg-coral-light text-coral-foreground border-orange-200',
  'Awaiting': 'bg-coral-light text-coral-foreground border-orange-200',
  'Blocked': 'bg-coral-light text-coral-foreground border-orange-300',
  'On Hold': 'bg-neutral-100 text-neutral-600 border-neutral-200',
  
  // === PREMIUM/VIP (Gold - Static, prestigious) ===
  'VIP': 'bg-gold-light text-gold-foreground border-amber-300',
  'Priority': 'bg-gold-light text-gold-foreground border-amber-300',
  'Premium': 'bg-gold-light text-gold-foreground border-amber-300',
  
  // === URGENCY (Warm to hot spectrum) ===
  'Urgent': 'bg-rose-50 text-rose-700 border-rose-200',
  'High': 'bg-orange-50 text-orange-700 border-orange-200',
  'Medium': 'bg-amber-50 text-amber-700 border-amber-200',
  'Low': 'bg-neutral-100 text-neutral-600 border-neutral-200',
  
  // === NEGATIVE STATES (Red - STATIC, no animation) ===
  'Cancelled': 'bg-destructive-light text-destructive-foreground border-red-200',
  'Rejected': 'bg-destructive-light text-destructive-foreground border-red-200',
  'Withdrawn': 'bg-neutral-100 text-neutral-600 border-neutral-200',
  'Closed': 'bg-neutral-100 text-neutral-600 border-neutral-200',
  
  // === GENERIC ===
  'New': 'bg-brand-100 text-brand-900 border-brand-200',
  'Draft': 'bg-neutral-100 text-neutral-600 border-neutral-200',
  
  // === DEFAULT ===
  'default': 'bg-neutral-100 text-neutral-600 border-neutral-200',
} as const

// Statuses that should show pulsing indicator (attention needed)
const pulsingStatuses = new Set(['Open', 'Active', 'In Progress', 'Urgent', 'New', 'Pending', 'Awaiting'])

// Statuses that should use coral slow pulse (blocked/waiting)
const coralPulseStatuses = new Set(['Pending', 'Awaiting', 'Blocked'])

// Success statuses get quick pop animation
const successStatuses = new Set(['Filled', 'Placed', 'Hired', 'Approved', 'Completed'])

// Size variants
const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
}

export default function StatusBadge({ 
  status, 
  className, 
  showPulse,
  size = 'md'
}: Readonly<StatusBadgeProps>) {
  const prefersReducedMotion = useReducedMotion()
  const colorClass = statusColors[status as keyof typeof statusColors] || statusColors.default
  
  // Determine animation state
  const shouldPulse = showPulse ?? pulsingStatuses.has(status)
  const isCoralPulse = coralPulseStatuses.has(status)
  const isSuccess = successStatuses.has(status)

  // Base component
  const BadgeContent = (
    <>
      {shouldPulse && !prefersReducedMotion && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
          aria-hidden="true"
        />
      )}
      {status}
    </>
  )

  // Use motion.span for animated states
  if ((shouldPulse || isSuccess) && !prefersReducedMotion) {
    // Animation configuration based on type
    const pulseAnimation = isCoralPulse ? {
      boxShadow: [
        '0 0 0 0 rgba(255, 107, 53, 0)',
        '0 0 0 4px rgba(255, 107, 53, 0.12)',
        '0 0 0 0 rgba(255, 107, 53, 0)',
      ],
    } : {
      boxShadow: [
        '0 0 0 0 rgba(0, 27, 255, 0)',
        '0 0 0 3px rgba(0, 27, 255, 0.1)',
        '0 0 0 0 rgba(0, 27, 255, 0)',
      ],
    }
    
    const successAnimation = { scale: 1, opacity: 1 }
    
    return (
      <motion.span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-semibold border transition-colors',
          sizeClasses[size],
          colorClass,
          className
        )}
        initial={isSuccess ? { scale: 0.9, opacity: 0 } : undefined}
        animate={isSuccess ? successAnimation : pulseAnimation}
        transition={isSuccess ? {
          type: 'spring' as const,
          stiffness: 300,
          damping: 20,
        } : {
          duration: isCoralPulse ? 3 : 2,
          ease: 'easeInOut' as const,
          repeat: Infinity,
        }}
      >
        {BadgeContent}
      </motion.span>
    )
  }

  // Static badge for non-animated states
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold border transition-colors',
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {BadgeContent}
    </span>
  )
}

// Named exports for common status types
export function ActiveBadge({ className }: Readonly<{ className?: string }>) {
  return <StatusBadge status="Active" showPulse className={className} />
}

export function PendingBadge({ className }: Readonly<{ className?: string }>) {
  return <StatusBadge status="Pending" showPulse className={className} />
}

export function VIPBadge({ className }: Readonly<{ className?: string }>) {
  return <StatusBadge status="VIP" showPulse={false} className={className} />
}

export function UrgentBadge({ className }: Readonly<{ className?: string }>) {
  return <StatusBadge status="Urgent" showPulse className={className} />
}
