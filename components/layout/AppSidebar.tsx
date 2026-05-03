'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Building2,
  Briefcase,
  Users,
  Search,
  Clock,
  Activity,
  Mail,
  BarChart3,
  Workflow,
  Thermometer,

  ChevronRight,
  ChevronLeft,
  LogOut,
  CheckCircle2,
  FileText,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Sidebar - Main Navigation Component
 * ====================================
 * Design Philosophy: "Scanning beats reading"
 * 
 * Features:
 * - MagnusCopo brand colors (Deep Indigo #1700ae)
 * - Smooth collapse/expand with premium easing
 * - Active state with brand gradient indicator
 * - Reduced motion support throughout
 */

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR' | 'RECRUITER' | 'SCRAPER'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
}

// Main Navigation Items Configuration - Updated
const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER', 'SCRAPER'],
  },
  {
    label: 'Pipeline Command',
    href: '/dashboard/automation/command-center',
    icon: <Workflow className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER', 'SCRAPER'],
  },
  {
    label: 'Queue Heatmap',
    href: '/dashboard/automation/queue-heatmap',
    icon: <Thermometer className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER', 'SCRAPER'],
  },
  {
    label: 'Companies',
    href: '/dashboard/companies',
    icon: <Building2 className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'],
  },
  {
    label: 'Requirements',
    href: '/dashboard/requirements',
    icon: <Briefcase className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'],
  },
  {
    label: 'Candidates',
    href: '/dashboard/candidates',
    icon: <Users className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'],
  },
  {
    label: 'Leads',
    href: '/dashboard/leads',
    icon: <Search className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'SCRAPER'],
  },
  {
    label: 'Timesheet',
    href: '/dashboard/timesheet',
    icon: <Clock className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER', 'SCRAPER'],
  },
  {
    label: 'Activities',
    href: '/dashboard/activities',
    icon: <Activity className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'],
  },
  {
    label: 'Communications',
    href: '/dashboard/communications',
    icon: <Mail className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'],
  },
  {
    label: 'Templates',
    href: '/dashboard/templates',
    icon: <FileText className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'],
  },
  {
    label: 'Reports',
    href: '/dashboard/reports',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'],
  },
  {
    label: 'Placements',
    href: '/dashboard/placements',
    icon: <CheckCircle2 className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'],
  },
  {
    label: 'Invoices',
    href: '/dashboard/invoices',
    icon: <FileText className="h-5 w-5" />,
    roles: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'],
  },
  {
    label: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings className="h-5 w-5" />,
    roles: ['SUPER_ADMIN'],
  },
]

interface SidebarProps {
  userRole: UserRole
  userName?: string
  onSignOut?: () => void
}

export function Sidebar({ userRole, userName, onSignOut }: Readonly<SidebarProps>) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()

  const filteredItems = navItems.filter((item) => item.roles.includes(userRole))

  useEffect(() => {
    for (const item of filteredItems) {
      router.prefetch(item.href)
    }
  }, [filteredItems, router])

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 64 : 256 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: [0.22, 0.9, 0.33, 1] }}
      className={cn(
        'flex flex-col h-full sticky top-0 shrink-0 border-r bg-gradient-to-b from-white via-white to-[#fafaff] dark:from-slate-900 dark:via-slate-900 dark:to-slate-950',
        'border-r-[rgba(23,0,174,0.06)]',
        'shadow-[6px_0_32px_rgba(23,0,174,0.06),2px_0_8px_rgba(15,23,42,0.04)]',
        'backdrop-blur-xl'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border/50 dark:border-white/10">
        <motion.div
          animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
          className="overflow-hidden"
        >
          <span className="text-lg font-bold tracking-tight whitespace-nowrap">
            <span className="text-foreground">Magnus</span>
            <span className="text-brand-700">Copo</span>
          </span>
        </motion.div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'p-2 rounded-xl transition-all duration-base',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-brand-50 dark:hover:bg-brand-900/20',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-base overflow-hidden',
                collapsed ? 'justify-center' : 'justify-start',
                isActive
                  ? 'bg-brand-50 text-brand-700 shadow-sm dark:bg-brand-900/30 dark:text-brand-400'
                  : 'text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-white/5'
              )}
              title={collapsed ? item.label : undefined}
              onMouseEnter={() => router.prefetch(item.href)}
            >
              {/* Active indicator bar - MagnusCopo brand gradient */}
              <motion.span
                initial={false}
                animate={{
                  opacity: isActive ? 1 : 0,
                  scaleY: isActive ? 1 : 0.5
                }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
                className={cn(
                  'absolute left-0 h-8 w-[3px] rounded-r-full',
                  'bg-gradient-to-b from-brand-700 to-brand-500'
                )}
              />

              {/* Icon container */}
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-base',
                  isActive
                    ? 'text-brand-700 dark:text-brand-400'
                    : 'text-muted-foreground group-hover:text-foreground'
                )}
              >
                {item.icon}
              </span>

              {/* Label with smooth transition */}
              <motion.span
                initial={false}
                animate={{
                  opacity: collapsed ? 0 : 1,
                  x: collapsed ? -8 : 0,
                  width: collapsed ? 0 : 'auto'
                }}
                transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: [0.22, 0.9, 0.33, 1] }}
                className={cn(
                  'font-medium text-sm whitespace-nowrap overflow-hidden',
                  collapsed && 'pointer-events-none'
                )}
              >
                {item.label}
              </motion.span>
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border/50 dark:border-white/10">
        <motion.div
          initial={false}
          animate={{ opacity: collapsed ? 0 : 1, height: collapsed ? 0 : 'auto' }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
          className="overflow-hidden"
        >
          {userName && (
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-foreground truncate">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole.toLowerCase()}</p>
            </div>
          )}
        </motion.div>

        {onSignOut && (
          <button
            onClick={onSignOut}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-base',
              'text-muted-foreground hover:text-destructive hover:bg-destructive-light',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
              collapsed && 'justify-center'
            )}
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
            <motion.span
              initial={false}
              animate={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : 'auto' }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
              className="font-medium overflow-hidden whitespace-nowrap"
            >
              Sign Out
            </motion.span>
          </button>
        )}
      </div>
    </motion.aside>
  )
}

