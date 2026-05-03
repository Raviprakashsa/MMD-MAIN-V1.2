"use client";

import Link from 'next/link'
import {
  Briefcase,
  Clock,
  ExternalLink,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { KPICard, KPIGrid, FollowUpList } from '@/components/dashboard'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'
import { motion } from 'framer-motion'
import { slideUp, fadeIn } from '@/lib/animations'

function getHoursColor(hours: number): 'success' | 'warning' | 'destructive' {
  if (hours >= 40) return 'success'
  if (hours >= 30) return 'warning'
  return 'destructive'
}

interface RecruiterDashboardProps {
  metrics: {
    kpis: {
      activeRequirements: number
      followUpsToday: number
    }
  }
  recruiterData: {
    myRequirements: {
      _id: string
      mmdId: string
      jobTitle: string
      status: string
    }[]
    myFollowUps: any[]
    totalWeekHours: number
  }
  userName: string
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  SOURCING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  INTERVIEWING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  OFFERED: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

export function RecruiterDashboard({ metrics, recruiterData, userName }: Readonly<RecruiterDashboardProps>) {
  const { myRequirements, myFollowUps, totalWeekHours } = recruiterData
  const { activeRequirements, followUpsToday } = metrics.kpis

  return (
    <div className="space-y-10 pb-20 relative">
      {/* Dynamic Background Element - Sitting on top of NeuroBackground (z-0) */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[100px] rounded-full mix-blend-multiply" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[100px] rounded-full mix-blend-multiply" />
      </div>

      {/* Hero Section */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-8 relative z-10">
        <motion.div variants={slideUp} initial="hidden" animate="visible">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
              Recruiter Console
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-3">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{userName}</span>
            <motion.span
              animate={{ rotate: [0, 20, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: 1 }}
              className="inline-block ml-3"
            >
              👋
            </motion.span>
          </h1>
          <p className="text-slate-500 text-lg max-w-xl">
            You have <span className="text-slate-900 font-medium">{activeRequirements} active requirements</span> and <span className="text-slate-900 font-medium">{followUpsToday} follow-ups</span> scheduled for today.
          </p>
        </motion.div>

        <motion.div variants={fadeIn} initial="hidden" animate="visible" className="flex gap-4">
          <Link
            href="/dashboard/requirements"
            className="group relative inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-900/10"
          >
            <Briefcase className="h-5 w-5" />
            My Jobs
            <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>
      </div>

      {/* KPI Section */}
      <motion.div variants={slideUp}>
        <KPIGrid>
          <KPICard
            title="Active Pipeline"
            value={myRequirements.length}
            icon={Briefcase}
            color="primary"
            subtitle="Current active jobs"
          />
          <KPICard
            title="To-Do Today"
            value={myFollowUps.length}
            icon={CheckCircle2}
            color="accent"
            subtitle="Follow-ups pending"
          />
          <KPICard
            title="Work Intensity"
            value={`${totalWeekHours.toFixed(1)}h`}
            icon={Clock}
            color={getHoursColor(totalWeekHours)}
            subtitle={totalWeekHours >= 40 ? 'Target met' : `${(40 - totalWeekHours).toFixed(1)}h left`}
          />

          {/* Custom Action Card */}
          <GlassCard variant="hover" className="flex flex-col justify-between bg-white/60 border-slate-200/60 backdrop-blur-xl">
            <div>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Express Log</p>
              <div className="space-y-3">
                <Link href="/dashboard/timesheet" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">Fill Timesheet</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/dashboard/candidates" className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                  <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">Browse Talent</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </GlassCard>
        </KPIGrid>
      </motion.div>

      {/* Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Requirements Table Card */}
        <motion.div variants={slideUp}>
          <GlassCard noPadding className="h-full bg-white/70 border-slate-200/60 backdrop-blur-xl">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/40">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Active Requirements</h3>
                <p className="text-sm text-slate-500 mt-1">Assignments tracking</p>
              </div>
              <Link
                href="/dashboard/requirements"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"
              >
                VIEW LIST
              </Link>
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden">
              {myRequirements.length === 0 ? (
                <div className="p-10 text-center">
                  <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">No active requirements assigned</p>
                  <Link href="/dashboard/requirements" className="mt-4 inline-block px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200">
                    View Requirements
                  </Link>
                </div>
              ) : (
                myRequirements.slice(0, 5).map((req, idx) => (
                  <motion.div
                    key={req._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Link
                      href={`/dashboard/requirements?view=${encodeURIComponent(req._id)}`}
                      className="p-5 flex items-center gap-4 hover:bg-white/60 transition-all group"
                    >
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform shadow-sm">
                        <Briefcase className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 font-bold truncate group-hover:text-emerald-700 transition-colors">{req.jobTitle}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{req.mmdId}</p>
                      </div>
                      <span className={cn(
                        'px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter border uppercase',
                        statusColors[req.status] || 'bg-slate-100 text-slate-500 border-slate-200'
                      )}>
                        {req.status}
                      </span>
                      <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Follow-ups Component */}
        <motion.div variants={slideUp} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold font-display text-slate-900">Focus Mode</h3>
            <span className="text-xs text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-1 rounded-md font-bold">
              {myFollowUps.length} Candidates Pending
            </span>
          </div>
          <FollowUpList
            followUps={myFollowUps}
            title="Today's Priority Tasks"
            maxItems={8}
            viewAllHref="/dashboard/activities"
          />
        </motion.div>
      </div>
    </div>
  )
}
