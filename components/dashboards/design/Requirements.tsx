"use client";

import React, { useState } from 'react';
import { 
  Briefcase, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Grid3x3, 
  List, 
  MoreHorizontal,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Clock,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  Send,
  ArrowRight,
  Building2,
  FileText,
  Zap,
  BarChart3,
  Phone,
  Mail,
  MessageSquare,
  X,
  ChevronDown,
  Copy,
  ExternalLink,
  GitBranch,
  PauseCircle,
  PlayCircle,
  Coffee
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

// ========== TYPES ==========
type RequirementStatus = 'Pending Intake' | 'Awaiting JD' | 'Active' | 'Sourcing' | 'Interviewing' | 'Offer' | 'Closed - Hired' | 'On Hold';
type WorkMode = 'Remote' | 'Hybrid' | 'Office';
type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

interface Requirement {
  id: string;
  company: string;
  companyId: string;
  role: string;
  status: RequirementStatus;
  priority: Priority;
  owner: string;
  createdDate: string;
  targetDate: string;
  salary: string;
  location: string;
  workMode: WorkMode;
  positions: number;
  candidates: number;
  daysOpen: number;
  sector: string;
  skills: string[];
  experience: string;
  description?: string;
  jdReceived: boolean;
  lastActivity: string;
}

// ========== MOCK DATA ==========
const MOCK_REQUIREMENTS: Requirement[] = [
  {
    id: 'REQ-24-IT-085',
    company: 'TechCorp India',
    companyId: 'C-001',
    role: 'Senior Backend Developer',
    status: 'Active',
    priority: 'High',
    owner: 'Rashmi',
    createdDate: '2024-01-20',
    targetDate: '2024-02-15',
    salary: '12-18 LPA',
    location: 'Bangalore',
    workMode: 'Hybrid',
    positions: 3,
    candidates: 12,
    daysOpen: 15,
    sector: 'IT',
    skills: ['Node.js', 'Python', 'AWS', 'PostgreSQL'],
    experience: '5-8 years',
    jdReceived: true,
    lastActivity: '2 hours ago'
  },
  {
    id: 'REQ-24-BFSI-012',
    company: 'HDFC Bank',
    companyId: 'C-002',
    role: 'Business Analyst',
    status: 'Interviewing',
    priority: 'Medium',
    owner: 'Manjunath',
    createdDate: '2024-01-08',
    targetDate: '2024-02-10',
    salary: '8-12 LPA',
    location: 'Mumbai',
    workMode: 'Office',
    positions: 2,
    candidates: 8,
    daysOpen: 22,
    sector: 'BFSI',
    skills: ['SQL', 'Tableau', 'Banking Domain', 'Agile'],
    experience: '3-5 years',
    jdReceived: true,
    lastActivity: '5 hours ago'
  },
  {
    id: 'REQ-24-MFG-041',
    company: 'Tata Motors',
    companyId: 'C-003',
    role: 'Project Manager',
    status: 'Sourcing',
    priority: 'High',
    owner: 'Rashmi',
    createdDate: '2024-01-25',
    targetDate: '2024-03-01',
    salary: '15-22 LPA',
    location: 'Pune',
    workMode: 'Office',
    positions: 1,
    candidates: 5,
    daysOpen: 10,
    sector: 'Manufacturing',
    skills: ['PMP', 'Automotive', 'Six Sigma', 'Leadership'],
    experience: '8-12 years',
    jdReceived: true,
    lastActivity: '1 day ago'
  },
  {
    id: 'REQ-24-IT-092',
    company: 'Infosys',
    companyId: 'C-004',
    role: 'Frontend Developer',
    status: 'Active',
    priority: 'Medium',
    owner: 'Manjunath',
    createdDate: '2024-01-28',
    targetDate: '2024-02-20',
    salary: '10-14 LPA',
    location: 'Hyderabad',
    workMode: 'Remote',
    positions: 5,
    candidates: 15,
    daysOpen: 8,
    sector: 'IT',
    skills: ['React', 'TypeScript', 'CSS', 'REST APIs'],
    experience: '3-6 years',
    jdReceived: true,
    lastActivity: '3 hours ago'
  },
  {
    id: 'REQ-24-BFSI-018',
    company: 'HDFC Bank',
    companyId: 'C-002',
    role: 'Data Analyst',
    status: 'Offer',
    priority: 'Low',
    owner: 'Amit Patel',
    createdDate: '2024-01-05',
    targetDate: '2024-02-05',
    salary: '6-9 LPA',
    location: 'Delhi',
    workMode: 'Hybrid',
    positions: 2,
    candidates: 3,
    daysOpen: 28,
    sector: 'BFSI',
    skills: ['Python', 'Excel', 'Power BI', 'Statistics'],
    experience: '2-4 years',
    jdReceived: true,
    lastActivity: '4 hours ago'
  },
  {
    id: 'REQ-24-IT-103',
    company: 'Wipro',
    companyId: 'C-006',
    role: 'DevOps Engineer',
    status: 'Awaiting JD',
    priority: 'High',
    owner: 'Rashmi',
    createdDate: '2024-02-01',
    targetDate: '2024-03-15',
    salary: '14-20 LPA',
    location: 'Bangalore',
    workMode: 'Hybrid',
    positions: 4,
    candidates: 0,
    daysOpen: 4,
    sector: 'IT',
    skills: ['Docker', 'Kubernetes', 'Jenkins', 'AWS'],
    experience: '4-7 years',
    jdReceived: false,
    lastActivity: '6 hours ago'
  },
  {
    id: 'REQ-24-IT-075',
    company: 'Wipro',
    companyId: 'C-006',
    role: 'Full Stack Developer',
    status: 'On Hold',
    priority: 'Medium',
    owner: 'Scraping Team',
    createdDate: '2024-01-15',
    targetDate: '2024-02-28',
    salary: '11-16 LPA',
    location: 'Chennai',
    workMode: 'Office',
    positions: 3,
    candidates: 7,
    daysOpen: 20,
    sector: 'IT',
    skills: ['MERN Stack', 'MongoDB', 'React', 'Node.js'],
    experience: '4-6 years',
    jdReceived: true,
    lastActivity: '5 days ago'
  },
  {
    id: 'REQ-24-BFSI-025',
    company: 'Axis Bank',
    companyId: 'C-005',
    role: 'Risk Analyst',
    status: 'Pending Intake',
    priority: 'Critical',
    owner: 'Manjunath',
    createdDate: '2024-02-03',
    targetDate: '2024-03-10',
    salary: '9-13 LPA',
    location: 'Mumbai',
    workMode: 'Office',
    positions: 2,
    candidates: 0,
    daysOpen: 2,
    sector: 'BFSI',
    skills: ['Risk Management', 'Finance', 'Credit Analysis'],
    experience: '3-5 years',
    jdReceived: false,
    lastActivity: '1 hour ago'
  }
];

const STATUS_COLORS = {
  'Pending Intake': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' },
  'Awaiting JD': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Active': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Sourcing': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  'Interviewing': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  'Offer': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Closed - Hired': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-600' },
  'On Hold': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' }
};

