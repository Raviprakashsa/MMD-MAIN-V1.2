"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal,
  ArrowUpRight,
  DollarSign,
  Activity,
  Calendar,
  Filter,
  Building2,
  FileText,
  Phone,
  Mail,
  
  TrendingDown,
  
  ExternalLink,
  GitBranch,
  Shield,
  X,
  
  Download,
  RefreshCw,
  
  Eye,
  Send,
  Edit2,
  Plus,
  ChevronRight,
  
  User
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface BackendDashboardData {
  kpis?: {
    totalCompanies: number
    activeRequirements: number
    pendingActions: number
    conversionRate: number
    stalledCount: number
    missingJDCount: number
    followUpsToday: number
  }
  requirementsFunnel?: Array<{
    label: string
    value: number
    color?: string
    status?: string
  }>
  requirementsTrend?: Array<{
    date: Date | string
    created: number
    closed: number
  }>
  redZone?: Array<{
    id: string
    title: string
    detail: string
    href: string
    severity: 'high' | 'medium'
  }>
  recentActivities?: Array<{
    _id: string
    summary: string
    type: string
    createdAt: Date | string
    userName?: string
    requirementMmdId?: string
  }>
  urgentFollowUps?: Array<{
    _id: string
    summary: string
    requirementMmdId?: string
    nextFollowUpDate: Date | string
    isOverdue?: boolean
  }>
}

const WORKFLOW_COLOR_MAP: Record<string, string> = {
  PENDING_INTAKE: '#94a3b8',
  AWAITING_JD: '#f59e0b',
  ACTIVE: '#6366f1',
  SOURCING: '#8b5cf6',
  INTERVIEWING: '#3b82f6',
  OFFER: '#10b981',
  ON_HOLD: '#ef4444',
  CLOSED_HIRED: '#059669',
  CLOSED_NOT_HIRED: '#64748b',
}

const statusToLabel = (status?: string, fallback = 'Unknown') => {
  if (!status) return fallback
  return status
    .split('_')
    .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
    .join(' ')
}

