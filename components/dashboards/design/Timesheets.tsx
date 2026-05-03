"use client";

import React, { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  Lock, 
  Unlock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Bell,
  FileText,
  User,
  Plus,
  X,
  Briefcase,
  TrendingUp,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Eye,
  Check,
  Send,
  Edit2,
  Trash2
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
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend
} from 'recharts';

// --- Types ---
type TimesheetStatus = 'approved' | 'pending' | 'missing' | 'rejected' | 'draft';
type WorkType = 'calls' | 'emails' | 'whatsapp' | 'interviews' | 'meetings' | 'documentation' | 'sourcing' | 'screening';

interface TaskEntry {
  id: string;
  requirementId: string;
  workType: WorkType;
  description: string;
  hours: number;
  startTime: string;
  endTime: string;
}

interface DailyEntry {
  date: string;
  hours: number;
  status: TimesheetStatus;
  tasks?: TaskEntry[];
}

interface UserTimesheet {
  id: string;
  name: string;
  role: string;
  avatar: string;
  entries: DailyEntry[];
  totalHours: number;
  complianceScore: number;
  email: string;
  lastSubmission?: string;
}

// --- Mock Data ---
const WEEK_DAYS = ['Mon 03', 'Tue 04', 'Wed 05', 'Thu 06', 'Fri 07'];

const MOCK_TASKS: TaskEntry[] = [
  { id: 'T1', requirementId: 'REQ-24-IT-085', workType: 'calls', description: 'Candidate screening calls for TechCorp', hours: 2.5, startTime: '09:00', endTime: '11:30' },
  { id: 'T2', requirementId: 'REQ-24-BFSI-012', workType: 'emails', description: 'Follow-up emails to shortlisted candidates', hours: 1.0, startTime: '11:30', endTime: '12:30' },
  { id: 'T3', requirementId: 'REQ-24-IT-085', workType: 'interviews', description: 'Conducted 3 technical interviews', hours: 4.0, startTime: '14:00', endTime: '18:00' },
  { id: 'T4', requirementId: 'REQ-24-MFG-041', workType: 'documentation', description: 'JD creation and requirement documentation', hours: 0.5, startTime: '12:30', endTime: '13:00' }
];

const STAFF_DATA: UserTimesheet[] = [
  {
    id: 'U-001',
    name: 'Rashmi Sharma',
    role: 'Coordinator',
    avatar: 'bg-indigo-500',
    email: 'rashmi@company.com',
    totalHours: 42,
    complianceScore: 100,
    lastSubmission: '2 hours ago',
    entries: [
      { date: 'Mon 03', hours: 8.5, status: 'approved', tasks: MOCK_TASKS },
      { date: 'Tue 04', hours: 9.0, status: 'approved' },
      { date: 'Wed 05', hours: 8.0, status: 'approved' },
      { date: 'Thu 06', hours: 8.5, status: 'approved' },
      { date: 'Fri 07', hours: 8.0, status: 'pending' },
    ]
  },
  {
    id: 'U-002',
    name: 'Manjunath K.',
    role: 'Sr. Recruiter',
    avatar: 'bg-emerald-500',
    email: 'manjunath@company.com',
    totalHours: 38,
    complianceScore: 95,
    lastSubmission: '5 hours ago',
    entries: [
      { date: 'Mon 03', hours: 8.0, status: 'approved' },
      { date: 'Tue 04', hours: 8.0, status: 'approved' },
      { date: 'Wed 05', hours: 7.5, status: 'approved' },
      { date: 'Thu 06', hours: 8.0, status: 'pending' },
      { date: 'Fri 07', hours: 6.5, status: 'draft' },
    ]
  },
  {
    id: 'U-003',
    name: 'Amit Patel',
    role: 'Recruiter',
    avatar: 'bg-rose-500',
    email: 'amit@company.com',
    totalHours: 24,
    complianceScore: 60,
    lastSubmission: '2 days ago',
    entries: [
      { date: 'Mon 03', hours: 8.0, status: 'approved' },
      { date: 'Tue 04', hours: 0, status: 'missing' },
      { date: 'Wed 05', hours: 8.0, status: 'approved' },
      { date: 'Thu 06', hours: 0, status: 'missing' },
      { date: 'Fri 07', hours: 8.0, status: 'pending' },
    ]
  },
  {
    id: 'U-004',
    name: 'Sarah Jenkins',
    role: 'Coordinator',
    avatar: 'bg-amber-500',
    email: 'sarah@company.com',
    totalHours: 45,
    complianceScore: 100,
    lastSubmission: '1 hour ago',
    entries: [
      { date: 'Mon 03', hours: 9.0, status: 'approved' },
      { date: 'Tue 04', hours: 9.5, status: 'approved' },
      { date: 'Wed 05', hours: 8.5, status: 'approved' },
      { date: 'Thu 06', hours: 9.0, status: 'approved' },
      { date: 'Fri 07', hours: 9.0, status: 'approved' },
    ]
  },
  {
    id: 'U-005',
    name: 'Priya Reddy',
    role: 'Recruiter',
    avatar: 'bg-purple-500',
    email: 'priya@company.com',
    totalHours: 32,
    complianceScore: 80,
    lastSubmission: '1 day ago',
    entries: [
      { date: 'Mon 03', hours: 8.0, status: 'approved' },
      { date: 'Tue 04', hours: 8.0, status: 'approved' },
      { date: 'Wed 05', hours: 8.0, status: 'approved' },
      { date: 'Thu 06', hours: 8.0, status: 'approved' },
      { date: 'Fri 07', hours: 0, status: 'missing' },
    ]
  }
];

