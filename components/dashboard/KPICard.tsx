"use client";

import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { GlassCard, LightCard } from '@/components/ui/GlassCard'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

/**
 * KPICard - Key Performance Indicator Display
 * ===========================================
 * Design Philosophy: "Dense UI but visually calm"
 * 
 * Features:
 * - MagnusCopo brand color palette
 * - Premium hover effects
 * - Trend indicators with semantic colors
 * - Animated progress bar for visual engagement
 */

interface KPICardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive?: boolean
  }
  color?: 'primary' | 'success' | 'warning' | 'accent' | 'destructive' | 'gold' | 'coral'
  subtitle?: string
  href?: string
  lightMode?: boolean
  className?: string
}

// MagnusCopo Brand Color Map
const colorMap = {
  primary: {
    iconBg: 'bg-brand-100',
    iconColor: 'text-brand-700',
    glow: 'group-hover:shadow-glow-primary',
    accent: 'from-brand-700 to-brand-500'
  },
  success: {
    iconBg: 'bg-success-light',
    iconColor: 'text-success',
    glow: 'group-hover:shadow-glow-accent',
    accent: 'from-emerald-500 to-teal-500'
  },
  warning: {
    iconBg: 'bg-warning-light',
    iconColor: 'text-warning',
    glow: 'group-hover:shadow-glow-gold',
    accent: 'from-amber-500 to-orange-500'
  },
  accent: {
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    glow: 'group-hover:shadow-glow-accent',
    accent: 'from-cyan-500 to-blue-500'
  },
  destructive: {
    iconBg: 'bg-destructive-light',
    iconColor: 'text-destructive',
    glow: 'group-hover:shadow-rose-500/20',
    accent: 'from-rose-500 to-pink-500'
  },
  gold: {
    iconBg: 'bg-gold-light',
    iconColor: 'text-gold',
    glow: 'group-hover:shadow-glow-gold',
    accent: 'from-amber-500 to-yellow-500'
  },
  coral: {
    iconBg: 'bg-coral-light',
    iconColor: 'text-coral',
    glow: 'group-hover:shadow-glow-coral',
    accent: 'from-orange-500 to-red-400'
  },
}

function getTrendIcon(value: number) {
  if (value > 0) return TrendingUp
  if (value < 0) return TrendingDown
  return Minus
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'primary', 
  subtitle, 
  href,
  lightMode = true,
  className
}: Readonly<KPICardProps>) {
  const colors = colorMap[color]
  const TrendIcon = trend ? getTrendIcon(trend.value) : null
  const prefersReducedMotion = useReducedMotion()

  const content = (
    <div className="relative group">
      {/* Dynamic Background Glow */}
      {!prefersReducedMotion && (
        <div className={cn(
          "absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-0 transition-opacity duration-slow group-hover:opacity-15 bg-gradient-to-br",
          colors.accent
        )} />
      )}

      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'p-3 rounded-xl border border-black/5',
          colors.iconBg
        )}>
          <Icon className={cn('h-5 w-5', colors.iconColor)} />
        </div>

        {trend && TrendIcon && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border',
              trend.isPositive === false 
                ? 'bg-destructive-light text-destructive border-red-200' 
                : 'bg-success-light text-success border-emerald-200'
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{Math.abs(trend.value)}%</span>
          </motion.div>
        )}
      </div>

      <p className="text-sm font-medium text-muted-foreground mb-1 tracking-wide">{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className={cn(
          "text-3xl font-bold tracking-tight tabular-nums drop-shadow-sm",
          lightMode ? "text-foreground" : "text-white"
        )}>
          {value}
        </h3>
      </div>

      {subtitle && (
        <p className={cn(
          "text-xs mt-2 line-clamp-1",
          lightMode ? "text-muted-foreground" : "text-slate-400"
        )}>
          {subtitle}
        </p>
      )}

      {/* Decorative Progress bar - dopamine micro-reward */}
      {!prefersReducedMotion && (
        <div className="mt-5 h-1 w-full bg-black/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "60%" }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            className={cn("h-full bg-gradient-to-r", colors.accent)}
          />
        </div>
      )}

      <div className={cn(
        "mt-4 flex items-center gap-1.5 text-xs font-medium transition-colors",
        lightMode 
          ? "text-muted-foreground group-hover:text-brand-700" 
          : "text-slate-400 group-hover:text-brand-400"
      )}>
        <span>View Details</span>
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  )

  const CardComponent = lightMode ? LightCard : GlassCard

  if (href) {
    return (
      <Link href={href}>
        <CardComponent variant="interaction" className={cn("h-full", className)}>
          {content}
        </CardComponent>
      </Link>
    )
  }

  return (
    <CardComponent variant="hover" className={cn("h-full", className)}>
      {content}
    </CardComponent>
  )
}

export function KPIGrid({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {children}
    </div>
  )
}
