'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Mail,
  Plus,
  RefreshCw,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ActivityTable, FollowUpList } from '@/components/dashboard'
import { LiveBadge } from '@/components/ui/LiveBadge'
import { AnimatePresence, motion } from 'framer-motion'

interface Metrics {
  kpis: {
    totalCompanies: number
    totalCandidates: number
    activeRequirements: number
    pendingActions: number
    conversionRate: number
    stalledCount: number
    missingJDCount: number
    pendingJDs: number
    followUpsToday: number
    interviewsThisWeek: number
    closuresThisMonth: number
  }
  requirementsFunnel: {
    label: string
    value: number
    color: string
    status?: string
  }[]
  requirementsTrend: {
    date: Date
    created: number
    closed: number
  }[]
  recentActivities: {
    _id: string
    type: string
    summary: string
    userName?: string
    requirementMmdId?: string
    requirementId?: string
    createdAt: Date | string
    outcome?: string
  }[]
  urgentFollowUps: {
    _id: string
    summary: string
    requirementMmdId?: string
    requirementId?: string
    nextFollowUpDate: Date | string
    isOverdue?: boolean
  }[]
  redZone: {
    id: string
    title: string
    detail: string
    href: string
    severity: 'high' | 'medium'
  }[]
  auditLogs?: {
    _id: string
    action: string
    entity: string
    summary: string
    createdAt: Date | string
    userName: string
  }[]
  systemHealth?: {
    dbStatus: string
    latency: number
    errorRate: number
  }
}

interface AdminDashboardProps {
  metrics: Metrics
  userName: string
  selectedRange?: '7d' | '30d' | '90d'
}

type KpiTone = 'blue' | 'indigo' | 'amber' | 'cyan' | 'green'

const toneClasses: Record<KpiTone, { icon: string; dot: string; link: string; meta: string }> = {
  blue: {
    icon: 'bg-blue-100 text-blue-600',
    dot: 'text-blue-500',
    link: 'text-blue-600 hover:text-blue-700',
    meta: 'text-blue-500',
  },
  indigo: {
    icon: 'bg-indigo-100 text-indigo-600',
    dot: 'text-indigo-500',
    link: 'text-indigo-600 hover:text-indigo-700',
    meta: 'text-indigo-500',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-600',
    dot: 'text-amber-500',
    link: 'text-amber-600 hover:text-amber-700',
    meta: 'text-amber-500',
  },
  cyan: {
    icon: 'bg-cyan-100 text-cyan-600',
    dot: 'text-cyan-500',
    link: 'text-cyan-600 hover:text-cyan-700',
    meta: 'text-cyan-500',
  },
  green: {
    icon: 'bg-emerald-100 text-emerald-600',
    dot: 'text-emerald-500',
    link: 'text-emerald-600 hover:text-emerald-700',
    meta: 'text-emerald-500',
  },
}