const formatRelativeTime = (value: Date | string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'just now'
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const formatChartLabel = (value: Date | string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ========== MMDSS COMPREHENSIVE DATA ==========

// MODULE 3: Company Master Breakdown
const COMPANY_STATS = {
  total: 42,
  byMOUStatus: [
    { status: 'Signed', count: 18, color: '#10b981' },
    { status: 'In Progress', count: 12, color: '#f59e0b' },
    { status: 'Not Started', count: 12, color: '#94a3b8' }
  ],
  bySector: [
    { sector: 'IT', count: 22, color: '#6366f1' },
    { sector: 'BFSI', count: 8, color: '#8b5cf6' },
    { sector: 'Manufacturing', count: 6, color: '#ec4899' },
    { sector: 'Startup', count: 4, color: '#14b8a6' },
    { sector: 'Enterprise', count: 2, color: '#f97316' }
  ],
  bySource: [
    { source: 'Scraping', count: 18 },
    { source: 'Leads', count: 12 },
    { source: 'Events', count: 8 },
    { source: 'Referral', count: 4 }
  ]
};

// MODULE 6: Full Requirement Workflow Status
const REQUIREMENT_WORKFLOW = [
  { status: 'Pending Intake', count: 5, color: '#94a3b8' },
  { status: 'Awaiting JD', count: 3, color: '#f59e0b' },
  { status: 'Active', count: 24, color: '#6366f1' },
  { status: 'Sourcing', count: 18, color: '#8b5cf6' },
  { status: 'Interviewing', count: 12, color: '#3b82f6' },
  { status: 'Offer', count: 8, color: '#10b981' },
  { status: 'Closed - Hired', count: 15, color: '#059669' },
  { status: 'On Hold', count: 4, color: '#ef4444' }
];

// MODULE 4: Requirements by Group & Work Mode
const REQUIREMENTS_BY_GROUP = [
  { name: 'Rashmi', active: 12, pending: 2, closed: 8 },
  { name: 'Manjunath', active: 9, pending: 1, closed: 5 },
  { name: 'Scraping', active: 3, pending: 0, closed: 2 }
];

const WORK_MODE_DATA = [
  { mode: 'Remote', count: 18, color: '#10b981' },
  { mode: 'Hybrid', count: 14, color: '#6366f1' },
  { mode: 'Office', count: 7, color: '#f59e0b' }
];

// MODULE 7: Activity & Follow-up Tracking
const _ACTIVITY_BREAKDOWN = [
  { type: 'Calls', today: 42, week: 287 },
  { type: 'Emails', today: 28, week: 195 },
  { type: 'WhatsApp', today: 35, week: 241 },
  { type: 'Interviews', today: 11, week: 64 },
  { type: 'Meetings', today: 6, week: 38 }
];

const _FOLLOW_UP_COMPLIANCE = {
  onTime: 156,
  overdue: 12,
  dueToday: 24,
  complianceRate: 93
};

// MODULE 9: Lead Pipeline & Conversion
const LEAD_PIPELINE = {
  totalLeads: 89,
  contacted: 67,
  convertedToCompany: 28,
  convertedToRequirement: 18,
  conversionRate: 20.2
};

const _LEAD_SOURCES = [
  { platform: 'LinkedIn', count: 34, confidence: 78 },
  { platform: 'Naukri', count: 22, confidence: 65 },
  { platform: 'Indeed', count: 18, confidence: 58 },
  { platform: 'Referrals', count: 15, confidence: 92 }
];

// MODULE 10: Person-wise Productivity
const _TEAM_PRODUCTIVITY = [
  { name: 'Rashmi', calls: 18, emails: 12, interviews: 5, hours: 7.5, compliance: 100 },
  { name: 'Manjunath', calls: 15, emails: 10, interviews: 4, hours: 7.2, compliance: 95 },
  { name: 'Amit Patel', calls: 9, emails: 6, interviews: 2, hours: 6.8, compliance: 85 }
];

// MODULE 8: Enhanced Candidate Pipeline
const CANDIDATE_STATS = {
  total: 296,
  bySource: [
    { source: 'Application Form', count: 182 },
    { source: 'Manual Entry', count: 78 },
    { source: 'Referral', count: 36 }
  ],
  byStage: [
    { stage: 'Applied', count: 145, conversionRate: 61 },
    { stage: 'Shortlisted', count: 89, conversionRate: 47 },
    { stage: 'Interview', count: 42, conversionRate: 29 },
    { stage: 'Offer', count: 12, conversionRate: 67 },
    { stage: 'Hired', count: 8, conversionRate: 100 }
  ],
  topColleges: ['IIT Delhi', 'NIT Trichy', 'VIT Pune', 'BITS Pilani']
};

// Upcoming Interview Closing Dates
const UPCOMING_DEADLINES = [
  { id: 'REQ-24-IT-085', company: 'TechCorp', role: 'Senior Developer', closingDate: '8 Feb', daysLeft: 2, status: 'urgent' },
  { id: 'REQ-24-BFSI-012', company: 'HDFC Bank', role: 'Business Analyst', closingDate: '10 Feb', daysLeft: 4, status: 'warning' },
  { id: 'REQ-24-MFG-041', company: 'Tata Motors', role: 'Project Manager', closingDate: '12 Feb', daysLeft: 6, status: 'normal' }
];

// Pending JDs & Stalled Requirements
const PENDING_JDS = [
  { id: 'REQ-24-IT-085', company: 'TechCorp India', assignedTo: 'Rashmi', daysPending: 3, priority: 'High' },
  { id: 'REQ-24-BFSI-012', company: 'HDFC Bank', assignedTo: 'Manjunath', daysPending: 7, priority: 'Medium' },
  { id: 'REQ-24-MFG-041', company: 'Tata Motors', assignedTo: 'Rashmi', daysPending: 2, priority: 'High' }
];

const STALLED_REQUIREMENTS = [
  { id: 'REQ-24-IT-062', company: 'Infosys', lastActivity: '18 days ago', owner: 'Manjunath', reason: 'No JD from client' },
  { id: 'REQ-24-BFSI-008', company: 'Axis Bank', lastActivity: '22 days ago', owner: 'Rashmi', reason: 'Hiring on hold' },
  { id: 'REQ-24-IT-075', company: 'Wipro', lastActivity: '15 days ago', owner: 'Scraping Team', reason: 'No suitable candidates' }
];

// Red Zone Alerts
const ALERTS = [
  { id: 1, type: 'stalled', message: '3 Requirements stalled > 15 days', action: 'Review', count: 3 },
  { id: 2, type: 'expiry', message: 'Google MOU expires in 5 days', action: 'Renew', count: 1 },
  { id: 3, type: 'compliance', message: 'Amit Patel missing timesheet (Tue)', action: 'Nudge', count: 1 },
  { id: 4, type: 'deadline', message: '2 Interview deadlines in 48 hours', action: 'Prioritize', count: 2 },
  { id: 5, type: 'followup', message: '12 Follow-ups overdue', action: 'Action', count: 12 }
];

// Recent Activity Feed
const RECENT_ACTIVITY = [
  { id: 1, user: 'Rashmi', action: 'scheduled interview', target: 'Arjun K. for REQ-24-IT-085', time: '10m ago', type: 'interview' },
  { id: 2, user: 'Manjunath', action: 'moved to Offer stage', target: 'REQ-24-BFSI-012', time: '25m ago', type: 'status' },
  { id: 3, user: 'System', action: 'generated invoice', target: 'INV-992 (₹2.5L)', time: '1h ago', type: 'finance' },
  { id: 4, user: 'Amit Patel', action: 'added new lead', target: 'Accenture (LinkedIn)', time: '2h ago', type: 'lead' }
];

// Weekly Activity Chart
const activityData = [
  { name: 'Mon', candidates: 12, interviews: 4, calls: 38 },
  { name: 'Tue', candidates: 19, interviews: 6, calls: 42 },
  { name: 'Wed', candidates: 15, interviews: 8, calls: 35 },
  { name: 'Thu', candidates: 22, interviews: 9, calls: 48 },
  { name: 'Fri', candidates: 28, interviews: 11, calls: 52 },
  { name: 'Sat', candidates: 10, interviews: 2, calls: 18 },
  { name: 'Sun', candidates: 5, interviews: 0, calls: 8 }
];

// Extended drill-down data
const DETAILED_COMPANIES = [
  { id: 'C-001', name: 'TechCorp India', sector: 'IT', mouStatus: 'Signed', activeReqs: 5, revenue: '₹8.5L', contact: 'Rahul Sharma', email: 'rahul@techcorp.in', phone: '+91 98765 43210' },
  { id: 'C-002', name: 'HDFC Bank', sector: 'BFSI', mouStatus: 'Signed', activeReqs: 3, revenue: '₹6.2L', contact: 'Priya Nair', email: 'priya.nair@hdfc.com', phone: '+91 98765 43211' },
  { id: 'C-003', name: 'Tata Motors', sector: 'Manufacturing', mouStatus: 'In Progress', activeReqs: 2, revenue: '₹4.8L', contact: 'Amit Singh', email: 'amit@tatamotors.com', phone: '+91 98765 43212' },
  { id: 'C-004', name: 'Infosys', sector: 'IT', mouStatus: 'Signed', activeReqs: 4, revenue: '₹9.1L', contact: 'Suresh Kumar', email: 'suresh@infosys.com', phone: '+91 98765 43213' },
  { id: 'C-005', name: 'Axis Bank', sector: 'BFSI', mouStatus: 'Not Started', activeReqs: 0, revenue: '₹0', contact: 'Neha Gupta', email: 'neha@axisbank.com', phone: '+91 98765 43214' }
];

const DETAILED_REQUIREMENTS = [
  { id: 'REQ-24-IT-085', company: 'TechCorp', role: 'Senior Backend Developer', status: 'Active', priority: 'High', owner: 'Rashmi', candidates: 12, daysOpen: 15, salary: '12-18 LPA', location: 'Bangalore', workMode: 'Hybrid' },
  { id: 'REQ-24-BFSI-012', company: 'HDFC Bank', role: 'Business Analyst', status: 'Interviewing', priority: 'Medium', owner: 'Manjunath', candidates: 8, daysOpen: 22, salary: '8-12 LPA', location: 'Mumbai', workMode: 'Office' },
  { id: 'REQ-24-MFG-041', company: 'Tata Motors', role: 'Project Manager', status: 'Sourcing', priority: 'High', owner: 'Rashmi', candidates: 5, daysOpen: 10, salary: '15-22 LPA', location: 'Pune', workMode: 'Office' },
  { id: 'REQ-24-IT-092', company: 'Infosys', role: 'Frontend Developer', status: 'Active', priority: 'Medium', owner: 'Manjunath', candidates: 15, daysOpen: 8, salary: '10-14 LPA', location: 'Hyderabad', workMode: 'Remote' },
  { id: 'REQ-24-BFSI-018', company: 'HDFC Bank', role: 'Data Analyst', status: 'Offer', priority: 'Low', owner: 'Amit', candidates: 3, daysOpen: 28, salary: '6-9 LPA', location: 'Delhi', workMode: 'Hybrid' }
];

// ========== INTERACTIVE MODALS ==========

// Filter Modal
const FilterModal = ({ isOpen, onClose, filters, setFilters }: any) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Filter size={20} className="text-indigo-600" />
                Dashboard Filters
              </h2>
              <p className="text-xs text-slate-500 mt-1">Customize your view with advanced filters</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Date Range */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">From</label>
                  <input 
                    type="date" 
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1.5">To</label>
                  <input 
                    type="date" 
                    value={filters.dateTo}
                    onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                  />
                </div>
              </div>
            </div>

            {/* Team Member */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Team Member</label>
              <select 
                value={filters.teamMember}
                onChange={(e) => setFilters({...filters, teamMember: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-white text-sm font-medium"
              >
                <option value="all">All Team Members</option>
                <option value="rashmi">Rashmi</option>
                <option value="manjunath">Manjunath</option>
                <option value="amit">Amit Patel</option>
                <option value="scraping">Scraping Team</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requirement Status</label>
              <div className="grid grid-cols-3 gap-3">
                {['Active', 'Sourcing', 'Interviewing', 'Offer', 'On Hold', 'Closed'].map((status) => (
                  <label key={status} className="flex items-center gap-2 p-3 rounded-lg border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={filters.statuses.includes(status)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({...filters, statuses: [...filters.statuses, status]});
                        } else {
                          setFilters({...filters, statuses: filters.statuses.filter((s: string) => s !== status)});
                        }
                      }}
                      className="rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500/20" 
                    />
                    <span className="text-xs font-bold text-slate-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority Level</label>
              <div className="flex gap-3">
                {['High', 'Medium', 'Low'].map((priority) => (
                  <label key={priority} className="flex items-center gap-2 flex-1 p-3 rounded-lg border-2 border-slate-200 hover:border-rose-300 hover:bg-rose-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={filters.priorities.includes(priority)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters({...filters, priorities: [...filters.priorities, priority]});
                        } else {
                          setFilters({...filters, priorities: filters.priorities.filter((p: string) => p !== priority)});
                        }
                      }}
                      className="rounded text-rose-600 focus:ring-2 focus:ring-rose-500/20" 
                    />
                    <span className="text-xs font-bold text-slate-700">{priority}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <button 
              onClick={() => setFilters({
                dateFrom: '',
                dateTo: '',
                teamMember: 'all',
                statuses: [],
                priorities: []
              })}
              className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Reset All Filters
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
                Cancel
              </button>
              <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                Apply Filters
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Company Details Modal
const CompanyDetailsModal = ({ isOpen, onClose }: any) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" />
                Company Master Directory
              </h2>
              <p className="text-xs text-slate-500 mt-1">Module 3 • {COMPANY_STATS.total} Total Companies</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-3">
              {DETAILED_COMPANIES.map((company, idx) => (
                <motion.div
                  key={company.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-5 rounded-xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {company.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{company.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{company.sector}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            company.mouStatus === 'Signed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            company.mouStatus === 'In Progress' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            MOU: {company.mouStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-extrabold text-emerald-600">{company.revenue}</div>
                      <div className="text-xs text-slate-500">{company.activeReqs} Active Reqs</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Contact</p>
                        <p className="text-sm font-bold text-slate-700">{company.contact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Email</p>
                        <p className="text-sm font-bold text-slate-700 truncate">{company.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-400">Phone</p>
                        <p className="text-sm font-bold text-slate-700">{company.phone}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                      <Eye size={14} /> View Details
                    </button>
                    <button className="flex-1 px-4 py-2 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="px-4 py-2 bg-white border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 rounded-lg text-xs font-bold transition-all">
                      <Plus size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-sm text-slate-500">Showing {DETAILED_COMPANIES.length} of {COMPANY_STATS.total} companies</span>
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Requirements Drill-down Modal
const RequirementsModal = ({ isOpen, onClose, statusFilter }: any) => {
  if (!isOpen) return null;

  const filteredReqs = statusFilter ? DETAILED_REQUIREMENTS.filter(r => r.status === statusFilter) : DETAILED_REQUIREMENTS;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-600" />
                Requirements Dashboard
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {statusFilter ? `Showing ${statusFilter} Requirements` : 'All Active Requirements'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-3">
              {filteredReqs.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-5 rounded-xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">{req.id}</span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          req.priority === 'High' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          req.priority === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {req.priority}
                        </span>
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          req.status === 'Active' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          req.status === 'Interviewing' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          req.status === 'Offer' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        <Building2 size={16} className="text-slate-400" />
                        {req.company} - {req.role}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Days Open</div>
                      <div className="text-2xl font-extrabold text-slate-900">{req.daysOpen}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 py-4 border-y border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Owner</p>
                      <p className="text-sm font-bold text-slate-700">{req.owner}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Candidates</p>
                      <p className="text-sm font-bold text-indigo-600">{req.candidates}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Salary</p>
                      <p className="text-sm font-bold text-emerald-700">{req.salary}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Location</p>
                      <p className="text-sm font-bold text-slate-700">{req.location}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Work Mode</p>
                      <p className="text-sm font-bold text-slate-700">{req.workMode}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                      <Eye size={14} /> View Full Details
                    </button>
                    <button className="px-4 py-2 bg-white border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                      <Users size={14} /> View Candidates
                    </button>
                    <button className="px-4 py-2 bg-white border-2 border-slate-200 hover:border-amber-300 hover:bg-amber-50 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                      <Edit2 size={14} /> Edit
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-sm text-slate-500">Showing {filteredReqs.length} requirements</span>
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Alert Action Modal
const AlertActionModal = ({ isOpen, onClose, alert }: any) => {
  if (!isOpen || !alert) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Take Action</h2>
                <p className="text-xs text-slate-500 mt-0.5">{alert.message}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-bold text-amber-900 mb-2">⚠️ Recommended Action:</p>
                <p className="text-sm text-amber-700">
                  {alert.type === 'stalled' && 'Contact requirement owners to update status or escalate to client.'}
                  {alert.type === 'expiry' && 'Initiate MOU renewal process with legal team immediately.'}
                  {alert.type === 'compliance' && 'Send automated reminder via email and WhatsApp.'}
                  {alert.type === 'deadline' && 'Prioritize candidate submissions and schedule urgent interviews.'}
                  {alert.type === 'followup' && 'Review overdue follow-ups and reassign if needed.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action Notes</label>
                <textarea 
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm resize-none"
                  placeholder="Add notes about the action taken..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To</label>
                <select className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-white text-sm font-medium">
                  <option>Rashmi</option>
                  <option>Manjunath</option>
                  <option>Amit Patel</option>
                  <option>Admin (Self)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
              Cancel
            </button>
            <button 
              onClick={() => {
                alert('Action logged successfully! ✓');
                onClose();
              }}
              className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Send size={16} /> {alert.action} Now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ========== COMPONENTS ==========

const StatCard = ({ title, value, trend, icon: Icon, color, subValue, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_20px_-4px_rgba(6,11,40,0.08)] hover:border-indigo-100 transition-all group ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} text-white shadow-md group-hover:scale-110 transition-transform`}>
        <Icon size={20} />
      </div>
      {trend && (
        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
          trend.startsWith('+') ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
        }`}>
          {trend.startsWith('+') ? <ArrowUpRight size={12} /> : <TrendingDown size={12} />} {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-extrabold text-slate-800 mt-1 tracking-tight">{value}</h3>
      {subValue && <p className="text-xs font-medium text-slate-500 mt-1">{subValue}</p>}
    </div>
    {onClick && (
      <div className="mt-3 pt-3 border-t border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
          Click to view details <ChevronRight size={12} />
        </span>
      </div>
    )}
  </div>
);

const RedZoneItem = ({ alert, onClick }: { alert: any, onClick: () => void }) => {
  const colors = {
    stalled: 'bg-amber-50 text-amber-700 border-amber-200',
    expiry: 'bg-rose-50 text-rose-700 border-rose-200',
    compliance: 'bg-slate-50 text-slate-700 border-slate-200',
    deadline: 'bg-red-50 text-red-700 border-red-200',
    followup: 'bg-orange-50 text-orange-700 border-orange-200'
  };

  const icons = {
    stalled: Clock,
    expiry: AlertCircle,
    compliance: Users,
    deadline: Calendar,
    followup: TrendingUp
  };

  const Icon = icons[alert.type as keyof typeof icons] || AlertCircle;

  return (
    <div className={`p-3 rounded-xl border flex items-center justify-between group cursor-pointer ${colors[alert.type as keyof typeof colors]} hover:shadow-md transition-all`}>
      <div className="flex items-center gap-3 flex-1">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/50 shrink-0">
          <Icon size={14} />
        </div>
        <div className="flex-1">
          <span className="text-xs font-bold block">{alert.message}</span>
          <span className="text-[10px] font-medium opacity-70">Count: {alert.count}</span>
        </div>
      </div>
      <button 
        onClick={onClick}
        className="text-[10px] font-bold uppercase bg-white px-2.5 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:shadow"
      >
        {alert.action}
      </button>
    </div>
  );
};

const MiniStatCard = ({ label, value, color, icon: Icon, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`bg-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-all group ${onClick ? 'cursor-pointer' : ''}`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 ${color} text-white rounded-lg shadow-sm group-hover:scale-105 transition-transform`}>
        <Icon size={18} />
      </div>
      <div className="flex-1">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</p>
        <h4 className="text-xl font-extrabold text-slate-900 tracking-tight">{value}</h4>
      </div>
    </div>
  </div>
);

export default function Dashboard({ backendData }: { backendData?: BackendDashboardData }) {
  const router = useRouter();
  const [_selectedView, _setSelectedView] = useState('overview');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState(false);
  const [requirementStatusFilter, setRequirementStatusFilter] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [showCoffeeAnimation, setShowCoffeeAnimation] = useState(false);
  
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    teamMember: 'all',
    statuses: [] as string[],
    priorities: [] as string[]
  });

  const totalCompanies = backendData?.kpis?.totalCompanies ?? COMPANY_STATS.total
  const activeRequirements = backendData?.kpis?.activeRequirements ?? (REQUIREMENT_WORKFLOW.find((row) => row.status === 'Active')?.count || 0)
  const pendingJdCount = backendData?.kpis?.missingJDCount ?? PENDING_JDS.length

  const workflowData = backendData?.requirementsFunnel && backendData.requirementsFunnel.length > 0
    ? backendData.requirementsFunnel.map((row) => ({
        status: statusToLabel(row.status, row.label),
        count: row.value,
        color: row.color || (row.status ? WORKFLOW_COLOR_MAP[row.status] : '#6366f1'),
      }))
    : REQUIREMENT_WORKFLOW

  const trendData = backendData?.requirementsTrend && backendData.requirementsTrend.length > 0
    ? backendData.requirementsTrend.map((row) => ({
        name: formatChartLabel(row.date),
        candidates: row.created,
        interviews: row.closed,
        calls: Math.max(0, row.created - row.closed),
      }))
    : activityData

  const alertsData = backendData?.redZone && backendData.redZone.length > 0
    ? backendData.redZone.map((alert, index) => ({
        id: index + 1,
        type: alert.severity === 'high' ? 'deadline' : 'stalled',
        message: alert.title,
        action: 'Open',
        count: 1,
      }))
    : ALERTS

  const liveFeedData = backendData?.recentActivities && backendData.recentActivities.length > 0
    ? backendData.recentActivities.slice(0, 6).map((activity, index) => ({
        id: index + 1,
        user: activity.userName || 'System',
        action: activity.type.toLowerCase().replace(/_/g, ' '),
        target: activity.requirementMmdId || activity.summary,
        time: formatRelativeTime(activity.createdAt),
        createdAtTs: Number.isNaN(new Date(activity.createdAt).getTime()) ? undefined : new Date(activity.createdAt).getTime(),
        type: activity.type.toLowerCase().includes('interview')
          ? 'interview'
          : activity.type.toLowerCase().includes('status')
            ? 'status'
            : activity.type.toLowerCase().includes('invoice')
              ? 'finance'
              : 'lead',
      }))
    : RECENT_ACTIVITY

  const deadlinesData = backendData?.urgentFollowUps && backendData.urgentFollowUps.length > 0
    ? backendData.urgentFollowUps.slice(0, 4).map((followUp, index) => {
        const dueDate = new Date(followUp.nextFollowUpDate)
        const daysLeft = Number.isNaN(dueDate.getTime())
          ? 0
          : Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        return {
          id: followUp.requirementMmdId || `FOLLOW-UP-${index + 1}`,
          company: followUp.summary,
          dueDateTs: Number.isNaN(dueDate.getTime()) ? undefined : dueDate.getTime(),
          role: Number.isNaN(dueDate.getTime())
            ? 'Follow-up'
            : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          daysLeft,
          status: daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'warning' : 'normal',
        }
      })
    : UPCOMING_DEADLINES

  const filterFromTs = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : undefined
  const filterToTs = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : undefined

  const filteredWorkflowData = useMemo(() => {
    if (filters.statuses.length === 0) return workflowData
    return workflowData.filter((item) => filters.statuses.some((status) => item.status.toLowerCase().includes(status.toLowerCase())))
  }, [workflowData, filters.statuses])

  const filteredLiveFeedData = useMemo(() => {
    return liveFeedData.filter((activity: any) => {
      const matchesTeam = filters.teamMember === 'all' || activity.user.toLowerCase().includes(filters.teamMember.toLowerCase())
      const matchesFrom = filterFromTs === undefined || activity.createdAtTs === undefined || activity.createdAtTs >= filterFromTs
      const matchesTo = filterToTs === undefined || activity.createdAtTs === undefined || activity.createdAtTs <= filterToTs
      return matchesTeam && matchesFrom && matchesTo
    })
  }, [liveFeedData, filters.teamMember, filterFromTs, filterToTs])

  const filteredDeadlinesData = useMemo(() => {
    return deadlinesData.filter((deadline: any) => {
      const matchesFrom = filterFromTs === undefined || deadline.dueDateTs === undefined || deadline.dueDateTs >= filterFromTs
      const matchesTo = filterToTs === undefined || deadline.dueDateTs === undefined || deadline.dueDateTs <= filterToTs
      return matchesFrom && matchesTo
    })
  }, [deadlinesData, filterFromTs, filterToTs])

  const filteredPendingJds = useMemo(() => {
    if (filters.priorities.length === 0) return PENDING_JDS
    return PENDING_JDS.filter((jd) => filters.priorities.includes(jd.priority))
  }, [filters.priorities])

  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  const handleExport = () => {
    const sections: string[] = []
    sections.push('Workflow Status,Count')
    filteredWorkflowData.forEach((row) => sections.push(`${row.status},${row.count}`))
    sections.push('')
    sections.push('Upcoming Deadlines,Company,Date,Days Left,Severity')
    filteredDeadlinesData.forEach((row: any) => sections.push(`${row.id},${row.company},${row.role},${row.daysLeft},${row.status}`))
    sections.push('')
    sections.push('Live Activity,User,Action,Target,Time')
    filteredLiveFeedData.forEach((row: any) => sections.push(`${row.id},${row.user},${row.action},${row.target},${row.time}`))

    const csv = sections.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `nextgen-analytics-${new Date().toISOString().split('T')[0]}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  };

  const handleFilterClick = () => {
    setShowCoffeeAnimation(true);
    setTimeout(() => {
      setShowCoffeeAnimation(false);
      setIsFilterOpen(true);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 min-w-0">
      
      {/* Coffee Filter Animation */}
      <AnimatePresence>
        {showCoffeeAnimation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: -50 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="relative"
            >
              {/* Coffee Cup */}
              <div className="relative">
                {/* Steam Animation */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1 h-8 bg-gradient-to-t from-slate-400/80 to-transparent rounded-full"
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        y: [0, -15, 0],
                        scaleY: [1, 1.5, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.3,
                        ease: "easeInOut"
                      }}
                    />
                  ))}
                </div>

                {/* Filter Funnel */}
                <motion.div
                  className="w-40 h-32 relative mb-4"
                  animate={{ rotate: [0, -2, 2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Filter Paper */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-24">
                    <div className="w-full h-full bg-gradient-to-b from-amber-100 to-amber-50 rounded-b-[50%] border-4 border-amber-200 shadow-lg relative overflow-hidden">
                      {/* Coffee grounds */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-8 bg-gradient-to-b from-amber-800 to-amber-900 rounded-[50%]" />
                      
                      {/* Filtering liquid animation */}
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-b from-transparent via-amber-600/30 to-amber-800/50"
                        animate={{
                          opacity: [0, 0.5, 0],
                          scaleY: [0, 1, 0]
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        style={{ transformOrigin: 'top' }}
                      />
                    </div>
                  </div>

                  {/* Drip Animation */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-3 bg-gradient-to-b from-amber-800 to-amber-900 rounded-full absolute"
                        animate={{
                          y: [0, 40],
                          opacity: [1, 1, 0],
                          scaleY: [1, 1.5, 0.5]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          delay: i * 0.35,
                          ease: "linear"
                        }}
                      />
                    ))}
                  </div>
                </motion.div>

                {/* Coffee Cup */}
                <motion.div
                  className="w-48 h-40 relative"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  {/* Cup body */}
                  <div className="w-full h-32 bg-gradient-to-b from-white to-slate-50 rounded-b-3xl border-4 border-slate-200 shadow-2xl relative overflow-hidden">
                    {/* Coffee liquid filling animation */}
                    <motion.div
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-amber-900 via-amber-700 to-amber-600 rounded-b-3xl"
                      animate={{
                        height: ['0%', '70%']
                      }}
                      transition={{
                        duration: 2,
                        ease: "easeInOut"
                      }}
                    >
                      {/* Coffee surface shimmer */}
                      <motion.div
                        className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
                        animate={{
                          x: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      />
                    </motion.div>
                    
                    {/* Cup shine */}
                    <div className="absolute top-4 left-4 w-12 h-16 bg-gradient-to-br from-white/40 to-transparent rounded-full blur-sm" />
                  </div>

                  {/* Cup handle */}
                  <div className="absolute right-0 top-8 w-12 h-16 border-4 border-slate-200 rounded-r-full border-l-0 shadow-lg" />

                  {/* Saucer */}
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-56 h-8 bg-gradient-to-b from-slate-100 to-slate-200 rounded-[50%] border-4 border-slate-300 shadow-xl" />
                </motion.div>
              </div>

              {/* Text */}
              <motion.div
                className="text-center mt-8"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Filtering Data...</h3>
                <p className="text-sm text-slate-300 font-medium">Brewing the perfect insights for you ☕</p>
              </motion.div>

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mt-6">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-amber-400 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
              <Shield size={24} className="text-white" />
            </div>
            Admin Command Center
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            MMDSS Module 2 • Full System Visibility • Real-time Compliance: <span className="font-bold text-emerald-700">94%</span>
            <span className="text-xs text-slate-600 ml-2">• Last updated: {lastRefresh.toLocaleTimeString()}</span>
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button 
            onClick={handleFilterClick}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl text-sm font-bold text-slate-700 transition-all shadow-sm"
          >
            <Filter size={16} className="text-slate-400" />
            Filters
            {(filters.statuses.length > 0 || filters.priorities.length > 0) && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white rounded-full text-xs">
                {filters.statuses.length + filters.priorities.length}
              </span>
            )}
          </button>
          <button 

            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-xl text-sm font-bold text-slate-700 transition-all shadow-sm"
          >
            <RefreshCw size={16} className="text-slate-400" />
            Refresh
          </button>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl text-sm font-bold text-slate-700 transition-all shadow-sm"
          >
            <Download size={16} className="text-slate-400" />
            Export
          </button>
          <button
            onClick={() => router.push('/dashboard/requirements')}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
          >
            <Plus size={16} />
            Add Requirement
          </button>
        </div>
      </div>

      {/* Top KPI Cards - Now Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          title="Total Companies" 
          value={totalCompanies}
          subValue={`${COMPANY_STATS.byMOUStatus[0].count} with signed MOUs`}
          trend="+8" 
          icon={Building2} 
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          onClick={() => setIsCompanyModalOpen(true)}
        />
        <StatCard 
          title="Active Requirements" 
          value={activeRequirements}
          subValue={`${pendingJdCount} JDs pending`}
          trend="+5" 
          icon={Briefcase} 
          color="bg-gradient-to-br from-indigo-500 to-indigo-600"
          onClick={() => {
            setRequirementStatusFilter('Active');
            setIsRequirementsModalOpen(true);
          }}
        />
        <StatCard 
          title="Candidate Pipeline" 
          value={CANDIDATE_STATS.total}
          subValue={`${CANDIDATE_STATS.bySource[0].count} from forms`}
          trend="+22" 
          icon={Users} 
          color="bg-gradient-to-br from-purple-500 to-purple-600"
        />
        <StatCard 
          title="Proj. Revenue" 
          value="₹12.5L" 
          subValue="From 8 Active Offers"
          trend="+12%" 
          icon={DollarSign} 
          color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
        />
        <StatCard 
          title="Timesheet Comp." 
          value="92%" 
          subValue="2 Missing Today"
          trend="-3%"
          icon={Clock} 
          color="bg-gradient-to-br from-slate-600 to-slate-700" 
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Charts & Workflow (2/3) */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          
          {/* Requirement Workflow Status (Module 6) - Clickable */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <GitBranch size={20} className="text-indigo-600" />
                  Requirement Workflow Status
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Module 6 • Full lifecycle visibility • Click to drill down</p>
              </div>
              <button 
                onClick={() => {
                  setRequirementStatusFilter(null);
                  setIsRequirementsModalOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                View All <ExternalLink size={12} />
              </button>
            </div>
            
            <div className="grid grid-cols-4 gap-3 mb-4">
              {filteredWorkflowData.slice(0, 4).map((item) => (
                <MiniStatCard 
                  key={item.status}
                  label={item.status}
                  value={item.count}
                  color="bg-indigo-600"
                  icon={Briefcase}
                  onClick={() => {
                    setRequirementStatusFilter(item.status);
                    setIsRequirementsModalOpen(true);
                  }}
                />
              ))}
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {filteredWorkflowData.slice(4).map((item) => (
                <MiniStatCard 
                  key={item.status}
                  label={item.status}
                  value={item.count}
                  color="bg-slate-700"
                  icon={item.status.includes('Closed') ? CheckCircle2 : Clock}
                  onClick={() => {
                    setRequirementStatusFilter(item.status);
                    setIsRequirementsModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>

          {/* Activity Velocity Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-0 overflow-hidden" style={{ minWidth: 0 }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Recruitment Velocity</h3>
                <p className="text-xs text-slate-500 font-medium">Candidates • Interviews • Calls (Last 7 Days)</p>
              </div>
              <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                <MoreHorizontal size={16} />
              </button>
            </div>
            
            <div style={{ width: '100%', height: '320px', minHeight: '320px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={320} minHeight={320}>
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="candidates" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCand)" name="Candidates" />
                  <Area type="monotone" dataKey="interviews" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInterview)" name="Interviews" />
                  <Area type="monotone" dataKey="calls" stroke="#f59e0b" strokeWidth={2} fill="transparent" name="Calls" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Company & Lead Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Module 3: Company Breakdown by MOU Status */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Companies by MOU Status</h3>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">Module 3</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {COMPANY_STATS.byMOUStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-sm font-bold text-slate-700">{item.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-extrabold text-slate-900">{item.count}</span>
                      <span className="text-xs text-slate-400">/{COMPANY_STATS.total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 9: Lead Pipeline */}
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl shadow-sm border border-indigo-100">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Lead Conversion Funnel</h3>
                  <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Module 9 • {LEAD_PIPELINE.conversionRate}% Rate</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                  <span className="text-sm font-bold text-slate-600">Total Leads</span>
                  <span className="text-2xl font-extrabold text-slate-900">{LEAD_PIPELINE.totalLeads}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                  <span className="text-sm font-bold text-slate-600">→ Companies</span>
                  <span className="text-xl font-extrabold text-indigo-600">{LEAD_PIPELINE.convertedToCompany}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
                  <span className="text-sm font-bold text-slate-600">→ Requirements</span>
                  <span className="text-xl font-extrabold text-emerald-600">{LEAD_PIPELINE.convertedToRequirement}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column - Alerts & Feed (1/3) */}
        <div className="space-y-6">
           
           {/* The Red Zone - Enhanced with Actions */}
           <div className="bg-white p-5 rounded-2xl border-2 border-rose-200 shadow-[0_4px_24px_-2px_rgba(225,29,72,0.12)]">
              <div className="flex items-center gap-2 mb-4">
                 <div className="p-2 bg-rose-100 text-rose-600 rounded-lg animate-pulse">
                    <AlertCircle size={20} />
                 </div>
                 <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">The Red Zone</h3>
                      <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">{alertsData.length} Critical Actions</p>
                 </div>
              </div>
              <div className="space-y-2.5">
                    {alertsData.map((alert) => (
                    <RedZoneItem 
                      key={alert.id} 
                      alert={alert}
                      onClick={() => setSelectedAlert(alert)}
                    />
                 ))}
              </div>
              <button className="w-full mt-4 py-2.5 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border-2 border-rose-200 rounded-xl hover:border-rose-600 transition-all">
                 View All Critical Alerts
              </button>
           </div>

           {/* Upcoming Deadlines */}
           <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                 <Calendar size={18} className="text-amber-600" />
                 <div>
                    <h3 className="text-sm font-bold text-slate-800">Interview Closing Dates</h3>
                    <p className="text-[10px] text-amber-600 font-bold">Next 7 Days</p>
                 </div>
              </div>
              
              <div className="space-y-2.5">
                 {filteredDeadlinesData.map((deadline: any) => (
                    <div key={deadline.id} className={`p-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer ${
                      deadline.status === 'urgent' ? 'bg-red-50 border-red-200' :
                      deadline.status === 'warning' ? 'bg-amber-50 border-amber-200' :
                      'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[10px] font-bold font-mono text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">{deadline.id}</span>
                        <span className={`text-xs font-bold ${
                          deadline.status === 'urgent' ? 'text-red-700' :
                          deadline.status === 'warning' ? 'text-amber-700' :
                          'text-slate-600'
                        }`}>{deadline.daysLeft}d left</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 truncate">{deadline.company}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{deadline.role}</p>
                    </div>
                 ))}
              </div>
           </div>

           {/* Live Activity Feed */}
           <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={16} className="text-indigo-500" /> Live Feed
                 </h3>
                 <span className="flex items-center gap-1">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Real-time</span>
                 </span>
              </div>
              
              <div className="relative pl-4 space-y-5 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                  {filteredLiveFeedData.map((act: any) => (
                    <div key={act.id} className="relative group">
                       <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                         act.type === 'interview' ? 'bg-emerald-500' :
                         act.type === 'status' ? 'bg-indigo-500' :
                         act.type === 'finance' ? 'bg-amber-500' :
                         'bg-purple-500'
                       }`}></div>
                       <p className="text-xs text-slate-600 leading-relaxed">
                          <span className="font-bold text-slate-900">{act.user}</span> {act.action} <span className="font-bold text-indigo-600">{act.target}</span>
                       </p>
                       <span className="text-[10px] font-medium text-slate-400">{act.time}</span>
                    </div>
                 ))}
              </div>
              
              <button className="w-full mt-4 py-2 text-xs font-bold text-slate-500 hover:text-indigo-600 border border-dashed border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                 View Full Activity Log
              </button>
           </div>

        </div>
      </div>

      {/* Pending JDs & Stalled Requirements Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Module 4: Pending JDs */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <FileText size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Pending JDs</h3>
                <p className="text-xs text-amber-600 font-bold">Module 4 • {filteredPendingJds.length} Awaiting Completion</p>
              </div>
            </div>
            <button className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              View All <ExternalLink size={12} />
            </button>
          </div>
          
          <div className="space-y-3">
            {filteredPendingJds.map((jd) => (
              <div key={jd.id} className="p-4 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all group cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{jd.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${jd.priority === 'High' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{jd.priority}</span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400" />
                      {jd.company}
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">{jd.daysPending}d</span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Assigned: <span className="font-bold text-slate-700">{jd.assignedTo}</span></span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/dashboard/activities');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 border border-transparent hover:border-indigo-200 flex items-center gap-1"
                  >
                    <Send size={12} /> Follow Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Module 6: Stalled Requirements */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <Clock size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Stalled Requirements</h3>
                <p className="text-xs text-rose-600 font-bold">Module 6 • {STALLED_REQUIREMENTS.length} Need Immediate Action</p>
              </div>
            </div>
            <button className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
              View All <ExternalLink size={12} />
            </button>
          </div>
          
          <div className="space-y-3">
            {STALLED_REQUIREMENTS.map((req) => (
              <div key={req.id} className="p-4 rounded-xl border border-slate-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all group cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">{req.id}</span>
                    <h4 className="font-bold text-slate-800 text-sm mt-2 flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400" />
                      {req.company}
                    </h4>
                  </div>
                  <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">{req.lastActivity}</span>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Owner: <span className="font-bold text-slate-700">{req.owner}</span></span>
                  </div>
                  <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-500">Reason:</span> {req.reason}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/dashboard/requirements');
                    }}
                    className="w-full text-xs font-bold text-rose-600 hover:bg-rose-600 hover:text-white px-3 py-2 rounded-lg transition-all border border-rose-200 hover:border-rose-600 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1"
                  >
                    <AlertCircle size={12} /> Escalate Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom: Requirements by Group & Work Mode */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Requirements by Group */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100" style={{ minWidth: 0 }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Requirements by Group</h3>
              <p className="text-xs text-slate-500 font-medium">Module 4 • Team-wise distribution</p>
            </div>
          </div>
          
          <div style={{ width: '100%', height: '240px', minHeight: '240px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={240} minHeight={240}>
              <BarChart data={REQUIREMENTS_BY_GROUP} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                <Bar dataKey="active" fill="#6366f1" radius={[8, 8, 0, 0]} name="Active" />
                <Bar dataKey="pending" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Pending" />
                <Bar dataKey="closed" fill="#10b981" radius={[8, 8, 0, 0]} name="Closed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Work Mode & Candidate Source */}
        <div className="space-y-6">
          {/* Work Mode Distribution */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Work Mode Distribution</h3>
            <div className="space-y-3">
              {WORK_MODE_DATA.map((mode) => (
                <div key={mode.mode} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mode.color }}></div>
                    <span className="text-xs font-bold text-slate-600">{mode.mode}</span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900">{mode.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Candidate Source */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Candidate Sources</h3>
            <div className="space-y-3">
              {CANDIDATE_STATS.bySource.map((source, _index) => (
                <div key={source.source} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">{source.source}</span>
                  <span className="text-lg font-extrabold text-slate-900">{source.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <FilterModal 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />

      <CompanyDetailsModal 
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
      />

      <RequirementsModal 
        isOpen={isRequirementsModalOpen}
        onClose={() => {
          setIsRequirementsModalOpen(false);
          setRequirementStatusFilter(null);
        }}
        statusFilter={requirementStatusFilter}
      />

      <AlertActionModal 
        isOpen={selectedAlert !== null}
        onClose={() => setSelectedAlert(null)}
        alert={selectedAlert}
      />
    </div>
  );
}
