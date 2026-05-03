'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Database, Zap, Target } from 'lucide-react'
import { CreateLeadModal } from '@/components/leads/CreateLeadModal'

interface ScraperDashboardProps {
  userName: string
  metrics?: {
    total: number
    avgConfidence: number
    avgDaysToContact: number
    byStatus: Record<string, number>
    conversionRate: number
  }
}

export function ScraperDashboard({ userName, metrics }: Readonly<ScraperDashboardProps>) {
  const router = useRouter()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  return (
    <div className="space-y-8 text-[var(--foreground)] relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-gradient-to-b from-indigo-500/10 to-transparent rounded-full blur-3xl opacity-50" />

      {/* Hero Header */}
      <div className="flex items-end justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              Scraper Module
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome, {userName}
          </h1>
          <p className="text-lg text-[var(--foreground-muted)] mt-2 font-light">
            Your command center for lead generation and data intelligence.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="group relative inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/30 overflow-hidden hover:scale-105 transition-all duration-300"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="relative h-5 w-5" />
          <span className="relative">Add New Lead</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Database className="h-6 w-6" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">High Activity</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{metrics?.total ?? 0}</h3>
          <p className="text-slate-500 text-sm mt-1">Total Leads in Pipeline</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Target className="h-6 w-6" />
            </div>
            <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">Focus</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{metrics?.avgConfidence ?? 0}%</h3>
          <p className="text-slate-500 text-sm mt-1">Avg. Confidence Score</p>
        </div>

        <div className="p-6 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/20 shadow-xl shadow-indigo-100/50 hover:shadow-2xl hover:shadow-indigo-200/50 transition-all group">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-fuchsia-50 text-fuchsia-600 group-hover:bg-fuchsia-600 group-hover:text-white transition-colors">
              <Zap className="h-6 w-6" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-slate-800">{metrics?.conversionRate?.toFixed(1) ?? '0.0'}%</h3>
          <p className="text-slate-500 text-sm mt-1">Lead Conversion Rate</p>
        </div>
      </div>

      {/* Main Action Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Panel */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold text-slate-700 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/dashboard/leads"
              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:ring-4 hover:ring-indigo-50 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                  <Search className="h-5 w-5" />
                </div>
                <ArrowRightIcon />
              </div>
              <p className="font-bold text-slate-800 text-lg">Lead Board</p>
              <p className="text-slate-500 text-sm">Access full database</p>
            </Link>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="p-5 w-full text-left rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:ring-4 hover:ring-emerald-50 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-110 transition-transform">
                  <Plus className="h-5 w-5" />
                </div>
                <ArrowRightIcon />
              </div>
              <p className="font-bold text-slate-800 text-lg">Add Lead</p>
              <p className="text-slate-500 text-sm">Manual entry form</p>
            </button>
          </div>
        </div>

        {/* Guidelines Panel */}
        <div className="p-6 rounded-2xl bg-slate-900 text-slate-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 blur-[60px] opacity-20" />
          <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Entry Guidelines
          </h3>
          <ul className="space-y-4 text-sm relative z-10">
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
              <span>Verify contact info via LinkedIn before submission.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
              <span>Include company sector for better categorization.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2" />
              <span>Set confidence score honestly based on data quality.</span>
            </li>
          </ul>
        </div>
      </div>

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          router.refresh()
        }}
      />
    </div>
  )
}

function ArrowRightIcon() {
  return (
    <svg className="w-5 h-5 text-slate-300 -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
}