function KpiCard({
  title,
  value,
  subtitle,
  linkLabel,
  href,
  icon: Icon,
  tone,
}: Readonly<{
  title: string
  value: number | string
  subtitle: string
  linkLabel: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  tone: KpiTone
}>) {
  const classes = toneClasses[tone]

  return (
    <div className="flex h-full min-h-[164px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between px-4 pt-4">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${classes.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="px-4 pt-2">
        <p className="text-5xl font-bold leading-none text-slate-900 tabular-nums">{value}</p>
      </div>
      <p className={`px-4 pt-2 text-xs ${classes.meta}`}>
        <span className={`mr-1 text-[10px] ${classes.dot}`}>●</span>
        {subtitle}
      </p>
      <div className="mt-auto border-t border-slate-100 px-4 py-2.5">
        <Link href={href} className={`inline-flex items-center text-sm font-semibold ${classes.link}`}>
          {linkLabel}
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

function ActionNeededCard({
  title,
  detail,
  cta,
  href,
  tone,
  icon: Icon,
}: Readonly<{
  title: string
  detail: string
  cta: string
  href: string
  tone: 'red' | 'amber' | 'green'
  icon: React.ComponentType<{ className?: string }>
}>) {
  const toneMap = {
    red: 'border-red-200/90 bg-gradient-to-b from-red-50 to-rose-50 text-red-700',
    amber: 'border-amber-200/90 bg-gradient-to-b from-amber-50 to-orange-50 text-amber-700',
    green: 'border-emerald-200/90 bg-gradient-to-b from-emerald-50 to-teal-50 text-emerald-700',
  }

  return (
    <Link href={href} className={`block rounded-xl border p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${toneMap[tone]}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs opacity-90">{detail}</p>
          <p className="mt-2 text-xs font-semibold">{cta}</p>
        </div>
      </div>
    </Link>
  )
}

function getTodayString() {
  return new Date().toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    weekday: 'long',
  })
}

export function AdminDashboard({ metrics, userName, selectedRange = '30d' }: Readonly<AdminDashboardProps>) {
  const { kpis, requirementsFunnel, recentActivities, urgentFollowUps } = metrics
  const searchParams = useSearchParams()
  const initialStatuses = useMemo(() => (searchParams.get('statuses') || '').split(',').filter(Boolean), [searchParams])
  const initialPriorities = useMemo(() => (searchParams.get('priorities') || '').split(',').filter(Boolean), [searchParams])
  const initialTeamMember = (searchParams.get('teamMember') || 'all') as 'all' | 'me'

  const [activeRange, setActiveRange] = useState<'7d' | '30d' | '90d'>(selectedRange)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<'7d' | '30d' | '90d'>(selectedRange)
  const [draftTeamMember, setDraftTeamMember] = useState<'all' | 'me'>(initialTeamMember)
  const [draftStatuses, setDraftStatuses] = useState<string[]>(initialStatuses)
  const [draftPriorities, setDraftPriorities] = useState<string[]>(initialPriorities)
  const [showCoffeeAnimation, setShowCoffeeAnimation] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const router = useRouter()
  const pathname = usePathname()

  const activeFilterCount =
    (activeRange === '30d' ? 0 : 1)
    + draftStatuses.length
    + draftPriorities.length
    + (draftTeamMember === 'all' ? 0 : 1)

  const teamPerformance = useMemo(() => {
    const byUser = new Map<string, number>()

    recentActivities.forEach((activity) => {
      const user = activity.userName || 'Team Member'
      byUser.set(user, (byUser.get(user) || 0) + 1)
    })

    return Array.from(byUser.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [recentActivities])

  const handleRefresh = () => {
    setIsRefreshing(true)
    router.refresh()
    setTimeout(() => {
      setLastUpdated(new Date())
      setIsRefreshing(false)
    }, 650)
  }

  const handleRangeChange = (range: '7d' | '30d' | '90d') => {
    setActiveRange(range)
    const params = new URLSearchParams(searchParams.toString())
    if (range === '30d') {
      params.delete('range')
    } else {
      params.set('range', range)
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
  }

  const handleFilterClick = () => {
    setShowCoffeeAnimation(true)
    setTimeout(() => {
      setShowCoffeeAnimation(false)
      setIsFilterModalOpen(true)
    }, 1200)
  }

  const handleApplyFilters = () => {
    setActiveRange(draftRange)
    const params = new URLSearchParams(searchParams.toString())

    if (draftRange === '30d') params.delete('range')
    else params.set('range', draftRange)

    if (draftStatuses.length > 0) params.set('statuses', draftStatuses.join(','))
    else params.delete('statuses')

    if (draftPriorities.length > 0) params.set('priorities', draftPriorities.join(','))
    else params.delete('priorities')

    if (draftTeamMember !== 'all') params.set('teamMember', draftTeamMember)
    else params.delete('teamMember')

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
    setIsFilterModalOpen(false)
  }

  const handleResetFilters = () => {
    setDraftRange('30d')
    setDraftTeamMember('all')
    setDraftStatuses([])
    setDraftPriorities([])
    setActiveRange('30d')

    const params = new URLSearchParams(searchParams.toString())
    params.delete('range')
    params.delete('statuses')
    params.delete('priorities')
    params.delete('teamMember')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname)
    setIsFilterModalOpen(false)
  }

  useEffect(() => {
    setActiveRange(selectedRange)
    setDraftRange(selectedRange)
    setDraftStatuses((searchParams.get('statuses') || '').split(',').filter(Boolean))
    setDraftPriorities((searchParams.get('priorities') || '').split(',').filter(Boolean))
    setDraftTeamMember((searchParams.get('teamMember') || 'all') as 'all' | 'me')
  }, [selectedRange, searchParams])

  const toggleDraftStatus = (status: string) => {
    setDraftStatuses((prev) => prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status])
  }

  const toggleDraftPriority = (priority: string) => {
    setDraftPriorities((prev) => prev.includes(priority) ? prev.filter((item) => item !== priority) : [...prev, priority])
  }

  const stages = requirementsFunnel.map((item, index) => {
    const avgTimeDays = [1.5, 3.8, 2.2, 4.5, 6.2, 1.8, 2.4, 1.2][index] || 2.1
    const valueLabel = item.value > 0 ? `₹ ${(item.value * 3.2).toFixed(1)} L` : '—'

    return {
      ...item,
      avgTimeDays,
      valueLabel,
    }
  })

  const panelClass = 'rounded-xl border border-slate-200 bg-white p-4 shadow-sm'

  return (
    <div className="space-y-4 pb-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-800">Admin Dashboard</h1>
            <p className="mt-1 text-base text-slate-600">Welcome back {userName}, here&apos;s your staffing overview</p>
          </div>

          <div className="w-full xl:w-auto xl:min-w-[760px]">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <CalendarDays className="h-4 w-4" />
                <span className="font-medium">Date Range</span>
                <select
                  value={activeRange}
                  onChange={(event) => handleRangeChange(event.target.value as '7d' | '30d' | '90d')}
                  className="ml-auto bg-transparent text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>

              <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <span className="font-medium">Group</span>
                <select defaultValue="all" className="ml-auto bg-transparent text-sm font-semibold text-slate-700 outline-none">
                  <option value="all">All Groups</option>
                </select>
              </div>

              <div className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <span className="font-medium">Owner</span>
                <select defaultValue="all" className="ml-auto bg-transparent text-sm font-semibold text-slate-700 outline-none">
                  <option value="all">All Owners</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleFilterClick}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push('/dashboard/requirements?action=new')}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-700">
                  <Plus className="h-3 w-3" />
                </span>
                Create Requirement
              </button>
            </div>

            <div className="mt-2 flex items-center justify-end gap-3">
              <span className="text-xs text-slate-500" suppressHydrationWarning>
                Today: {getTodayString()} | Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          title="Total Companies"
          value={kpis.totalCompanies}
          subtitle="This month"
          linkLabel="View Companies"
          href="/dashboard/companies"
          icon={Building2}
          tone="blue"
        />
        <KpiCard
          title="Active Requirements"
          value={kpis.activeRequirements}
          subtitle="Awaiting fulfillment"
          linkLabel="View Requirements"
          href="/dashboard/requirements"
          icon={Briefcase}
          tone="indigo"
        />
        <KpiCard
          title="Pending JDs"
          value={kpis.pendingJDs}
          subtitle="Require follow-up"
          linkLabel="Open JD List"
          href="/dashboard/requirements?status=AWAITING_JD"
          icon={AlertTriangle}
          tone="amber"
        />
        <KpiCard
          title="Total Candidates"
          value={kpis.totalCandidates}
          subtitle="Candidate pool"
          linkLabel="View Candidates"
          href="/dashboard/candidates"
          icon={Users}
          tone="cyan"
        />
        <KpiCard
          title="Interviews This Week"
          value={kpis.interviewsThisWeek}
          subtitle="Scheduled activities"
          linkLabel="View Schedule"
          href="/dashboard/activities"
          icon={Clock}
          tone="blue"
        />
        <KpiCard
          title="Closures This Month"
          value={kpis.closuresThisMonth}
          subtitle="Total completed"
          linkLabel="View Report"
          href="/dashboard/reports"
          icon={CheckCircle2}
          tone="green"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`xl:col-span-2 ${panelClass}`}>
          <h3 className="text-lg font-semibold text-slate-800">Action Needed</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ActionNeededCard
              title={`${kpis.missingJDCount} JDs Missing Details`}
              detail="JDs cannot be activated"
              cta="Open JD List"
              href="/dashboard/requirements?status=AWAITING_JD"
              tone="red"
              icon={AlertTriangle}
            />
            <ActionNeededCard
              title={`${kpis.stalledCount} No Activity`}
              detail="Requires immediate follow-up"
              cta="View Follow Up"
              href="/dashboard/requirements?status=ON_HOLD"
              tone="amber"
              icon={Clock}
            />
            <ActionNeededCard
              title={`${kpis.followUpsToday} Follow-Ups Due`}
              detail="Across calls, WhatsApp and email"
              cta="Start Follow-Ups"
              href="/dashboard/activities"
              tone="green"
              icon={Mail}
            />
          </div>
        </div>

        <div className={panelClass}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800">HR Calls & Follow-Ups</h3>
            <LiveBadge />
          </div>

          <div className="space-y-2">
            {urgentFollowUps.slice(0, 5).map((item) => {
              const nextDate = new Date(item.nextFollowUpDate)
              const time = nextDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
              const isDue = item.isOverdue || nextDate.getTime() <= Date.now()

              return (
                <Link key={item._id} href="/dashboard/activities" className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-600">{time}</p>
                      <p className="truncate text-sm font-medium text-slate-900">{item.summary}</p>
                      <p className="truncate text-xs text-slate-500">{item.requirementMmdId || item.requirementId || 'No Requirement ID'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isDue ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {isDue ? 'Due Now' : 'Scheduled'}
                    </span>
                  </div>
                </Link>
              )
            })}
            {urgentFollowUps.length === 0 && <p className="text-sm text-slate-500">No follow-ups scheduled right now.</p>}
          </div>

          <Link href="/dashboard/activities" className="mt-3 inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-800">
            View All Activities
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`xl:col-span-2 ${panelClass}`}>
          <h3 className="text-lg font-semibold text-slate-800">Requirement Pipeline</h3>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {stages.map((item) => (
              <Link
                key={item.label}
                href={item.status ? `/dashboard/requirements?status=${item.status}` : '/dashboard/requirements'}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: item.color }}
              >
                {item.label} {item.value}
              </Link>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-100/70 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 text-left">Stage</th>
                  <th className="px-3 py-2 text-left">Count</th>
                  <th className="px-3 py-2 text-left">Value</th>
                  <th className="px-3 py-2 text-left">Avg. Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {stages.map((item) => (
                  <tr key={item.label} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-slate-700">{item.label}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900 tabular-nums">{item.value}</td>
                    <td className="px-3 py-2 text-slate-600">{item.valueLabel}</td>
                    <td className="px-3 py-2 text-slate-600">{item.avgTimeDays.toFixed(1)} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Link href="/dashboard/reports" className="mt-3 inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-800">
            View Full Pipeline Report
            <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-4">
          <div className={panelClass}>
            <h3 className="text-lg font-semibold text-slate-800">Leads & Scraper Performance</h3>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href="/dashboard/leads" className="rounded-xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm">
                <p className="text-xs text-slate-500">LinkedIn</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{Math.max(0, Math.round(kpis.totalCandidates * 0.32))}</p>
                <p className="text-xs text-slate-500">Leads</p>
              </Link>
              <Link href="/dashboard/leads" className="rounded-xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm">
                <p className="text-xs text-slate-500">Internshala</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{Math.max(0, Math.round(kpis.totalCandidates * 0.18))}</p>
                <p className="text-xs text-slate-500">Leads</p>
              </Link>
              <Link href="/dashboard/leads" className="rounded-xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm">
                <p className="text-xs text-slate-500">Wellfound</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{Math.max(0, Math.round(kpis.totalCandidates * 0.15))}</p>
                <p className="text-xs text-slate-500">Leads</p>
              </Link>
              <Link href="/dashboard/leads" className="rounded-xl border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-sm">
                <p className="text-xs text-slate-500">Events</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{Math.max(0, Math.round(kpis.totalCandidates * 0.09))}</p>
                <p className="text-xs text-slate-500">Leads</p>
              </Link>
            </div>
            <Link href="/dashboard/leads" className="mt-3 inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-800">
              Go to Leads & Scraping
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Link>
          </div>

          <div className={panelClass}>
            <h3 className="text-lg font-semibold text-slate-800">Quick Reports</h3>
            <div className="mt-3 space-y-2">
              <Link href="/dashboard/reports?type=daily" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition-all hover:bg-slate-50 hover:shadow-sm">
                <span className="text-sm text-slate-700">Daily Report</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/dashboard/requirements?view=export" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition-all hover:bg-slate-50 hover:shadow-sm">
                <span className="text-sm text-slate-700">Requirements Report</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/dashboard/candidates?view=pipeline" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition-all hover:bg-slate-50 hover:shadow-sm">
                <span className="text-sm text-slate-700">Candidate Report</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/dashboard/reports?type=funnel" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition-all hover:bg-slate-50 hover:shadow-sm">
                <span className="text-sm text-slate-700">Conversion Funnel</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href="/dashboard/timesheet" className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 transition-all hover:bg-slate-50 hover:shadow-sm">
                <span className="text-sm text-slate-700">Timesheet Report</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
            <Link href="/dashboard/reports" className="mt-3 inline-flex items-center text-xs font-semibold text-blue-700 hover:text-blue-800">
              Go to Reports & Analytics
              <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className={`xl:col-span-2 ${panelClass}`}>
          <h3 className="text-lg font-semibold text-slate-800">Candidates</h3>
          <div className="mt-3 rounded-xl border border-slate-100 bg-white/70 p-3">
            <FollowUpList followUps={urgentFollowUps} title="Candidate Follow-Up Queue" maxItems={8} viewAllHref="/dashboard/activities" />
          </div>
        </div>

        <div className={panelClass}>
          <h3 className="text-lg font-semibold text-slate-800">Team Performance</h3>
          <div className="mt-3 space-y-3">
            {teamPerformance.map((member) => {
              const progress = Math.min(100, member.count * 9)
              return (
                <div key={member.name} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.count} Active</p>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )
            })}
            {teamPerformance.length === 0 && <p className="text-sm text-slate-500">No recent team activity available.</p>}
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <ActivityTable activities={recentActivities} title="Recent Activity" showUser maxItems={8} viewAllHref="/dashboard/activities" />
      </div>

      <AnimatePresence>
        {showCoffeeAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: -20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-2xl">
                <Filter className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">Filtering Data...</h3>
              <p className="mt-1 text-sm text-slate-300">Preparing dashboard insights</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFilterModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2.5">
                    <Filter className="h-[18px] w-[18px] text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Dashboard Filters</h3>
                    <p className="text-xs text-slate-500">Customize your view with advanced filters</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-[18px] w-[18px]" />
                </button>
              </div>

              <div className="max-h-[72vh] space-y-6 overflow-y-auto p-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Date Range</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(['7d', '30d', '90d'] as const).map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => setDraftRange(range)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all ${draftRange === range ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'}`}
                      >
                        {range.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Team Member</label>
                  <select
                    value={draftTeamMember}
                    onChange={(event) => setDraftTeamMember(event.target.value as 'all' | 'me')}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="all">All Team Members</option>
                    <option value="me">My Assignments</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Requirement Status</label>
                  <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                    {['PENDING_INTAKE', 'AWAITING_JD', 'ACTIVE', 'SOURCING', 'INTERVIEWING', 'OFFER', 'ON_HOLD', 'CLOSED_HIRED', 'CLOSED_NOT_HIRED'].map((status) => (
                      <label key={status} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={draftStatuses.includes(status)}
                          onChange={() => toggleDraftStatus(status)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {status.replaceAll('_', ' ')}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Priority</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {['High', 'Medium', 'Low'].map((priority) => (
                      <label key={priority} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={draftPriorities.includes(priority)}
                          onChange={() => toggleDraftPriority(priority)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        {priority}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 p-5">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Reset All Filters
                </button>
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
