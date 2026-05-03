'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Users,
  Building2,
  FileText,
  Activity,
  Clock,
  AlertTriangle,
  Archive,
  ChevronRight,
  RefreshCw,
  Loader2,
  Download,
  Filter,
  CalendarClock,
  Siren,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAuditLogs, getAuditActions, getAuditEntities } from '@/lib/actions/module16-audit'
import { getUsers } from '@/lib/actions/module1-auth'
import { getCompanies } from '@/lib/actions/module3-company'
import { useToast } from '@/components/ui/Toast'
import { SearchInput } from '@/components/ui/Input'

interface AuditEntry {
  _id: string
  action: string
  entity: string
  entityId: string
  userId: string
  userName?: string
  createdAt: string
}

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalCompanies: number
  recentActions: number
}

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const toast = useToast()
  const isPrivilegedRole = session?.user?.role ? ['SUPER_ADMIN', 'ADMIN'].includes(session.user.role) : false

  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalCompanies: 0,
    recentActions: 0,
  })
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [auditLoading, setAuditLoading] = useState(false)
  const [actions, setActions] = useState<string[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    if (session && session.user && !isPrivilegedRole) {
      router.push('/dashboard')
    }
  }, [session, router, isPrivilegedRole])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [usersRes, companiesRes, logsRes, actionsRes, entitiesRes] = await Promise.all([
        getUsers({}),
        getCompanies({}),
        getAuditLogs({}),
        getAuditActions({}),
        getAuditEntities({}),
      ])

      const usersList = (usersRes?.data as unknown as any[]) || []
      const companiesList = (companiesRes?.data as unknown as any[]) || []
      const logsData = logsRes?.data as unknown as any
      const logsList = Array.isArray(logsData) ? logsData : (logsData?.logs || [])

      setStats({
        totalUsers: usersList.length,
        activeUsers: usersList.filter((u: any) => u.isActive).length,
        totalCompanies: companiesList.length,
        recentActions: logsList.length,
      })

      setAuditLogs(logsList.slice(0, 20).map((l: any) => ({
        _id: l._id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        userId: l.userId,
        userName: l.userName || l.userId,
        createdAt: l.createdAt,
      })))

      setActions((actionsRes?.data as string[]) || [])
      setEntities((entitiesRes?.data as string[]) || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Admin data fetch error:', err)
      toast.error('Error', 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (session?.user && isPrivilegedRole) {
      fetchData()
    }
  }, [session, fetchData, isPrivilegedRole])

  const fetchFilteredLogs = useCallback(async () => {
    setAuditLoading(true)
    try {
      const filters: Record<string, string> = {}
      if (actionFilter) filters.action = actionFilter
      if (entityFilter) filters.entity = entityFilter
      const res = await getAuditLogs(filters)
      const resData = res?.data as unknown as any
      const logsList = Array.isArray(resData) ? resData : (resData?.logs || [])
      setAuditLogs(logsList.slice(0, 50).map((l: any) => ({
        _id: l._id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        userId: l.userId,
        userName: l.userName || l.userId,
        createdAt: l.createdAt,
      })))
    } catch {
      toast.error('Error', 'Failed to filter logs')
    } finally {
      setAuditLoading(false)
    }
  }, [actionFilter, entityFilter, toast])

  useEffect(() => {
    if (!loading) {
      fetchFilteredLogs()
    }
  }, [actionFilter, entityFilter, fetchFilteredLogs, loading])

  const filteredLogs = searchQuery
    ? auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.userName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : auditLogs

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-blue-600', link: '/dashboard/users' },
    { label: 'Active Users', value: stats.activeUsers, icon: Activity, color: 'from-emerald-500 to-emerald-600', link: '/dashboard/users' },
    { label: 'Companies', value: stats.totalCompanies, icon: Building2, color: 'from-violet-500 to-violet-600', link: '/dashboard/companies' },
    { label: 'Audit Events', value: stats.recentActions, icon: FileText, color: 'from-amber-500 to-amber-600', link: '#audit' },
  ]

  const alertCards = [
    {
      id: 'active-users-low',
      title: 'Active user coverage',
      detail: stats.totalUsers === 0 ? 'No users found' : `${stats.activeUsers}/${stats.totalUsers} users active`,
      severity: stats.totalUsers > 0 && stats.activeUsers / Math.max(stats.totalUsers, 1) < 0.7 ? 'high' : 'medium',
      action: () => router.push('/dashboard/users'),
      actionLabel: 'Review users',
    },
    {
      id: 'audit-surge',
      title: 'Audit activity monitor',
      detail: `${auditLogs.length} recent events loaded`,
      severity: auditLogs.length > 35 ? 'high' : 'medium',
      action: () => document.getElementById('audit')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      actionLabel: 'Open audit log',
    },
    {
      id: 'company-reach',
      title: 'Company network',
      detail: `${stats.totalCompanies} companies under management`,
      severity: stats.totalCompanies < 5 ? 'high' : 'medium',
      action: () => router.push('/dashboard/companies'),
      actionLabel: 'Open companies',
    },
  ]

  const handleExport = () => {
    const rows = [
      ['action', 'entity', 'entityId', 'userName', 'createdAt'],
      ...filteredLogs.map((log) => [
        log.action,
        log.entity,
        log.entityId,
        log.userName || '',
        log.createdAt,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `admin-audit-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Export ready', 'Audit CSV downloaded')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  const timeRangeLabel = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  }[timeRange]

  return (
    <main className="space-y-6 pb-6" aria-label="Admin dashboard">
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/70 p-6 lg:p-7">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-indigo-100/50 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-cyan-100/40 blur-3xl" aria-hidden="true" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-600">
              <Shield className="h-3.5 w-3.5 text-indigo-600" />
              Admin command center
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 lg:text-3xl">Admin Dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 lg:text-base">
                Monitor platform operations, audit activity, and governance workflows from one operational view.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col items-start gap-3 sm:w-auto sm:items-end">
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh data
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export logs
              </button>
            </div>
            <p className="text-xs text-slate-500" suppressHydrationWarning>
              Updated {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </section>

      {/* Control strip */}
      <section className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Time Window</span>
            <div className="flex items-center gap-1 p-1 rounded-lg border border-slate-200 bg-slate-50">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                    timeRange === range
                      ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
            <span className="hidden text-xs text-slate-500 sm:inline">{timeRangeLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActionFilter('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50"
            >
              <Filter className="h-3.5 w-3.5" />
              Clear filters
            </button>
          </div>
        </div>
      </section>

      {/* Alert zone */}
      <section className="rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Siren className="h-5 w-5 text-rose-600" />
          <h2 className="text-base font-semibold text-slate-900">Admin Alert Zone</h2>
          <span className="text-xs font-medium text-rose-600">{alertCards.length} monitors</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {alertCards.map((item) => (
            <div key={item.id} className="rounded-lg border border-rose-200/70 bg-white p-3.5 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.detail}</p>
                </div>
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase',
                  item.severity === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {item.severity}
                </span>
              </div>
              <button
                type="button"
                onClick={item.action}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                {item.actionLabel}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="System metrics">
        {statCards.map((card) => (
          <div
            key={card.label}
            onClick={() => card.link !== '#audit' && router.push(card.link)}
            className={cn(
              'relative overflow-hidden rounded-xl bg-white border border-slate-200 p-5 transition-all hover:-translate-y-0.5 hover:shadow-md',
              card.link !== '#audit' && 'cursor-pointer'
            )}
          >
            <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', card.color)} aria-hidden="true" />
            <div className="flex items-center justify-between mb-3">
              <div className={cn('p-2 rounded-lg bg-slate-100 text-slate-700')}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
              {card.link !== '#audit' && <ChevronRight className="h-4 w-4 text-slate-400" />}
            </div>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
            <p className="text-sm text-slate-500">{card.label}</p>
          </div>
        ))}
      </section>

      {/* Quick Links */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-4.5 w-4.5 text-slate-600" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-600">Operational Shortcuts</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          onClick={() => router.push('/dashboard/users')}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors text-left"
        >
          <Users className="h-5 w-5 text-indigo-500" />
          <div>
            <p className="font-medium text-slate-900">User Management</p>
            <p className="text-xs text-slate-500">Add, edit, deactivate users</p>
          </div>
        </button>
        <button
          onClick={() => router.push('/dashboard/integrations')}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors text-left"
        >
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <div>
            <p className="font-medium text-slate-900">Integrations</p>
            <p className="text-xs text-slate-500">Manage connections & webhooks</p>
          </div>
        </button>
        <button
          onClick={() => router.push('/dashboard/reports')}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors text-left"
        >
          <FileText className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="font-medium text-slate-900">Reports</p>
            <p className="text-xs text-slate-500">Generate & schedule reports</p>
          </div>
        </button>
        <button
          onClick={() => router.push('/dashboard/admin/archive')}
          className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors text-left"
        >
          <Archive className="h-5 w-5 text-rose-500" />
          <div>
            <p className="font-medium text-slate-900">Archive Management</p>
            <p className="text-xs text-slate-500">Restore soft-deleted records</p>
          </div>
        </button>
        </div>
      </section>

      {/* Quick snapshots */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-900">Activity Snapshot ({timeRange.toUpperCase()})</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'User activity', value: stats.activeUsers, max: Math.max(stats.totalUsers, 1) },
              { label: 'Company coverage', value: stats.totalCompanies, max: Math.max(stats.totalCompanies + 5, 10) },
              { label: 'Audit volume', value: stats.recentActions, max: Math.max(stats.recentActions + 10, 20) },
            ].map((item) => {
              const percent = Math.min(100, Math.round((item.value / item.max) * 100))
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600">{item.label}</span>
                    <span className="text-xs font-semibold text-slate-700">{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Fast Filters</h3>
          <div className="flex flex-wrap gap-2">
            {actions.slice(0, 6).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setActionFilter(a)}
                className={cn(
                  'px-2.5 py-1.5 rounded-full text-xs border transition-colors',
                  actionFilter === a
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300'
                )}
              >
                {a.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Audit Logs */}
      <section id="audit" className="bg-white rounded-xl border border-slate-200" aria-label="Audit logs">
        <div className="p-5 border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-slate-400" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Audit Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">Search and filter admin events across entities and actions.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-48">
                <SearchInput
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700"
              >
                <option value="">All Actions</option>
                {actions.map((a) => (
                  <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700"
              >
                <option value="">All Entities</option>
                {entities.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto">
          {auditLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No audit logs found</div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log._id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {log.action.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {log.entity} &bull; by {log.userName} &bull; {formatDate(log.createdAt)}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {log.entity}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
