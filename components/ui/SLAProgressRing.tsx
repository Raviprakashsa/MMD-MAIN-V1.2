'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

/**
 * SLAProgressRing - Temporal Urgency Visualization
 * ================================================
 * Neuropsychology Principle: "Time must be visible"
 * 
 * Features:
 * - Visual progress ring around SLA timer
 * - Color changes ONLY near breach (don't panic users early)
 * - Warning glow only in last 20% of SLA
 * - Respects reduced motion preferences
 */

export interface SLAProgressRingProps {
  /** Progress value from 0 to 1 (0 = just started, 1 = SLA complete/breached) */
  progress: number
  /** Size of the ring in pixels */
  size?: number
  /** Stroke width of the ring */
  strokeWidth?: number
  /** Optional label to show in center (e.g., "2h") */
  label?: string
  /** Whether the SLA has been breached */
  breached?: boolean
  /** Custom className */
  className?: string
  /** Whether to show the pulsing animation for critical state */
  showPulse?: boolean
}

type Urgency = 'normal' | 'warning' | 'critical' | 'breached'

// Color mapping based on urgency level
const urgencyColors: Record<Urgency, { stroke: string; glow: string; text: string }> = {
  normal: {
    stroke: '#1aa55a', // Success green
    glow: 'rgba(26, 165, 90, 0)',
    text: 'text-success-foreground',
  },
  warning: {
    stroke: '#f59e0b', // Warning amber
    glow: 'rgba(245, 158, 11, 0.15)',
    text: 'text-warning-foreground',
  },
  critical: {
    stroke: '#ff6b35', // Coral (attention, not alarm)
    glow: 'rgba(255, 107, 53, 0.2)',
    text: 'text-coral-foreground',
  },
  breached: {
    stroke: '#e53e3e', // Destructive red
    glow: 'rgba(229, 62, 62, 0.25)',
    text: 'text-destructive-foreground',
  },
}

function getUrgencyLevel(progress: number, breached: boolean): Urgency {
  if (breached) return 'breached'
  if (progress >= 0.9) return 'critical' // Last 10%
  if (progress >= 0.8) return 'warning'  // Last 20%
  return 'normal'
}

export function SLAProgressRing({
  progress,
  size = 36,
  strokeWidth = 3,
  label,
  breached = false,
  className,
  showPulse = true,
}: Readonly<SLAProgressRingProps>) {
  const prefersReducedMotion = useReducedMotion()
  
  // Clamp progress between 0 and 1
  const clampedProgress = Math.min(Math.max(progress, 0), 1)
  const urgency = getUrgencyLevel(clampedProgress, breached)
  const colors = urgencyColors[urgency]
  
  // Calculate SVG properties
  const center = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - clampedProgress)
  
  // Determine if we should show the warning pulse
  const shouldPulse = showPulse && (urgency === 'critical' || urgency === 'warning') && !prefersReducedMotion

  return (
    <motion.div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      animate={shouldPulse ? {
        boxShadow: [
          `0 0 0 0 ${colors.glow}`,
          `0 0 0 ${urgency === 'critical' ? 6 : 4}px ${colors.glow}`,
          `0 0 0 0 ${colors.glow}`,
        ],
      } : undefined}
      transition={shouldPulse ? {
        duration: urgency === 'critical' ? 2 : 3,
        ease: 'easeInOut' as const,
        repeat: Infinity,
      } : undefined}
      aria-label={`SLA progress: ${Math.round(clampedProgress * 100)}%${breached ? ' (breached)' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(clampedProgress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(0, 0, 0, 0.08)"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ 
            strokeDashoffset,
            stroke: colors.stroke,
          }}
          transition={{
            strokeDashoffset: { 
              duration: prefersReducedMotion ? 0 : 0.6, 
              ease: [0.16, 1, 0.3, 1] 
            },
            stroke: { 
              duration: prefersReducedMotion ? 0 : 0.3 
            },
          }}
        />
      </svg>
      
      {/* Center label */}
      {label && (
        <span 
          className={cn(
            'absolute font-semibold tabular-nums',
            colors.text,
            size <= 28 ? 'text-[10px]' : 'text-xs'
          )}
        >
          {label}
        </span>
      )}
      
      {/* Breached indicator */}
      {breached && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-destructive"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  )
}

// Compact variant for table rows
export function SLAProgressRingCompact({
  progress,
  label,
  breached = false,
  className,
}: Readonly<Pick<SLAProgressRingProps, 'progress' | 'label' | 'breached' | 'className'>>) {
  return (
    <SLAProgressRing
      progress={progress}
      label={label}
      breached={breached}
      size={28}
      strokeWidth={2.5}
      showPulse={false}
      className={className}
    />
  )
}

// Large variant for card displays
export function SLAProgressRingLarge({
  progress,
  label,
  breached = false,
  className,
}: Readonly<Pick<SLAProgressRingProps, 'progress' | 'label' | 'breached' | 'className'>>) {
  return (
    <SLAProgressRing
      progress={progress}
      label={label}
      breached={breached}
      size={48}
      strokeWidth={4}
      showPulse={true}
      className={className}
    />
  )
}

export default SLAProgressRing
