'use client'

import Link from 'next/link'
import {
  Briefcase,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity
} from 'lucide-react'
import { KPICard, KPIGrid, FunnelChart, ActivityTable, FollowUpList } from '@/components/dashboard'

interface Metrics {
  kpis: {
    totalCompanies: number
    activeRequirements: number
    pendingActions: number
    conversionRate: number
    stalledCount: number
    missingJDCount: number
    followUpsToday: number
  }
  requirementsFunnel: {
    label: string
    value: number
    color: string
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
    requirementTitle?: string
    requirementId?: string
    nextFollowUpDate: Date | string
    isOverdue?: boolean
  }[]
  redZone?: {
    id: string
    title: string
    detail: string
    href: string
    severity: 'high' | 'medium'
  }[]
}

interface CoordinatorDashboardProps {
  metrics: Metrics
  userName: string
}

export function CoordinatorDashboard({ metrics, userName }: Readonly<CoordinatorDashboardProps>) {
  const { kpis, requirementsFunnel, recentActivities, urgentFollowUps, redZone = [] } = metrics

  return (
    <div className="space-y-8 text-[var(--foreground)] relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 -z-10 w-full h-[600px] bg-gradient-to-b from-rose-50/50 to-transparent blur-3xl opacity-60" />

      {/* Hero Header */}
      <div className="flex items-start justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-rose-50 text-rose-700 border border-rose-100">
              Coordinator Control
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Overview for {userName}
          </h1>
          <p className="text-[var(--foreground-muted)] (text-lg font-light mt-2)">
            Monitoring team performance and client health.
          </p>
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl px-6 py-4 text-right shadow-lg shadow-rose-100/50 border border-white/50" suppressHydrationWarning>
          <p className="text-xs font-bold text-rose-600 uppercase tracking-wide mb-1" suppressHydrationWarning>
            {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </p>
          <p className="text-xl font-bold text-slate-800" suppressHydrationWarning>
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <KPIGrid>
        <KPICard
          title="Active Regs"
          value={kpis.activeRequirements}
          icon={Briefcase}
          color="primary"
          className="shadow-lg shadow-blue-500/10"
        />
        <KPICard
          title="Stalled Items"
          value={kpis.stalledCount}
          icon={AlertTriangle}
          color="warning"
          className="shadow-lg shadow-amber-500/10"
        />
        <KPICard
          title="Conversions"
          value={`${kpis.conversionRate}%`}
          icon={TrendingUp}
          color="success"
          className="shadow-lg shadow-emerald-500/10"
        />
        <KPICard
          title="Team Actions"
          value={kpis.followUpsToday}
          icon={Users}
          color="accent"
          className="shadow-lg shadow-violet-500/10"
        />
      </KPIGrid>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
           <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl shadow-slate-100/50">
             <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Pipeline Stages</h3>
             </div>
             <FunnelChart data={requirementsFunnel} title="" />
           </div>

           {/* Client Health Widget (Refined) */}
           <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-white/80 backdrop-blur-xl shadow-xl shadow-rose-100/50 p-6">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-bl-full" />
              
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-4 ring-rose-50/50">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Client Health</h3>
                  <p className="text-sm text-slate-500">Accounts needing attention</p>
                </div>
              </div>

              <div className="space-y-3 relative z-10">
                {redZone.length === 0 ? (
                  <p className="rounded-xl border border-rose-100 bg-white px-4 py-3 text-sm text-slate-600">
                    No urgent client-health alerts right now.
                  </p>
                ) : (
                  redZone.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="flex justify-between items-center bg-white p-4 rounded-xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                        <span className="font-semibold text-slate-700 group-hover:text-rose-600 transition-colors">{item.title}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold">{item.detail}</span>
                    </Link>
                  ))
                )}
              </div>
           </div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl shadow-slate-100/50 h-full">
            <FollowUpList
              followUps={urgentFollowUps}
              title="Team Priority Follow-ups"
              maxItems={8}
              viewAllHref="/dashboard/activities"
            />
        </div>
      </div>
      
      {/* Activity Table */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl shadow-slate-100/50">
       <ActivityTable
         activities={recentActivities}
         title="Recent Team Activity"
         showUser
         maxItems={10}
         viewAllHref="/dashboard/activities"
       />
      </div>
    </div>
  )
}

