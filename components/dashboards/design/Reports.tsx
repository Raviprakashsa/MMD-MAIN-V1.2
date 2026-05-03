"use client";

import React, { useState } from 'react';
import { 
  FileBarChart, 
  Calendar, 
  Download, 
  Filter, 
  ChevronDown, 
  Users, 
  Briefcase, 
  Clock, 
  Search,
  ArrowUpRight,
  TrendingUp,
  Table,
  Target,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Legend,
  ComposedChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Funnel,
  FunnelChart,
  LabelList
} from 'recharts';

// --- Types & Mock Data ---

const REPORT_TYPES = [
  { id: 'performance', label: 'Team Performance', icon: Users },
  { id: 'pipeline', label: 'Pipeline Health', icon: TrendingUp },
  { id: 'sources', label: 'Source ROI', icon: ArrowUpRight },
  { id: 'timesheets', label: 'Timesheets & Compliance', icon: Clock },
];

// Module 10: Effort vs Outcome Data
const PERFORMANCE_DATA = [
  { name: 'Rashmi', hours: 42, submissions: 15, hires: 2 },
  { name: 'Manjunath', hours: 38, submissions: 12, hires: 1 },
  { name: 'Sarah', hours: 45, submissions: 18, hires: 3 },
  { name: 'Amit', hours: 30, submissions: 8, hires: 0 },
  { name: 'Priya', hours: 40, submissions: 14, hires: 1 },
];

// Module 12: Source Conversion
const SOURCE_DATA = [
  { name: 'LinkedIn', value: 45, conversion: '12%' },
  { name: 'Naukri', value: 30, conversion: '8%' },
  { name: 'Referral', value: 15, conversion: '40%' },
  { name: 'Agency', value: 10, conversion: '25%' },
];

const COLORS = ['#6366f1', '#94a3b8', '#10b981', '#f59e0b'];

// Module 12: Pipeline Funnel Data
const FUNNEL_DATA = [
  { value: 120, name: 'Applied', fill: '#e0e7ff' },
  { value: 85, name: 'Screened', fill: '#a5b4fc' },
  { value: 45, name: 'Interviewing', fill: '#6366f1' },
  { value: 12, name: 'Offer Sent', fill: '#4f46e5' },
  { value: 8, name: 'Hired', fill: '#312e81' },
];

// Module 10: Timesheet Compliance Data
const TIMESHEET_WEEKLY_DATA = [
  { day: 'Mon', approved: 38, pending: 4, missing: 2 },
  { day: 'Tue', approved: 40, pending: 2, missing: 2 },
  { day: 'Wed', approved: 35, pending: 8, missing: 1 },
  { day: 'Thu', approved: 42, pending: 1, missing: 1 },
  { day: 'Fri', approved: 30, pending: 12, missing: 2 },
];

const STALLED_CANDIDATES = [
  { id: 'C-102', name: 'Arjun K.', stage: 'Interviewing', days: 12, recruiter: 'Rashmi' },
  { id: 'C-340', name: 'Priya S.', stage: 'Screened', days: 8, recruiter: 'Amit' },
  { id: 'C-115', name: 'John D.', stage: 'Offer Sent', days: 5, recruiter: 'Sarah' },
];

// --- Components ---

