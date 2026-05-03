'use client'

import { ReactNode, forwardRef } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { 
  MessageSquare, 
  Calendar, 
  ArrowRight, 
  MoreHorizontal,
  AlertTriangle,
  Clock,
  User,
  LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SLAProgressRing } from './SLAProgressRing'
import { cardHover, duration, easing } from '@/lib/animations'

/**
 * MissionCard - Staffing Operations Core Component
 * ================================================
 * Design Philosophy: "Recognition over recall"
 * 
 * Card Anatomy (fixed positions for scanning):
 * - LEFT: Avatar + Name + Role
 * - MIDDLE: Stage + Last Activity + Risk Flags
 * - RIGHT: Owner + SLA Timer + Quick Actions
 * 
 * Quick Actions (Hick's Law - max 3 visible):
 * 1. Message
 * 2. Schedule
 * 3. Move Stage
 * Everything else in "..." menu
 */

// Status badge color mappings with semantic meaning
const statusColors = {
  // Pipeline stages
  'Sourced': { bg: 'bg-brand-100', text: 'text-brand-900', border: 'border-brand-200' },
  'Screening': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  'Submitted': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'Interview': { bg: 'bg-warning-light', text: 'text-warning-foreground', border: 'border-amber-200' },
  'Offer': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  'Placed': { bg: 'bg-success-light', text: 'text-success-foreground', border: 'border-emerald-200' },
  
  // Attention states
  'Pending': { bg: 'bg-coral-light', text: 'text-coral-foreground', border: 'border-orange-200' },
  'Blocked': { bg: 'bg-coral-light', text: 'text-coral-foreground', border: 'border-orange-300' },
  'Urgent': { bg: 'bg-destructive-light', text: 'text-destructive-foreground', border: 'border-red-200' },
  
  // Premium
  'VIP': { bg: 'bg-gold-light', text: 'text-gold-foreground', border: 'border-amber-300' },
  
  // Default
  'default': { bg: 'bg-neutral-100', text: 'text-neutral-700', border: 'border-neutral-200' },
} as const

type StatusKey = keyof typeof statusColors

export interface QuickAction {
  icon: LucideIcon
  label: string
  onClick: () => void
  variant?: 'default' | 'primary'
}

export interface MissionCardProps {
  /** Unique identifier */
  id: string
  /** Primary name/title */
  name: string
  /** Secondary info (role, position, etc.) */
  subtitle?: string
  /** Avatar URL or initials */
  avatar?: string | ReactNode
  /** Current stage/status */
  status: string
  /** Last activity timestamp */
  lastActivity?: string
  /** Owner name */
  owner?: string
  /** Owner avatar */
  ownerAvatar?: string
  /** SLA progress (0-1) */
  slaProgress?: number
  /** SLA label (e.g., "2h", "1d") */
  slaLabel?: string
  /** Whether SLA is breached */
  slaBreach?: boolean
  /** Blocked reason (shown as warning flag) */
  blockedReason?: string
  /** Is this a VIP/priority item */
  isVip?: boolean
  /** Quick actions (max 3 shown) */
  quickActions?: QuickAction[]
  /** More actions callback */
  onMoreActions?: () => void
  /** Card click handler */
  onClick?: () => void
  /** Custom className */
  className?: string
  /** Whether the card is selected */
  selected?: boolean
  /** Children for custom content */
  children?: ReactNode
}

// Status Badge Component
function StatusBadge({ 
  status, 
  isBlocked = false,
  className 
}: Readonly<{ 
  status: string
  isBlocked?: boolean
  className?: string 
}>) {
  const colors = statusColors[status as StatusKey] || statusColors.default
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <motion.span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
      // Coral badges pulse slowly when blocked
      animate={isBlocked && !prefersReducedMotion ? {
        boxShadow: [
          '0 0 0 0 rgba(255, 107, 53, 0)',
          '0 0 0 4px rgba(255, 107, 53, 0.15)',
          '0 0 0 0 rgba(255, 107, 53, 0)',
        ],
      } : undefined}
      transition={isBlocked ? {
        duration: 3,
        ease: 'easeInOut',
        repeat: Infinity,
      } : undefined}
    >
      {isBlocked && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status}
    </motion.span>
  )
}

// VIP Badge
function VIPBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-gradient-gold text-white shadow-glow-gold">
      ★ VIP
    </span>
  )
}

// Quick Action Button
function QuickActionButton({ 
  icon: Icon, 
  label, 
  onClick, 
  variant = 'default' 
}: Readonly<QuickAction>) {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
        variant === 'primary'
          ? 'bg-brand-700 text-white hover:bg-brand-900 shadow-sm'
          : 'bg-black/4 text-muted-foreground hover:bg-brand-100 hover:text-brand-700'
      )}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      title={label}
      aria-label={label}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
    </motion.button>
  )
}

// Owner Avatar
function OwnerAvatar({ name, avatar }: Readonly<{ name: string; avatar?: string }>) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div 
      className="flex items-center gap-2"
      title={`Owner: ${name}`}
    >
      <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600 overflow-hidden">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>
      <span className="text-xs text-muted-foreground truncate max-w-20">
        {name}
      </span>
    </div>
  )
}