// Analytics Data
const WORK_TYPE_BREAKDOWN = [
  { type: 'Calls', hours: 87, color: '#3b82f6' },
  { type: 'Emails', hours: 52, color: '#6366f1' },
  { type: 'Interviews', hours: 68, color: '#10b981' },
  { type: 'Sourcing', hours: 44, color: '#f59e0b' },
  { type: 'Documentation', hours: 28, color: '#8b5cf6' }
];

const WEEKLY_TREND_DATA = [
  { week: 'Week 1', hours: 176, compliance: 92 },
  { week: 'Week 2', hours: 182, compliance: 88 },
  { week: 'Week 3', hours: 185, compliance: 94 },
  { week: 'Week 4', hours: 181, compliance: 92 }
];

const REQUIREMENT_WISE_EFFORT = [
  { reqId: 'REQ-24-IT-085', company: 'TechCorp', hours: 42, percentage: 24 },
  { reqId: 'REQ-24-BFSI-012', company: 'HDFC Bank', hours: 38, percentage: 22 },
  { reqId: 'REQ-24-MFG-041', company: 'Tata Motors', hours: 35, percentage: 20 },
  { reqId: 'REQ-24-IT-092', company: 'Infosys', hours: 28, percentage: 16 },
  { reqId: 'Others', company: 'Various', hours: 32, percentage: 18 }
];

// --- Components ---