const PRIORITY_COLORS = {
  'Critical': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  'High': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  'Medium': { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  'Low': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
};

// Status distribution for charts
const STATUS_DISTRIBUTION = [
  { name: 'Active', value: 2, color: '#3b82f6' },
  { name: 'Sourcing', value: 1, color: '#8b5cf6' },
  { name: 'Interviewing', value: 1, color: '#6366f1' },
  { name: 'Offer', value: 1, color: '#10b981' },
  { name: 'Awaiting JD', value: 1, color: '#f59e0b' },
  { name: 'On Hold', value: 1, color: '#ef4444' },
  { name: 'Pending Intake', value: 1, color: '#94a3b8' }
];

// ========== MODALS ==========

// Create Requirement Modal with MMD-ID Generation
const CreateRequirementModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    sector: 'IT',
    priority: 'Medium',
    workMode: 'Hybrid',
    location: '',
    positions: 1,
    salary: '',
    experience: '',
    targetDate: '',
    owner: 'Rashmi',
    skills: '',
    description: ''
  });

  // Generate MMD-ID based on form data
  const generateMMDID = () => {
    const year = new Date().getFullYear().toString().slice(-2);
    const sectorCode = formData.sector.toUpperCase().slice(0, 4);
    const sequence = Math.floor(Math.random() * 900) + 100; // Random for demo
    return `REQ-${year}-${sectorCode}-${sequence}`;
  };

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Zap size={20} className="text-indigo-600" />
                Create New Requirement
              </h2>
              <p className="text-xs text-slate-500 mt-1">Module 4 • Golden Thread: MMD-ID will be auto-generated</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between">
              {[1, 2, 3].map((s) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                      step >= s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {s}
                    </div>
                    <p className={`text-xs font-bold mt-2 ${step >= s ? 'text-indigo-600' : 'text-slate-400'}`}>
                      {s === 1 && 'Basic Info'}
                      {s === 2 && 'Details'}
                      {s === 3 && 'Review & Generate'}
                    </p>
                  </div>
                  {s < 3 && (
                    <div className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                      step > s ? 'bg-indigo-600' : 'bg-slate-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Company *</label>
                    <select 
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="">Select Company</option>
                      <option value="TechCorp India">TechCorp India</option>
                      <option value="HDFC Bank">HDFC Bank</option>
                      <option value="Tata Motors">Tata Motors</option>
                      <option value="Infosys">Infosys</option>
                      <option value="Wipro">Wipro</option>
                      <option value="Axis Bank">Axis Bank</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Sector *</label>
                    <select 
                      value={formData.sector}
                      onChange={(e) => setFormData({...formData, sector: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="IT">IT</option>
                      <option value="BFSI">BFSI</option>
                      <option value="MFG">Manufacturing</option>
                      <option value="RETAIL">Retail</option>
                      <option value="HEALTH">Healthcare</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Role / Job Title *</label>
                  <input 
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    placeholder="e.g. Senior Backend Developer"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-3 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Priority *</label>
                    <select 
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Owner *</label>
                    <select 
                      value={formData.owner}
                      onChange={(e) => setFormData({...formData, owner: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="Rashmi">Rashmi</option>
                      <option value="Manjunath">Manjunath</option>
                      <option value="Amit Patel">Amit Patel</option>
                      <option value="Scraping Team">Scraping Team</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Positions *</label>
                    <input 
                      type="number"
                      value={formData.positions}
                      onChange={(e) => setFormData({...formData, positions: parseInt(e.target.value) || 1})}
                      min="1"
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Location *</label>
                    <input 
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="e.g. Bangalore, Mumbai"
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Work Mode *</label>
                    <select 
                      value={formData.workMode}
                      onChange={(e) => setFormData({...formData, workMode: e.target.value})}
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Office">Office</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Salary Range *</label>
                    <input 
                      type="text"
                      value={formData.salary}
                      onChange={(e) => setFormData({...formData, salary: e.target.value})}
                      placeholder="e.g. 12-18 LPA"
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Experience *</label>
                    <input 
                      type="text"
                      value={formData.experience}
                      onChange={(e) => setFormData({...formData, experience: e.target.value})}
                      placeholder="e.g. 5-8 years"
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Closure Date *</label>
                  <input 
                    type="date"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({...formData, targetDate: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Required Skills (comma separated)</label>
                  <input 
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({...formData, skills: e.target.value})}
                    placeholder="e.g. Node.js, Python, AWS, PostgreSQL"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Job Description</label>
                  <textarea 
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Enter detailed job description..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-medium resize-none"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {/* Generated MMD-ID Display */}
                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-8 rounded-2xl text-white text-center shadow-2xl">
                  <p className="text-sm font-bold opacity-90 mb-2">🎯 Generated Golden Thread ID</p>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <h2 className="text-4xl font-extrabold tracking-wider font-mono">{generateMMDID()}</h2>
                    <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                      <Copy size={20} />
                    </button>
                  </div>
                  <p className="text-xs opacity-75">This ID will be used for traceability, financial reconciliation, and audit compliance</p>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Company</p>
                    <p className="text-sm font-bold text-slate-900">{formData.company || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Role</p>
                    <p className="text-sm font-bold text-slate-900">{formData.role || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Sector</p>
                    <p className="text-sm font-bold text-slate-900">{formData.sector}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Priority</p>
                    <p className="text-sm font-bold text-slate-900">{formData.priority}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Location</p>
                    <p className="text-sm font-bold text-slate-900">{formData.location || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Work Mode</p>
                    <p className="text-sm font-bold text-slate-900">{formData.workMode}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Salary</p>
                    <p className="text-sm font-bold text-slate-900">{formData.salary || '-'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Owner</p>
                    <p className="text-sm font-bold text-slate-900">{formData.owner}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            {step > 1 ? (
              <button 
                onClick={() => setStep(step - 1)}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
              >
                Back
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all"
              >
                Cancel
              </button>
            )}
            
            <div className="flex gap-3">
              {step < 3 ? (
                <button 
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                >
                  Next
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button 
                  onClick={() => {
                    alert(`✅ Requirement ${generateMMDID()} created successfully!`);
                    onClose();
                    setStep(1);
                  }}
                  className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Create Requirement
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Requirement Details Modal
const RequirementDetailsModal = ({ isOpen, onClose, requirement }: { isOpen: boolean; onClose: () => void; requirement: Requirement | null }) => {
  if (!isOpen || !requirement) return null;

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
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-mono text-sm font-bold border border-indigo-200">
                  {requirement.id}
                </span>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[requirement.status].bg} ${STATUS_COLORS[requirement.status].text} ${STATUS_COLORS[requirement.status].border}`}>
                  {requirement.status}
                </span>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${PRIORITY_COLORS[requirement.priority].bg} ${PRIORITY_COLORS[requirement.priority].text} ${PRIORITY_COLORS[requirement.priority].border}`}>
                  {requirement.priority} Priority
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                <Building2 size={20} className="text-slate-400" />
                {requirement.company} - {requirement.role}
              </h2>
              <p className="text-xs text-slate-500">Created {requirement.createdDate} • {requirement.daysOpen} days open • Last activity: {requirement.lastActivity}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-xs text-blue-600 font-bold uppercase mb-1 flex items-center gap-1">
                  <Users size={12} /> Candidates
                </p>
                <p className="text-2xl font-extrabold text-blue-700">{requirement.candidates}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-xs text-emerald-600 font-bold uppercase mb-1 flex items-center gap-1">
                  <Target size={12} /> Positions
                </p>
                <p className="text-2xl font-extrabold text-emerald-700">{requirement.positions}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-xs text-amber-600 font-bold uppercase mb-1 flex items-center gap-1">
                  <Clock size={12} /> Days Open
                </p>
                <p className="text-2xl font-extrabold text-amber-700">{requirement.daysOpen}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-xs text-purple-600 font-bold uppercase mb-1 flex items-center gap-1">
                  <TrendingUp size={12} /> Fill Rate
                </p>
                <p className="text-2xl font-extrabold text-purple-700">
                  {Math.round((requirement.candidates / requirement.positions) * 10)}%
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Job Details</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Location</p>
                      <p className="text-sm font-bold text-slate-900">{requirement.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <DollarSign size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Salary Range</p>
                      <p className="text-sm font-bold text-slate-900">{requirement.salary}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Briefcase size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Experience</p>
                      <p className="text-sm font-bold text-slate-900">{requirement.experience}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Building2 size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Work Mode</p>
                      <p className="text-sm font-bold text-slate-900">{requirement.workMode}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Management</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Users size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Assigned To</p>
                      <p className="text-sm font-bold text-slate-900">{requirement.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Calendar size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Target Date</p>
                      <p className="text-sm font-bold text-slate-900">{requirement.targetDate}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <FileText size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">JD Status</p>
                      <p className={`text-sm font-bold ${requirement.jdReceived ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {requirement.jdReceived ? '✓ Received' : '✗ Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Target size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Sector</p>
                      <p className="text-sm font-bold text-slate-900">{requirement.sector}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {requirement.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                <Eye size={16} /> View All Candidates
              </button>
              <button className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                <Plus size={16} /> Add Candidate
              </button>
              <button className="px-4 py-3 bg-white border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 rounded-lg text-sm font-bold transition-all">
                <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Filter Modal with Coffee Animation
const FilterModal = ({ isOpen, onClose, filters, setFilters }: any) => {
  const [showCoffee, setShowCoffee] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setShowCoffee(true);
      setTimeout(() => setShowCoffee(false), 2000);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {showCoffee && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        >
          <div className="text-9xl">☕</div>
        </motion.div>
      )}
      
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
          transition={{ delay: showCoffee ? 0.5 : 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Filter size={20} className="text-indigo-600" />
                Advanced Filters
              </h2>
              <p className="text-xs text-slate-500 mt-1">Refine your requirement search</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Status Filter */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(STATUS_COLORS).map((status) => (
                  <label key={status} className="flex items-center gap-2 p-3 rounded-lg border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={filters.statuses?.includes(status)}
                      onChange={(e) => {
                        const newStatuses = e.target.checked 
                          ? [...(filters.statuses || []), status]
                          : (filters.statuses || []).filter((s: string) => s !== status);
                        setFilters({...filters, statuses: newStatuses});
                      }}
                      className="rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500/20" 
                    />
                    <span className="text-xs font-bold text-slate-700">{status}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
              <div className="flex gap-3">
                {['Critical', 'High', 'Medium', 'Low'].map((priority) => (
                  <label key={priority} className="flex items-center gap-2 flex-1 p-3 rounded-lg border-2 border-slate-200 hover:border-orange-300 hover:bg-orange-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={filters.priorities?.includes(priority)}
                      onChange={(e) => {
                        const newPriorities = e.target.checked 
                          ? [...(filters.priorities || []), priority]
                          : (filters.priorities || []).filter((p: string) => p !== priority);
                        setFilters({...filters, priorities: newPriorities});
                      }}
                      className="rounded text-orange-600 focus:ring-2 focus:ring-orange-500/20" 
                    />
                    <span className="text-xs font-bold text-slate-700">{priority}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Owner Filter */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</label>
              <select 
                value={filters.owner || 'all'}
                onChange={(e) => setFilters({...filters, owner: e.target.value})}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-white text-sm font-medium"
              >
                <option value="all">All Owners</option>
                <option value="Rashmi">Rashmi</option>
                <option value="Manjunath">Manjunath</option>
                <option value="Amit Patel">Amit Patel</option>
                <option value="Scraping Team">Scraping Team</option>
              </select>
            </div>

            {/* Work Mode Filter */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work Mode</label>
              <div className="flex gap-3">
                {['Remote', 'Hybrid', 'Office'].map((mode) => (
                  <label key={mode} className="flex items-center gap-2 flex-1 p-3 rounded-lg border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all">
                    <input 
                      type="checkbox" 
                      checked={filters.workModes?.includes(mode)}
                      onChange={(e) => {
                        const newModes = e.target.checked 
                          ? [...(filters.workModes || []), mode]
                          : (filters.workModes || []).filter((m: string) => m !== mode);
                        setFilters({...filters, workModes: newModes});
                      }}
                      className="rounded text-emerald-600 focus:ring-2 focus:ring-emerald-500/20" 
                    />
                    <span className="text-xs font-bold text-slate-700">{mode}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <button 
              onClick={() => setFilters({
                statuses: [],
                priorities: [],
                owner: 'all',
                workModes: []
              })}
              className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Reset All
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

// ========== MAIN COMPONENT ==========
export default function Requirements() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null);
  const [filters, setFilters] = useState({
    statuses: [] as string[],
    priorities: [] as string[],
    owner: 'all',
    workModes: [] as string[]
  });

  // Filter requirements
  const filteredRequirements = MOCK_REQUIREMENTS.filter(req => {
    const matchesSearch = searchQuery === '' || 
      req.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.role.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(req.status);
    const matchesPriority = filters.priorities.length === 0 || filters.priorities.includes(req.priority);
    const matchesOwner = filters.owner === 'all' || req.owner === filters.owner;
    const matchesWorkMode = filters.workModes.length === 0 || filters.workModes.includes(req.workMode);

    return matchesSearch && matchesStatus && matchesPriority && matchesOwner && matchesWorkMode;
  });

  // Stats
  const activeCount = MOCK_REQUIREMENTS.filter(r => r.status === 'Active').length;
  const totalCandidates = MOCK_REQUIREMENTS.reduce((sum, r) => sum + r.candidates, 0);
  const avgDaysOpen = Math.round(MOCK_REQUIREMENTS.reduce((sum, r) => sum + r.daysOpen, 0) / MOCK_REQUIREMENTS.length);
  const pendingJDs = MOCK_REQUIREMENTS.filter(r => !r.jdReceived).length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Requirements Management</h1>
          <p className="text-sm text-slate-500 font-medium">Module 4 • Golden Thread MMD-ID System • Complete Lifecycle Management</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all active:scale-95"
        >
          <Plus size={18} />
          Create Requirement
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <motion.div 
          whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)' }}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Briefcase size={24} className="opacity-80" />
            <TrendingUp size={16} className="opacity-60" />
          </div>
          <p className="text-3xl font-extrabold mb-1">{MOCK_REQUIREMENTS.length}</p>
          <p className="text-sm opacity-90 font-medium">Total Requirements</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)' }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 size={24} className="opacity-80" />
            <TrendingUp size={16} className="opacity-60" />
          </div>
          <p className="text-3xl font-extrabold mb-1">{activeCount}</p>
          <p className="text-sm opacity-90 font-medium">Active Requirements</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(139, 92, 246, 0.15)' }}
          className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Users size={24} className="opacity-80" />
            <BarChart3 size={16} className="opacity-60" />
          </div>
          <p className="text-3xl font-extrabold mb-1">{totalCandidates}</p>
          <p className="text-sm opacity-90 font-medium">Total Candidates</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(245, 158, 11, 0.15)' }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Clock size={24} className="opacity-80" />
            <AlertCircle size={16} className="opacity-60" />
          </div>
          <p className="text-3xl font-extrabold mb-1">{avgDaysOpen}</p>
          <p className="text-sm opacity-90 font-medium">Avg Days Open</p>
        </motion.div>
      </div>

      {/* Filters and View Controls */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by MMD-ID, Company, Role..." 
              className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-300 transition-all outline-none font-medium"
            />
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => setIsFilterModalOpen(true)}
              className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-200"
            >
              <Filter size={16} />
              Filters
              {(filters.statuses.length + filters.priorities.length + filters.workModes.length > 0 || filters.owner !== 'all') && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white rounded-full text-xs">
                  {filters.statuses.length + filters.priorities.length + filters.workModes.length + (filters.owner !== 'all' ? 1 : 0)}
                </span>
              )}
            </button>

            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                <Grid3x3 size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
              >
                <List size={16} />
              </button>
            </div>

            <button className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-slate-200">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.statuses.length > 0 || filters.priorities.length > 0 || filters.workModes.length > 0 || filters.owner !== 'all') && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-500">Active Filters:</span>
            {filters.statuses.map(s => (
              <span key={s} className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-bold flex items-center gap-1">
                {s}
                <button onClick={() => setFilters({...filters, statuses: filters.statuses.filter(st => st !== s)})}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {filters.priorities.map(p => (
              <span key={p} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold flex items-center gap-1">
                {p}
                <button onClick={() => setFilters({...filters, priorities: filters.priorities.filter(pr => pr !== p)})}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {filters.workModes.map(w => (
              <span key={w} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold flex items-center gap-1">
                {w}
                <button onClick={() => setFilters({...filters, workModes: filters.workModes.filter(wm => wm !== w)})}>
                  <X size={12} />
                </button>
              </span>
            ))}
            {filters.owner !== 'all' && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold flex items-center gap-1">
                {filters.owner}
                <button onClick={() => setFilters({...filters, owner: 'all'})}>
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Requirements Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRequirements.map((req, idx) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
              className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group"
              onClick={() => setSelectedRequirement(req)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-mono text-xs font-bold border border-indigo-200 inline-block mb-2">
                    {req.id}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{req.role}</h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Building2 size={12} />
                    {req.company}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <MoreHorizontal size={16} className="text-slate-400" />
                </button>
              </div>

              {/* Status & Priority */}
              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[req.status].bg} ${STATUS_COLORS[req.status].text} ${STATUS_COLORS[req.status].border} flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[req.status].dot}`}></span>
                  {req.status}
                </span>
                <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${PRIORITY_COLORS[req.priority].bg} ${PRIORITY_COLORS[req.priority].text} ${PRIORITY_COLORS[req.priority].border}`}>
                  {req.priority}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4 py-4 border-y border-slate-100">
                <div className="text-center">
                  <p className="text-xl font-extrabold text-indigo-600">{req.candidates}</p>
                  <p className="text-xs text-slate-500 font-bold">Candidates</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-extrabold text-emerald-600">{req.positions}</p>
                  <p className="text-xs text-slate-500 font-bold">Positions</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-extrabold text-amber-600">{req.daysOpen}</p>
                  <p className="text-xs text-slate-500 font-bold">Days</p>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <MapPin size={12} />
                    Location:
                  </span>
                  <span className="font-bold text-slate-900">{req.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <DollarSign size={12} />
                    Salary:
                  </span>
                  <span className="font-bold text-slate-900">{req.salary}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Users size={12} />
                    Owner:
                  </span>
                  <span className="font-bold text-slate-900">{req.owner}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Building2 size={12} />
                    Mode:
                  </span>
                  <span className="font-bold text-slate-900">{req.workMode}</span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRequirement(req);
                  }}
                  className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Eye size={12} /> View
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">MMD-ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company & Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidates</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Days Open</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequirements.map((req) => (
                  <motion.tr 
                    key={req.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedRequirement(req)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg font-mono text-xs font-bold border border-indigo-200">
                        {req.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{req.role}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <Building2 size={12} />
                          {req.company}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[req.status].bg} ${STATUS_COLORS[req.status].text} ${STATUS_COLORS[req.status].border} inline-flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[req.status].dot}`}></span>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${PRIORITY_COLORS[req.priority].bg} ${PRIORITY_COLORS[req.priority].text} ${PRIORITY_COLORS[req.priority].border}`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{req.owner}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600">{req.candidates}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600">{req.daysOpen}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequirement(req);
                          }}
                          className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredRequirements.length === 0 && (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Briefcase size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Requirements Found</h3>
          <p className="text-sm text-slate-500 mb-4">Try adjusting your filters or search criteria</p>
          <button 
            onClick={() => {
              setSearchQuery('');
              setFilters({ statuses: [], priorities: [], owner: 'all', workModes: [] });
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-all"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Modals */}
      <CreateRequirementModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <RequirementDetailsModal 
        isOpen={selectedRequirement !== null}
        onClose={() => setSelectedRequirement(null)}
        requirement={selectedRequirement}
      />

      <FilterModal 
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        setFilters={setFilters}
      />
    </div>
  );
}