export const MissionCard = forwardRef<HTMLDivElement, MissionCardProps>(
  function MissionCard(
    {
      id,
      name,
      subtitle,
      avatar,
      status,
      lastActivity,
      owner,
      ownerAvatar,
      slaProgress,
      slaLabel,
      slaBreach = false,
      blockedReason,
      isVip = false,
      quickActions = [],
      onMoreActions,
      onClick,
      className,
      selected = false,
      children,
    },
    ref
  ) {
    const prefersReducedMotion = useReducedMotion()
    const isBlocked = !!blockedReason
    
    // Default quick actions if not provided
    const defaultQuickActions: QuickAction[] = [
      { icon: MessageSquare, label: 'Message', onClick: () => {}, variant: 'default' },
      { icon: Calendar, label: 'Schedule', onClick: () => {}, variant: 'default' },
      { icon: ArrowRight, label: 'Move Stage', onClick: () => {}, variant: 'primary' },
    ]
    
    const actionsToShow = quickActions.length > 0 ? quickActions.slice(0, 3) : defaultQuickActions

    const avatarContent = typeof avatar === 'string' ? (
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center overflow-hidden">
        {avatar.startsWith('http') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-brand-700">{avatar}</span>
        )}
      </div>
    ) : avatar || (
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
        <User className="w-5 h-5 text-brand-700" />
      </div>
    )

    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative bg-white rounded-2xl p-4 border border-black/5 cursor-pointer group',
          'transition-shadow',
          selected && 'ring-2 ring-brand-700 ring-offset-2',
          className
        )}
        variants={cardHover}
        initial="initial"
        whileHover={prefersReducedMotion ? undefined : 'hover'}
        whileTap={prefersReducedMotion ? undefined : 'tap'}
        onClick={onClick}
        data-mission-id={id}
        role="article"
        aria-label={`${name} - ${status}`}
      >
        {/* Selection indicator */}
        <AnimatePresence>
          {selected && (
            <motion.div
              className="absolute left-0 top-3 bottom-3 w-1 bg-brand-700 rounded-r-full"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              exit={{ scaleY: 0 }}
              transition={{ duration: duration.fast }}
            />
          )}
        </AnimatePresence>

        <div className="flex items-start gap-4">
          {/* LEFT: Avatar + Name + Role */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {avatarContent}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {name}
                </h3>
                {isVip && <VIPBadge />}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* MIDDLE: Stage + Last Activity + Risk Flags */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={status} isBlocked={isBlocked} />
            
            {/* Blocked warning */}
            {blockedReason && (
              <div className="flex items-center gap-1 text-xs text-coral">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="truncate max-w-32">{blockedReason}</span>
              </div>
            )}
            
            {/* Last activity */}
            {lastActivity && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{lastActivity}</span>
              </div>
            )}
          </div>
        </div>

        {/* Custom content slot */}
        {children && (
          <div className="mt-3 pt-3 border-t border-black/5">
            {children}
          </div>
        )}

        {/* BOTTOM: Owner + SLA + Quick Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5">
          {/* Owner */}
          <div className="flex items-center gap-3">
            {owner && <OwnerAvatar name={owner} avatar={ownerAvatar} />}
          </div>

          {/* SLA + Quick Actions */}
          <div className="flex items-center gap-3">
            {/* SLA Progress Ring */}
            {slaProgress !== undefined && (
              <SLAProgressRing
                progress={slaProgress}
                label={slaLabel}
                breached={slaBreach}
                size={32}
                strokeWidth={2.5}
              />
            )}

            {/* Quick Actions - Only visible on hover */}
            <motion.div
              className="flex items-center gap-1"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: duration.fast, ease: easing.premium }}
            >
              {/* Show on hover/focus */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-fast">
                {actionsToShow.map((action) => (
                  <QuickActionButton key={action.label} {...action} />
                ))}
              </div>

              {/* More actions */}
              {onMoreActions && (
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMoreActions()
                  }}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:bg-black/4 transition-colors"
                  whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                </motion.button>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    )
  }
)

// Compact variant for lists/tables
export function MissionCardCompact({
  id,
  name,
  status,
  owner,
  slaProgress,
  slaLabel,
  slaBreach,
  onClick,
  className,
}: Readonly<Pick<MissionCardProps, 'id' | 'name' | 'status' | 'owner' | 'slaProgress' | 'slaLabel' | 'slaBreach' | 'onClick' | 'className'>>) {
  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-4 px-4 py-3 w-full text-left bg-white border-b border-black/5 hover:bg-black/[0.02] cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset',
        className
      )}
      onClick={onClick}
      data-mission-id={id}
    >
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground truncate block">{name}</span>
      </div>
      <StatusBadge status={status} className="shrink-0" />
      {owner && (
        <span className="text-xs text-muted-foreground shrink-0 w-24 truncate">
          {owner}
        </span>
      )}
      {slaProgress !== undefined && (
        <SLAProgressRing
          progress={slaProgress}
          label={slaLabel}
          breached={slaBreach}
          size={24}
          strokeWidth={2}
          showPulse={false}
        />
      )}
    </button>
  )
}

export default MissionCard
