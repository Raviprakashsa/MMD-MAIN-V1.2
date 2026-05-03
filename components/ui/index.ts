/**
 * UI Components Index
 * ===================
 * Centralized exports for all UI components following the
 * MagnusCopo Design System v2.0
 * 
 * Design Philosophy:
 * - "Cognitive Load is the enemy"
 * - "Scanning beats reading"
 * - "Make actions reversible"
 * - "Dense UI but visually calm"
 */

// Core UI Components
export { default as Button } from './Button'
export { Input } from './Input'
export { Modal } from './Modal'
export { Combobox } from './Combobox'
export type { ComboboxOption } from './Combobox'
export { SkeletonCard, SkeletonTable, SkeletonChart, SkeletonKPIGrid } from './Skeleton'
export { EmptyState } from './EmptyState'

// Card Components
export { GlassCard, LightCard, MissionCardWrapper } from './GlassCard'
export { default as InteractiveCard } from './InteractiveCard'

// Status & Badge Components
export { default as StatusBadge, ActiveBadge, PendingBadge, VIPBadge as VIPStatusBadge, UrgentBadge } from './StatusBadge'
export { LiveBadge } from './LiveBadge'

// Staffing-Specific Components
export { MissionCard, MissionCardCompact } from './MissionCard'
export type { MissionCardProps, QuickAction } from './MissionCard'
export { SLAProgressRing } from './SLAProgressRing'
export type { SLAProgressRingProps } from './SLAProgressRing'

// Toast & Notification Components
export { ToastProvider, useToast } from './Toast'
export { CopyToast } from './CopyToast'
export { UndoToastProvider, useUndoToast, SuccessToast } from './UndoToast'

// Interactive Components
export { default as InteractiveButton } from './InteractiveButton'
export { default as InteractiveTableRow } from './InteractiveTableRow'
export { default as AnimatedIcon, CountUp } from './AnimatedIcon'
