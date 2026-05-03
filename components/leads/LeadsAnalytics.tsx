'use client'

import { useMemo } from 'react'
import { Activity, Clock, TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { Lead, LeadMetrics } from '@/types/leads'

interface LeadsAnalyticsProps {
  readonly leads: Lead[]
  readonly metrics?: LeadMetrics
}

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3b82f6',
  CONTACTED: '#8b5cf6',
  QUALIFIED: '#6366f1',
  FOLLOW_UP: '#f97316',
  CONVERTED: '#10b981',
  REJECTED: '#ef4444',
  STALLED: '#f59e0b',
}

const SOURCE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899']

export function LeadsAnalytics({ leads, metrics }: LeadsAnalyticsProps) {
  const avgDaysToContact = metrics?.avgDaysToContact ?? 0
  const avgDaysToConvert = metrics?.avgDaysToConvert ?? 0

  const analytics = useMemo(() => {
    const total = leads.length

    const statusData = [
      { key: 'NEW', label: 'New', color: STATUS_COLORS.NEW, count: leads.filter(l => l.status === 'NEW').length },
      { key: 'CONTACTED', label: 'Contacted', color: STATUS_COLORS.CONTACTED, count: leads.filter(l => l.status === 'CONTACTED').length },
      { key: 'QUALIFIED', label: 'Qualified', color: STATUS_COLORS.QUALIFIED, count: leads.filter(l => l.status === 'QUALIFIED').length },
      { key: 'FOLLOW_UP', label: 'Follow-up', color: STATUS_COLORS.FOLLOW_UP, count: leads.filter(l => l.status === 'FOLLOW_UP').length },
      { key: 'CONVERTED', label: 'Converted', color: STATUS_COLORS.CONVERTED, count: leads.filter(l => l.status === 'CONVERTED').length },
      { key: 'REJECTED', label: 'Rejected', color: STATUS_COLORS.REJECTED, count: leads.filter(l => l.status === 'REJECTED').length },
      { key: 'STALLED', label: 'Stalled', color: STATUS_COLORS.STALLED, count: leads.filter(l => l.status === 'STALLED').length },
    ]

    const sourceMap = new Map<string, number>()
    leads.forEach(lead => {
      sourceMap.set(lead.sourcePlatform, (sourceMap.get(lead.sourcePlatform) || 0) + 1)
    })
    const sourceData = Array.from(sourceMap.entries()).map(([name, value]) => ({ name, value }))

    const contactedStatuses = new Set<Lead['status']>(['CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED'])
    const followUpStatuses = new Set<Lead['status']>(['QUALIFIED', 'FOLLOW_UP', 'CONVERTED'])

    const contacted = leads.filter(l => contactedStatuses.has(l.status)).length
    const qualified = leads.filter(l => followUpStatuses.has(l.status)).length
    const converted = leads.filter(l => l.status === 'CONVERTED').length
    const activeFollowUps = leads.filter(l => l.status === 'FOLLOW_UP').length
    const followUpsDue = leads.filter(l => {
      if (!l.followUpDate) return false
      const followUpDate = new Date(l.followUpDate)
      return followUpDate <= new Date() && l.status !== 'CONVERTED'
    }).length

    return {
      total,
      statusData,
      sourceData,
      funnel: { total, contacted, qualified, converted },
      perf: {
        avgDaysToContact,
        avgDaysToConvert,
        activeFollowUps,
        followUpsDue,
      },
    }
  }, [leads, avgDaysToContact, avgDaysToConvert])

  if (analytics.total === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-gray-500">Analytics will appear once leads are added.</p>
      </div>
    )
  }

  const funnelSteps = [
    { key: 'total', label: 'Total Leads', color: '#2563eb', value: analytics.funnel.total },
    { key: 'contacted', label: 'Contacted', color: '#7c3aed', value: analytics.funnel.contacted },
    { key: 'qualified', label: 'In Follow-up', color: '#f97316', value: analytics.funnel.qualified },
    { key: 'converted', label: 'Converted', color: '#10b981', value: analytics.funnel.converted },
  ]

  const perfCards = [
    {
      label: 'Avg Days to Contact',
      value: analytics.perf.avgDaysToContact ? analytics.perf.avgDaysToContact.toFixed(1) : '—',
      icon: <Clock className="h-6 w-6 text-white" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      accent: 'bg-blue-600',
      text: 'text-blue-700',
    },
    {
      label: 'Avg Days to Convert',
      value: analytics.perf.avgDaysToConvert ? analytics.perf.avgDaysToConvert.toFixed(1) : '—',
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      bg: 'bg-green-50',
      border: 'border-green-100',
      accent: 'bg-green-600',
      text: 'text-green-700',
    },
    {
      label: 'Active Follow-ups',
      value: analytics.perf.activeFollowUps.toString(),
      icon: <Activity className="h-6 w-6 text-white" />,
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      accent: 'bg-purple-600',
      text: 'text-purple-700',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Lead Status Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.statusData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(148, 163, 184, 0.2)' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {analytics.statusData.map(entry => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Leads by Source Platform</h3>
          {analytics.sourceData.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-gray-500">No source data yet</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.sourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4}>
                    {analytics.sourceData.map((entry) => (
                      <Cell key={`source-${entry.name}`} fill={SOURCE_COLORS[analytics.sourceData.indexOf(entry) % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {analytics.sourceData.map((item, index) => (
              <div key={item.name} className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} />
                {item.name}
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Conversion Funnel</h3>
          <div className="space-y-5">
            {funnelSteps.map(step => (
              <div key={step.key}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">{step.label}</span>
                  <span className={step.key === 'converted' ? 'font-semibold text-green-700' : 'font-semibold text-gray-900'}>{step.value}</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: analytics.funnel.total ? `${(step.value / analytics.funnel.total) * 100}%` : '0%',
                      backgroundColor: step.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Performance Metrics</h3>
          <div className="space-y-4">
            {perfCards.map(card => (
              <div key={card.label} className={`flex items-center justify-between rounded-xl border p-4 ${card.bg} ${card.border}`}>
                <div>
                  <p className={`text-sm font-medium ${card.text}`}>{card.label}</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`rounded-xl p-3 ${card.accent}`}>{card.icon}</div>
              </div>
            ))}
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-sm text-orange-800">
              <p className="font-semibold">Follow-ups Due</p>
              <p className="text-2xl font-bold text-orange-900">{analytics.perf.followUpsDue}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