const StatusBadge = ({ status }: { status: TimesheetStatus }) => {
  const styles = {
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    pending: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    missing: 'bg-rose-100 text-rose-600 border-rose-200',
    rejected: 'bg-rose-100 text-rose-700 border-rose-200',
    draft: 'bg-slate-100 text-slate-500 border-slate-200'
  };

  const icons = {
    approved: CheckCircle2,
    pending: Clock,
    missing: XCircle,
    rejected: AlertCircle,
    draft: FileText
  };

  const Icon = icons[status];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider ${styles[status]}`}>
      <Icon size={10} />
      {status}
    </div>
  );
};

const HoursCell = ({ entry, onClick }: { entry: DailyEntry, onClick?: () => void }) => {
  let bgColor = 'bg-slate-50';
  let textColor = 'text-slate-400';
  let borderColor = 'border-slate-100';

  if (entry.status === 'missing') {
    bgColor = 'bg-rose-50';
    textColor = 'text-rose-400';
    borderColor = 'border-rose-200';
  } else if (entry.status === 'draft') {
    bgColor = 'bg-amber-50';
    textColor = 'text-amber-600';
    borderColor = 'border-amber-200';
  } else if (entry.hours >= 8) {
    bgColor = 'bg-emerald-50';
    textColor = 'text-emerald-700';
    borderColor = 'border-emerald-200';
  } else if (entry.hours > 0) {
    bgColor = 'bg-indigo-50';
    textColor = 'text-indigo-600';
    borderColor = 'border-indigo-200';
  }

  return (
    <div 
      onClick={onClick}
      className={`h-14 w-full rounded-xl border-2 ${borderColor} ${bgColor} flex flex-col items-center justify-center cursor-pointer hover:scale-105 hover:shadow-md transition-all group relative`}
    >
      {entry.hours > 0 ? (
        <>
          <span className={`text-base font-extrabold ${textColor}`}>{entry.hours}h</span>
          {entry.status === 'pending' && (
            <div className="flex items-center gap-1 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[9px] font-bold text-indigo-600 uppercase">Pending</span>
            </div>
          )}
          {entry.tasks && entry.tasks.length > 0 && (
            <span className="text-[9px] font-medium text-slate-400 mt-0.5">{entry.tasks.length} tasks</span>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center">
          <XCircle size={20} className="text-rose-300 mb-1" />
          <span className="text-[9px] font-bold text-rose-400 uppercase">Missing</span>
        </div>
      )}
      
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-xl">
        {entry.status === 'missing' ? 'Missing Submission - Click to Remind' : `${entry.status} • Click to View Details`}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
};

// Task Detail Modal
const TaskDetailModal = ({ isOpen, onClose, entry, userName }: { isOpen: boolean, onClose: () => void, entry: DailyEntry | null, userName: string }) => {
  if (!isOpen || !entry) return null;

  const workTypeIcons: Record<WorkType, any> = {
    calls: Phone,
    emails: Mail,
    whatsapp: MessageSquare,
    interviews: Users,
    meetings: Calendar,
    documentation: FileText,
    sourcing: Search,
    screening: Eye
  };

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden flex flex-col max-h-[85vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock size={20} className="text-indigo-600" />
                Timesheet Detail: {entry.date}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {userName} • {entry.hours}h logged • Status: <span className="font-bold capitalize">{entry.status}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {entry.tasks && entry.tasks.length > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Task Breakdown</h3>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                    {entry.tasks.length} Tasks Logged
                  </span>
                </div>

                {entry.tasks.map((task, index) => {
                  const Icon = workTypeIcons[task.workType] || Briefcase;
                  return (
                    <div key={task.id} className="p-5 rounded-xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Icon size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 capitalize">{task.workType}</h4>
                            <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 mt-1 inline-block">
                              {task.requirementId}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-extrabold text-slate-900">{task.hours}h</div>
                          <div className="text-[10px] text-slate-500 font-medium">{task.startTime} - {task.endTime}</div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 pl-14">{task.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText size={48} className="text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-500">No task details available for this entry.</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex gap-2">
              {entry.status === 'pending' && (
                <>
                  <button className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2">
                    <Check size={16} /> Approve
                  </button>
                  <button className="px-4 py-2.5 rounded-xl text-sm font-bold text-rose-600 border-2 border-rose-200 hover:bg-rose-50 transition-all flex items-center gap-2">
                    <X size={16} /> Reject
                  </button>
                </>
              )}
            </div>
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Add Timesheet Modal
const AddTimesheetModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Add Timesheet Entry</h2>
              <p className="text-xs text-slate-500 mt-1">Module 10 • Daily work log with requirement mapping</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-8 overflow-y-auto custom-scrollbar">
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date *</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-amber-600 font-medium">⚠️ Backdating restricted beyond 2 days</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Hours *</label>
                  <input 
                    type="number" 
                    step="0.5"
                    min="0"
                    max="12"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                    placeholder="8.0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Requirement ID *</label>
                <select className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-white text-sm font-medium text-slate-700">
                  <option value="">Select Requirement...</option>
                  <option value="REQ-24-IT-085">REQ-24-IT-085 (TechCorp - Backend Dev)</option>
                  <option value="REQ-24-BFSI-012">REQ-24-BFSI-012 (HDFC Bank - Business Analyst)</option>
                  <option value="REQ-24-MFG-041">REQ-24-MFG-041 (Tata Motors - Project Manager)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Type *</label>
                <div className="grid grid-cols-4 gap-3">
                  {['Calls', 'Emails', 'WhatsApp', 'Interviews', 'Meetings', 'Documentation', 'Sourcing', 'Screening'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      className="p-3 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-xs font-bold text-slate-600 hover:text-indigo-700 transition-all"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Description *</label>
                <textarea 
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium resize-none" 
                  placeholder="Describe the work performed in detail..."
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</label>
                  <input 
                    type="time" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</label>
                  <input 
                    type="time" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium" 
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
              Cancel
            </button>
            <button className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
              <Check size={16} /> Submit Entry
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default function Timesheets() {
  const [isWeekLocked, setIsWeekLocked] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState('Feb 03 - Feb 09, 2026');
  const [selectedView, setSelectedView] = useState<'matrix' | 'personwise' | 'reqwise' | 'analytics'>('matrix');
  const [selectedEntry, setSelectedEntry] = useState<{ entry: DailyEntry, userName: string } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | TimesheetStatus>('all');

  const filteredStaff = STAFF_DATA.filter(staff => 
    staff.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (filterStatus === 'all' || staff.entries.some(e => e.status === filterStatus))
  );

  const totalHours = STAFF_DATA.reduce((sum, staff) => sum + staff.totalHours, 0);
  const avgCompliance = Math.round(STAFF_DATA.reduce((sum, staff) => sum + staff.complianceScore, 0) / STAFF_DATA.length);
  const missingCount = STAFF_DATA.reduce((sum, staff) => sum + staff.entries.filter(e => e.status === 'missing').length, 0);
  const pendingCount = STAFF_DATA.reduce((sum, staff) => sum + staff.entries.filter(e => e.status === 'pending').length, 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 min-w-0">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_20px_-4px_rgba(6,11,40,0.08)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-200">
                <Clock size={24} />
              </div>
              Timesheet Governance
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium max-w-2xl">
              MMDSS Module 10 • Track effort, enforce accountability, prevent backdating, and ensure audit-ready records.
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            {/* Week Selector */}
            <div className="flex items-center gap-2 bg-white border-2 border-slate-200 rounded-xl px-2 py-1 shadow-sm">
              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-slate-700 w-44 text-center">{selectedWeek}</span>
              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>

            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <Plus size={16} />
              Add Entry
            </button>

            {/* Lock Action */}
            <button 
              onClick={() => setIsWeekLocked(!isWeekLocked)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all active:scale-95 ${
                isWeekLocked 
                  ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 hover:bg-emerald-200' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isWeekLocked ? <Lock size={16} /> : <Unlock size={16} />}
              {isWeekLocked ? 'Week Locked' : 'Lock Period'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Hours</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{totalHours}h</h3>
              </div>
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">Avg Compliance</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{avgCompliance}%</h3>
              </div>
              <TrendingUp className="text-indigo-500" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-rose-50 to-white p-4 rounded-xl border border-rose-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">Missing Entries</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{missingCount}</h3>
              </div>
              <AlertCircle className="text-rose-500 animate-pulse" size={32} />
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-xl border border-amber-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">Pending Approval</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{pendingCount}</h3>
              </div>
              <Clock className="text-amber-500" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          {[
            { id: 'matrix', label: 'Matrix View', icon: null },
            { id: 'personwise', label: 'Person-wise', icon: User },
            { id: 'reqwise', label: 'Requirement-wise', icon: Briefcase },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setSelectedView(view.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                selectedView === view.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {view.icon && <view.icon size={16} />}
              {view.label}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-200 transition-all">
          <Download size={16} />
          Export Payroll CSV
        </button>
      </div>

      {/* Main Content */}
      {selectedView === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff..." 
                  className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-64 transition-all"
                />
              </div>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="missing">Missing</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-100 border-2 border-emerald-200"></div> 
                  Full Day (8h+)
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-indigo-100 border-2 border-indigo-200"></div> 
                  Partial
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-rose-100 border-2 border-rose-200"></div> 
                  Missing
                </div>
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <button className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1.5">
                <Send size={14} />
                Remind All ({missingCount})
              </button>
            </div>
          </div>

          {/* Matrix Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-4 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-3 pl-2">Employee</div>
            <div className="col-span-1 text-center">Compliance</div>
            {WEEK_DAYS.map((day) => (
              <div key={day} className="col-span-1 text-center">{day.split(' ')[0]}<br/><span className="text-[10px] font-medium">{day.split(' ')[1]}</span></div>
            ))}
            <div className="col-span-1 text-center">Total</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>

          {/* Matrix Rows */}
          <div className="divide-y divide-slate-100">
            {filteredStaff.map((staff, idx) => (
              <motion.div 
                key={staff.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="grid grid-cols-12 gap-2 px-4 py-4 items-center hover:bg-slate-50/50 transition-colors group"
              >
                {/* Employee Info */}
                <div className="col-span-3 flex items-center gap-3 pl-2">
                  <div className={`w-11 h-11 rounded-full ${staff.avatar} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                    {staff.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">{staff.name}</h4>
                    <p className="text-xs text-slate-500">{staff.role}</p>
                  </div>
                </div>

                {/* Compliance Score */}
                <div className="col-span-1 flex justify-center">
                  <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                    staff.complianceScore >= 90 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 
                    staff.complianceScore >= 70 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                    'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}>
                    {staff.complianceScore}%
                  </div>
                </div>

                {/* Days */}
                {staff.entries.map((entry, idx) => (
                  <div key={idx} className="col-span-1 px-1">
                    <HoursCell 
                      entry={entry} 
                      onClick={() => setSelectedEntry({ entry, userName: staff.name })}
                    />
                  </div>
                ))}

                {/* Total */}
                <div className="col-span-1 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-extrabold text-slate-900">{staff.totalHours}h</span>
                    <span className="text-[9px] text-slate-400 font-medium mt-0.5">of 40h</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-1 flex justify-center gap-1">
                  <button className="p-2 hover:bg-indigo-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="View Details">
                    <Eye size={16} />
                  </button>
                  <button className="p-2 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors" title="Send Reminder">
                    <Send size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
          
          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="text-slate-300 mx-auto mb-4" />
              <p className="text-sm font-medium text-slate-500">No staff members match your filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics View */}
      {selectedView === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Work Type Breakdown */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" style={{ minWidth: 0 }}>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">Work Type Distribution</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Hours logged by activity type this week</p>
            </div>
            
            <div style={{ width: '100%', height: '300px', minHeight: '300px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={300} minHeight={300}>
                <BarChart data={WORK_TYPE_BREAKDOWN} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                  <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
                    {WORK_TYPE_BREAKDOWN.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100" style={{ minWidth: 0 }}>
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800">Weekly Compliance Trend</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Hours & compliance rate over last 4 weeks</p>
            </div>
            
            <div style={{ width: '100%', height: '300px', minHeight: '300px', minWidth: 0 }}>
              <ResponsiveContainer width="100%" height={300} minHeight={300}>
                <LineChart data={WEEKLY_TREND_DATA} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 700 }} />
                  <Line yAxisId="left" type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} dot={{ r: 6 }} name="Total Hours" />
                  <Line yAxisId="right" type="monotone" dataKey="compliance" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} name="Compliance %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Requirement-wise Effort */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Requirement-wise Effort Distribution</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Time allocation across active requirements</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {REQUIREMENT_WISE_EFFORT.map((req, index) => (
                <div key={req.reqId} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                        {req.reqId}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm">{req.company}</h4>
                    </div>
                    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${req.percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-slate-900">{req.hours}h</div>
                    <div className="text-xs font-bold text-indigo-600">{req.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Person-wise View */}
      {selectedView === 'personwise' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStaff.map((staff, idx) => (
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl ${staff.avatar} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {staff.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{staff.name}</h4>
                    <p className="text-xs text-slate-500 font-medium">{staff.role}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Last: {staff.lastSubmission}</p>
                  </div>
                </div>
                <div className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                  staff.complianceScore >= 90 ? 'bg-emerald-100 text-emerald-700' : 
                  staff.complianceScore >= 70 ? 'bg-amber-100 text-amber-700' : 
                  'bg-rose-100 text-rose-700'
                }`}>
                  {staff.complianceScore}%
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {staff.entries.map((entry, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs font-bold text-slate-600">{entry.date}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-extrabold ${
                        entry.status === 'missing' ? 'text-rose-600' :
                        entry.hours >= 8 ? 'text-emerald-600' :
                        'text-indigo-600'
                      }`}>
                        {entry.hours > 0 ? `${entry.hours}h` : 'Missing'}
                      </span>
                      <StatusBadge status={entry.status} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Weekly Total</p>
                  <h3 className="text-2xl font-extrabold text-slate-900">{staff.totalHours}h</h3>
                </div>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2">
                  <Eye size={14} /> View Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Requirement-wise View */}
      {selectedView === 'reqwise' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Requirement-wise Time Allocation</h3>
            <p className="text-xs text-slate-500 font-medium">Track hours logged per requirement for billing and effort analysis</p>
          </div>
          
          <div className="divide-y divide-slate-100">
            {REQUIREMENT_WISE_EFFORT.map((req, index) => (
              <div key={req.reqId} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100">
                        {req.reqId}
                      </span>
                      <h4 className="font-bold text-slate-900 mt-1">{req.company}</h4>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-slate-900">{req.hours}h</div>
                    <div className="text-xs font-bold text-indigo-600">{req.percentage}% of total</div>
                  </div>
                </div>
                
                <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${req.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <TaskDetailModal 
        isOpen={selectedEntry !== null}
        onClose={() => setSelectedEntry(null)}
        entry={selectedEntry?.entry || null}
        userName={selectedEntry?.userName || ''}
      />

      <AddTimesheetModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