const FilterPill = ({ label, active, onClick }: { label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap ${active ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
  >
    {label}
  </button>
);

const KPICard = ({ title, value, sub, color, icon: Icon = TrendingUp }: any) => (
  <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-100 transition-colors">
    <div>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</h3>
      <p className="text-xs font-medium text-slate-500 mt-1">{sub}</p>
    </div>
    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
      <Icon size={18} />
    </div>
  </div>
);

export default function Reports() {
  const [activeTab, setActiveTab] = useState('performance');
  const [dateRange, setDateRange] = useState('This Month');
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 min-w-0">
      
      {/* Header (Admin Module 12 - One Click Truth) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_20px_-4px_rgba(6,11,40,0.08)] flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
               <FileBarChart size={20} />
            </div>
            Admin Reporting Console
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium max-w-xl">
            Module 12 Compliance: Real-time intelligence on team performance, pipeline velocity, and sourcing efficiency.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
           <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Clock size={12} /> Last updated: Just now
           </div>
           <div className="flex gap-3 w-full md:w-auto">
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                <Calendar size={16} className="text-slate-400" />
                {dateRange}
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              
              <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-xl shadow-slate-200 transition-all active:scale-95">
                <Download size={16} />
                Export Data
              </button>
           </div>
        </div>
      </div>

      {/* Control Panel / Filter Bar */}
      <div className="flex items-center gap-4 overflow-x-auto pb-2 custom-scrollbar">
         <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mr-2 shrink-0">Filters:</span>
         <div className="flex gap-2">
            {['All Coordinators', 'IT Sector', 'Non-IT', 'Senior Roles'].map((f) => (
               <FilterPill 
                 key={f} 
                 label={f} 
                 active={activeFilter === f} 
                 onClick={() => setActiveFilter(f)} 
               />
            ))}
         </div>
         <div className="h-6 w-px bg-slate-200 mx-2 shrink-0"></div>
         <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline shrink-0">
            <Filter size={12} /> Advanced Filters
         </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {REPORT_TYPES.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 relative top-[2px] whitespace-nowrap ${
                isActive 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dynamic Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 min-w-0"
        >
          {activeTab === 'performance' && (
            <>
              {/* Executive Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Team Efficiency" value="1.8" sub="Submissions per hire" color="bg-indigo-500" icon={Target} />
                <KPICard title="Total Hours" value="195" sub="This Week (98% Compliance)" color="bg-slate-600" icon={Clock} />
                <KPICard title="Revenue Proj." value="₹4.2L" sub="From Active Offers" color="bg-emerald-500" icon={Briefcase} />
                <KPICard title="Stalled Reqs" value="12" sub="Needs Attention (>7 Days)" color="bg-rose-500" icon={AlertCircle} />
              </div>

              {/* Main Chart: Effort vs Outcome (Accountability) */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-0 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Recruiter Leaderboard</h3>
                    <p className="text-xs text-slate-500 font-medium">Correlating Hours Logged (Effort) vs Candidates Hired (Outcome)</p>
                  </div>
                  <div className="flex gap-2 text-xs font-bold text-slate-500">
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Hours</span>
                     <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Hires</span>
                  </div>
                </div>
                
                <div className="h-80 w-full min-w-0 relative" style={{ minHeight: '320px', height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                    <ComposedChart data={PERFORMANCE_DATA} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        cursor={{fill: '#f8fafc'}}
                      />
                      <Bar yAxisId="left" dataKey="hours" name="Hours Logged" fill="#cbd5e1" barSize={30} radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="hires" name="Hires Made" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff'}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {activeTab === 'pipeline' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               {/* Funnel Chart */}
               <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-0 overflow-hidden">
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Candidate Conversion Funnel</h3>
                  <p className="text-xs text-slate-500 mb-6 font-medium">Conversion rate from Application to Hire is <span className="text-indigo-600 font-bold">6.6%</span></p>
                  
                  <div className="h-96 w-full min-w-0 relative" style={{ minHeight: '384px', height: '384px', width: '100%' }}>
                     <ResponsiveContainer width="100%" height="100%" minHeight={384}>
                        <FunnelChart>
                           <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                           <Funnel
                              data={FUNNEL_DATA}
                              dataKey="value"
                              isAnimationActive
                           >
                              <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" fontSize={12} fontWeight="bold" />
                           </Funnel>
                        </FunnelChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Stalled Candidates (Neuro-principle: Urgency) */}
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                        <AlertCircle size={20} />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">Stalled Candidates</h3>
                        <p className="text-xs text-rose-500 font-bold">Action Required</p>
                     </div>
                  </div>

                  <div className="space-y-3">
                     {STALLED_CANDIDATES.map((c) => (
                        <div key={c.id} className="p-4 rounded-xl border border-slate-100 hover:border-rose-200 hover:shadow-sm transition-all bg-slate-50 group">
                           <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-slate-800">{c.name}</h4>
                              <span className="text-xs font-bold text-rose-500 bg-rose-100 px-2 py-1 rounded">{c.days} days</span>
                           </div>
                           <div className="flex justify-between items-end">
                              <div className="text-xs text-slate-500">
                                 <p>Stage: {c.stage}</p>
                                 <p>Owner: {c.recruiter}</p>
                              </div>
                              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                                 Nudge
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
                  
                  <button className="w-full mt-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 rounded-lg hover:border-slate-400 transition-colors">
                     View All Stalled
                  </button>
               </div>
            </div>
          )}

          {activeTab === 'sources' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                {/* Source Breakdown */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-0 overflow-hidden">
                   <h3 className="text-lg font-bold text-slate-800 mb-2">Candidate Sourcing Channels</h3>
                   <p className="text-xs text-slate-500 mb-6 font-medium">Where are our hires coming from?</p>
                   
                   <div className="h-64 w-full min-w-0 relative" style={{ minHeight: '256px', height: '256px', width: '100%' }}>
                     <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                       <PieChart>
                         <Pie
                           data={SOURCE_DATA}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={80}
                           paddingAngle={5}
                           dataKey="value"
                         >
                           {SOURCE_DATA.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip />
                         <Legend iconType="circle" verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* Insight Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
                   <div className="p-4 bg-indigo-50 rounded-xl mb-6">
                      <div className="flex items-start gap-3">
                         <Target className="text-indigo-600 mt-1" size={20} />
                         <div>
                            <h4 className="text-sm font-bold text-indigo-900">High Value Source: Referrals</h4>
                            <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
                               Although <strong>Referrals</strong> account for only 15% of volume, they have a <strong>40% conversion rate</strong>. 
                               Recommendation: Increase referral bonus for Coordinators.
                            </p>
                         </div>
                      </div>
                   </div>

                   <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Channel Efficiency Matrix</h4>
                   <div className="space-y-4">
                      {SOURCE_DATA.map((source, idx) => (
                         <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full" style={{ background: COLORS[idx % COLORS.length] }}></div>
                               <span className="text-sm font-medium text-slate-700">{source.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="text-right">
                                  <span className="block text-xs text-slate-400">Vol</span>
                                  <span className="block text-sm font-bold text-slate-800">{source.value}</span>
                               </div>
                               <div className="text-right w-16">
                                  <span className="block text-xs text-slate-400">Conv %</span>
                                  <span className="block text-sm font-bold text-emerald-600">{source.conversion}</span>
                                </div>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'timesheets' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-0 overflow-hidden">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-slate-800">Timesheet Submission (This Week)</h3>
                     <div className="flex gap-4 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Approved</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-400"></div> Pending</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-200"></div> Missing</span>
                     </div>
                  </div>
                  
                  <div className="h-80 w-full min-w-0 relative" style={{ minHeight: '320px', height: '320px', width: '100%' }}>
                     <ResponsiveContainer width="100%" height="100%" minHeight={320}>
                        <BarChart data={TIMESHEET_WEEKLY_DATA} margin={{ top: 20, right: 0, bottom: 0, left: 0 }} barSize={40}>
                           <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
                           <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                           <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                           <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                           <Bar dataKey="approved" stackId="a" fill="#10b981" radius={[0,0,4,4]} />
                           <Bar dataKey="pending" stackId="a" fill="#818cf8" />
                           <Bar dataKey="missing" stackId="a" fill="#e2e8f0" radius={[4,4,0,0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2 mb-6">
                     <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                        <AlertCircle size={20} />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-slate-800">Compliance Check</h3>
                        <p className="text-xs text-amber-600 font-bold">2 Missing Submissions</p>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              AM
                           </div>
                           <div>
                              <p className="text-sm font-bold text-slate-700">Amit M.</p>
                              <p className="text-xs text-slate-400">Tuesday, 4th Feb</p>
                           </div>
                        </div>
                        <button className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors">
                           Remind
                        </button>
                     </div>

                     <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
                              JS
                           </div>
                           <div>
                              <p className="text-sm font-bold text-slate-700">John S.</p>
                              <p className="text-xs text-slate-400">Monday, 3rd Feb</p>
                           </div>
                        </div>
                        <button className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1 rounded-lg transition-colors">
                           Remind
                        </button>
                     </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-100">
                     <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Quick Stats</h4>
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-slate-600">On-Time Submission</span>
                        <span className="text-sm font-bold text-emerald-600">92%</span>
                     </div>
                     <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '92%' }}></div>
                     </div>
                  </div>
               </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}