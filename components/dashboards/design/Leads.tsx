"use client";

import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Grid3x3, 
  List,
  TrendingUp,
  Users,
  Building2,
  Target,
  Zap,
  ExternalLink,
  Phone,
  Mail,
  MessageSquare,
  MapPin,
  Briefcase,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  Send,
  X,
  Calendar,
  DollarSign,
  Globe,
  Linkedin,
  FileText,
  Star,
  ThumbsUp,
  ThumbsDown,
  Copy,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart as PieChartIcon
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
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

// ========== TYPES ==========
type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Nurturing' | 'Converted' | 'Lost' | 'Invalid';
type LeadSource = 'LinkedIn' | 'Naukri' | 'Indeed' | 'Referral' | 'Website' | 'Cold Outreach' | 'Events';
type ConversionType = 'Company' | 'Requirement' | 'Both';

interface Lead {
  id: string;
  companyName: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  confidence: number;
  sector: string;
  location: string;
  potentialRevenue: string;
  addedDate: string;
  lastContact: string;
  nextFollowUp?: string;
  notes?: string;
  conversionType?: ConversionType;
  assignedTo: string;
  tags: string[];
}

// ========== MOCK DATA ==========
const MOCK_LEADS: Lead[] = [
  {
    id: 'LEAD-001',
    companyName: 'Accenture',
    contactPerson: 'Priya Sharma',
    designation: 'HR Manager',
    email: 'priya.sharma@accenture.com',
    phone: '+91 98765 12345',
    source: 'LinkedIn',
    status: 'Qualified',
    confidence: 85,
    sector: 'IT',
    location: 'Bangalore',
    potentialRevenue: '₹5-8L',
    addedDate: '2024-02-01',
    lastContact: '2 hours ago',
    nextFollowUp: '2024-02-08',
    assignedTo: 'Amit Patel',
    tags: ['Hot Lead', 'IT Services', 'Enterprise']
  },
  {
    id: 'LEAD-002',
    companyName: 'Flipkart',
    contactPerson: 'Rahul Verma',
    designation: 'Talent Acquisition Lead',
    email: 'rahul.v@flipkart.com',
    phone: '+91 98765 12346',
    source: 'Referral',
    status: 'Converted',
    confidence: 95,
    sector: 'E-commerce',
    location: 'Bangalore',
    potentialRevenue: '₹10-15L',
    addedDate: '2024-01-15',
    lastContact: '1 week ago',
    conversionType: 'Both',
    assignedTo: 'Rashmi',
    tags: ['Converted', 'High Value', 'Repeat Client']
  },
  {
    id: 'LEAD-003',
    companyName: 'Asian Paints',
    contactPerson: 'Anjali Desai',
    designation: 'HR Head',
    email: 'anjali@asianpaints.com',
    phone: '+91 98765 12347',
    source: 'Events',
    status: 'Contacted',
    confidence: 65,
    sector: 'Manufacturing',
    location: 'Mumbai',
    potentialRevenue: '₹3-5L',
    addedDate: '2024-01-28',
    lastContact: '3 days ago',
    nextFollowUp: '2024-02-10',
    assignedTo: 'Manjunath',
    tags: ['Manufacturing', 'Mid-Size']
  },
  {
    id: 'LEAD-004',
    companyName: 'Swiggy',
    contactPerson: 'Karan Singh',
    designation: 'Recruitment Manager',
    email: 'karan@swiggy.in',
    phone: '+91 98765 12348',
    source: 'LinkedIn',
    status: 'Nurturing',
    confidence: 72,
    sector: 'Food Tech',
    location: 'Bangalore',
    potentialRevenue: '₹6-10L',
    addedDate: '2024-01-25',
    lastContact: '1 day ago',
    nextFollowUp: '2024-02-07',
    assignedTo: 'Amit Patel',
    tags: ['Startup', 'Growth Stage']
  },
  {
    id: 'LEAD-005',
    companyName: 'Cognizant',
    contactPerson: 'Sneha Reddy',
    designation: 'Senior Recruiter',
    email: 'sneha.reddy@cognizant.com',
    phone: '+91 98765 12349',
    source: 'Naukri',
    status: 'New',
    confidence: 58,
    sector: 'IT',
    location: 'Hyderabad',
    potentialRevenue: '₹4-7L',
    addedDate: '2024-02-03',
    lastContact: 'Not contacted',
    assignedTo: 'Scraping Team',
    tags: ['IT Consulting', 'MNC']
  },
  {
    id: 'LEAD-006',
    companyName: 'Paytm',
    contactPerson: 'Vikram Malhotra',
    designation: 'VP - HR',
    email: 'vikram@paytm.com',
    phone: '+91 98765 12350',
    source: 'Cold Outreach',
    status: 'Lost',
    confidence: 30,
    sector: 'Fintech',
    location: 'Noida',
    potentialRevenue: '₹8-12L',
    addedDate: '2024-01-10',
    lastContact: '2 weeks ago',
    assignedTo: 'Rashmi',
    tags: ['Cold Lead', 'No Response']
  },
  {
    id: 'LEAD-007',
    companyName: 'Ola Electric',
    contactPerson: 'Meena Iyer',
    designation: 'Talent Partner',
    email: 'meena@olaelectric.com',
    phone: '+91 98765 12351',
    source: 'Indeed',
    status: 'Qualified',
    confidence: 78,
    sector: 'Automotive',
    location: 'Bangalore',
    potentialRevenue: '₹7-11L',
    addedDate: '2024-01-22',
    lastContact: '4 hours ago',
    nextFollowUp: '2024-02-09',
    assignedTo: 'Manjunath',
    tags: ['EV Sector', 'Emerging']
  },
  {
    id: 'LEAD-008',
    companyName: 'Zomato',
    contactPerson: 'Arjun Kapoor',
    designation: 'Hiring Manager',
    email: 'arjun@zomato.com',
    phone: '+91 98765 12352',
    source: 'Website',
    status: 'Converted',
    confidence: 92,
    sector: 'Food Tech',
    location: 'Gurugram',
    potentialRevenue: '₹9-14L',
    addedDate: '2024-01-18',
    lastContact: '5 days ago',
    conversionType: 'Requirement',
    assignedTo: 'Amit Patel',
    tags: ['Converted', 'Food Tech', 'Fast Growing']
  }
];

const STATUS_COLORS = {
  'New': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Contacted': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  'Qualified': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Nurturing': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Converted': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-600' },
  'Lost': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  'Invalid': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' }
};

const SOURCE_ICONS: Record<LeadSource, React.ReactNode> = {
  'LinkedIn': <Linkedin size={14} />,
  'Naukri': <Globe size={14} />,
  'Indeed': <Globe size={14} />,
  'Referral': <Users size={14} />,
  'Website': <Globe size={14} />,
  'Cold Outreach': <Mail size={14} />,
  'Events': <Calendar size={14} />
};

// Stats Data
const LEAD_SOURCE_DATA = [
  { name: 'LinkedIn', value: 34, color: '#0077b5', percentage: 38 },
  { name: 'Naukri', value: 22, color: '#6366f1', percentage: 25 },
  { name: 'Indeed', value: 18, color: '#8b5cf6', percentage: 20 },
  { name: 'Referral', value: 15, color: '#10b981', percentage: 17 }
];

const CONVERSION_FUNNEL_DATA = [
  { stage: 'New Leads', count: 89, percentage: 100 },
  { stage: 'Contacted', count: 67, percentage: 75 },
  { stage: 'Qualified', count: 45, percentage: 51 },
  { stage: 'Converted', count: 18, percentage: 20 }
];

const CONFIDENCE_DISTRIBUTION = [
  { range: '0-25%', count: 8, color: '#ef4444' },
  { range: '26-50%', count: 15, color: '#f59e0b' },
  { range: '51-75%', count: 32, color: '#eab308' },
  { range: '76-100%', count: 34, color: '#10b981' }
];

const WEEKLY_ACTIVITY_DATA = [
  { day: 'Mon', added: 12, contacted: 8, converted: 2 },
  { day: 'Tue', added: 15, contacted: 11, converted: 3 },
  { day: 'Wed', added: 10, contacted: 9, converted: 1 },
  { day: 'Thu', added: 18, contacted: 14, converted: 4 },
  { day: 'Fri', added: 14, contacted: 10, converted: 2 },
  { day: 'Sat', added: 5, contacted: 3, converted: 0 },
  { day: 'Sun', added: 3, contacted: 2, converted: 0 }
];

// ========== MODALS ==========

// Add Lead Modal
const AddLeadModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    designation: '',
    email: '',
    phone: '',
    source: 'LinkedIn',
    sector: 'IT',
    location: '',
    potentialRevenue: '',
    confidence: 50,
    assignedTo: 'Amit Patel',
    tags: '',
    notes: ''
  });

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Zap size={20} className="text-emerald-600" />
                Add New Lead
              </h2>
              <p className="text-xs text-slate-500 mt-1">Module 9 • Capture and qualify new business opportunities</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Company Name *</label>
                  <input 
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="e.g. Accenture"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Lead Source *</label>
                  <select 
                    value={formData.source}
                    onChange={(e) => setFormData({...formData, source: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Naukri">Naukri</option>
                    <option value="Indeed">Indeed</option>
                    <option value="Referral">Referral</option>
                    <option value="Website">Website</option>
                    <option value="Cold Outreach">Cold Outreach</option>
                    <option value="Events">Events</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Contact Person *</label>
                  <input 
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Designation</label>
                  <input 
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({...formData, designation: e.target.value})}
                    placeholder="e.g. HR Manager"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Email</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@company.com"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Phone</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Sector</label>
                  <select 
                    value={formData.sector}
                    onChange={(e) => setFormData({...formData, sector: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="IT">IT</option>
                    <option value="BFSI">BFSI</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Fintech">Fintech</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Location</label>
                  <input 
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g. Bangalore"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Assigned To</label>
                  <select 
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="Amit Patel">Amit Patel</option>
                    <option value="Rashmi">Rashmi</option>
                    <option value="Manjunath">Manjunath</option>
                    <option value="Scraping Team">Scraping Team</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Potential Revenue</label>
                  <input 
                    type="text"
                    value={formData.potentialRevenue}
                    onChange={(e) => setFormData({...formData, potentialRevenue: e.target.value})}
                    placeholder="e.g. ₹5-8L"
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                    Confidence Score: {formData.confidence}%
                  </label>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    value={formData.confidence}
                    onChange={(e) => setFormData({...formData, confidence: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Tags (comma separated)</label>
                <input 
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  placeholder="e.g. Hot Lead, IT Services, Enterprise"
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Notes</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Add any additional information..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm font-medium resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
              Cancel
            </button>
            <button 
              onClick={() => {
                alert(`✅ Lead ${formData.companyName} added successfully!`);
                onClose();
              }}
              className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 size={16} />
              Add Lead
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Lead Details Modal
const LeadDetailsModal = ({ isOpen, onClose, lead }: { isOpen: boolean; onClose: () => void; lead: Lead | null }) => {
  if (!isOpen || !lead) return null;

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
          <div className="flex justify-between items-start p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-white">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-mono text-sm font-bold border border-emerald-200">
                  {lead.id}
                </span>
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[lead.status].bg} ${STATUS_COLORS[lead.status].text} ${STATUS_COLORS[lead.status].border} flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[lead.status].dot}`}></span>
                  {lead.status}
                </span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1">
                  {SOURCE_ICONS[lead.source]}
                  {lead.source}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-1">
                <Building2 size={20} className="text-slate-400" />
                {lead.companyName}
              </h2>
              <p className="text-xs text-slate-500">Added {lead.addedDate} • Last contact: {lead.lastContact}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Confidence Score */}
            <div className="mb-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Target size={16} className="text-indigo-600" />
                  Lead Confidence Score
                </h4>
                <span className="text-2xl font-extrabold text-indigo-600">{lead.confidence}%</span>
              </div>
              <div className="w-full bg-white rounded-full h-3 overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${lead.confidence}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    lead.confidence >= 75 ? 'bg-emerald-500' :
                    lead.confidence >= 50 ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}
                />
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Users size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Contact Person</p>
                      <p className="text-sm font-bold text-slate-900">{lead.contactPerson}</p>
                      <p className="text-xs text-slate-500">{lead.designation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Email</p>
                      <p className="text-sm font-bold text-slate-900">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Phone</p>
                      <p className="text-sm font-bold text-slate-900">{lead.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Business Details</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Briefcase size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Sector</p>
                      <p className="text-sm font-bold text-slate-900">{lead.sector}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Location</p>
                      <p className="text-sm font-bold text-slate-900">{lead.location}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <DollarSign size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Potential Revenue</p>
                      <p className="text-sm font-bold text-emerald-600">{lead.potentialRevenue}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Users size={16} className="text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Assigned To</p>
                      <p className="text-sm font-bold text-slate-900">{lead.assignedTo}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags */}
            {lead.tags.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Conversion Status */}
            {lead.conversionType && (
              <div className="mb-6 p-5 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} />
                  Conversion Success
                </h4>
                <p className="text-xs text-emerald-600">
                  This lead has been converted to: <span className="font-bold">{lead.conversionType}</span>
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-3 gap-3">
              <button className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                <Phone size={16} /> Call
              </button>
              <button className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                <Mail size={16} /> Email
              </button>
              <button className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                <ArrowRight size={16} /> Convert
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// ========== MAIN COMPONENT ==========
export default function LeadsAndScraping() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filters, setFilters] = useState({
    statuses: [] as string[],
    sources: [] as string[],
    assignee: 'all'
  });

  // Filter leads
  const filteredLeads = MOCK_LEADS.filter(lead => {
    const matchesSearch = searchQuery === '' || 
      lead.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filters.statuses.length === 0 || filters.statuses.includes(lead.status);
    const matchesSource = filters.sources.length === 0 || filters.sources.includes(lead.source);
    const matchesAssignee = filters.assignee === 'all' || lead.assignedTo === filters.assignee;

    return matchesSearch && matchesStatus && matchesSource && matchesAssignee;
  });

  // Stats
  const totalLeads = MOCK_LEADS.length;
  const convertedLeads = MOCK_LEADS.filter(l => l.status === 'Converted').length;
  const avgConfidence = Math.round(MOCK_LEADS.reduce((sum, l) => sum + l.confidence, 0) / MOCK_LEADS.length);
  const qualifiedLeads = MOCK_LEADS.filter(l => l.status === 'Qualified').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Leads & Scraping</h1>
          <p className="text-sm text-slate-500 font-medium">Module 9 • Lead Pipeline • Source Tracking • Conversion Management</p>
        </div>
        <button 
          onClick={() => setIsAddLeadModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 transition-all active:scale-95"
        >
          <Plus size={18} />
          Add Lead
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <motion.div 
          whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(16, 185, 129, 0.15)' }}
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Target size={24} className="opacity-80" />
            <TrendingUp size={16} className="opacity-60" />
          </div>
          <p className="text-3xl font-extrabold mb-1">{totalLeads}</p>
          <p className="text-sm opacity-90 font-medium">Total Leads</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(34, 197, 94, 0.15)' }}
          className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <CheckCircle2 size={24} className="opacity-80" />
            <TrendingUp size={16} className="opacity-60" />
          </div>
          <p className="text-3xl font-extrabold mb-1">{convertedLeads}</p>
          <p className="text-sm opacity-90 font-medium">Converted</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(245, 158, 11, 0.15)' }}
          className="bg-gradient-to-br from-amber-500 to-amber-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Activity size={24} className="opacity-80" />
            <BarChart3 size={16} className="opacity-60" />
          </div>
          <p className="text-3xl font-extrabold mb-1">{qualifiedLeads}</p>
          <p className="text-sm opacity-90 font-medium">Qualified</p>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(99, 102, 241, 0.15)' }}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <Star size={24} className="opacity-80" />
            <TrendingUp size={16} className="opacity-60" />
          </div>
          <p className="text-3xl font-extrabold mb-1">{avgConfidence}%</p>
          <p className="text-sm opacity-90 font-medium">Avg Confidence</p>
        </motion.div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Sources */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Globe size={18} className="text-indigo-600" />
            Lead Sources
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-5">Distribution by platform</p>
          
          <div style={{ width: '100%', height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={LEAD_SOURCE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {LEAD_SOURCE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 mt-4">
            {LEAD_SOURCE_DATA.map((source) => (
              <div key={source.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: source.color }}></div>
                  <span className="text-xs font-bold text-slate-700">{source.name}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">{source.value} ({source.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <Activity size={18} className="text-emerald-600" />
            Conversion Funnel
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-5">Lead to conversion journey</p>
          
          <div className="space-y-3">
            {CONVERSION_FUNNEL_DATA.map((stage, idx) => (
              <div key={stage.stage}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">{stage.stage}</span>
                  <span className="text-xs font-bold text-slate-900">{stage.count} ({stage.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${stage.percentage}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.1 }}
                    className={`h-full rounded-full ${
                      idx === 0 ? 'bg-blue-500' :
                      idx === 1 ? 'bg-purple-500' :
                      idx === 2 ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-600" />
            Weekly Activity
          </h3>
          <p className="text-xs text-slate-500 font-medium mb-5">Last 7 days performance</p>
          
          <div style={{ width: '100%', height: '200px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={WEEKLY_ACTIVITY_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11, fontWeight: 700}} />
                <Tooltip />
                <Bar dataKey="added" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="contacted" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="converted" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
              placeholder="Search by Lead ID, Company, Contact..." 
              className="pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm w-full focus:ring-4 focus:ring-emerald-100 focus:bg-white focus:border-emerald-300 transition-all outline-none font-medium"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                <Grid3x3 size={16} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
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
      </div>

      {/* Leads Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLeads.map((lead, idx) => (
            <motion.div
              key={lead.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
              className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-100 hover:border-emerald-200 transition-all cursor-pointer group"
              onClick={() => setSelectedLead(lead)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-mono text-xs font-bold border border-emerald-200 inline-block mb-2">
                    {lead.id}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{lead.companyName}</h3>
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Users size={12} />
                    {lead.contactPerson}
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

              {/* Status & Source */}
              <div className="flex gap-2 mb-4">
                <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[lead.status].bg} ${STATUS_COLORS[lead.status].text} ${STATUS_COLORS[lead.status].border} flex items-center gap-1`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[lead.status].dot}`}></span>
                  {lead.status}
                </span>
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1">
                  {SOURCE_ICONS[lead.source]}
                  {lead.source}
                </span>
              </div>

              {/* Confidence Score */}
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">Confidence</span>
                  <span className="text-sm font-extrabold text-indigo-600">{lead.confidence}%</span>
                </div>
                <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      lead.confidence >= 75 ? 'bg-emerald-500' :
                      lead.confidence >= 50 ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`}
                    style={{ width: `${lead.confidence}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-xs mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Briefcase size={12} />
                    Sector:
                  </span>
                  <span className="font-bold text-slate-900">{lead.sector}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <MapPin size={12} />
                    Location:
                  </span>
                  <span className="font-bold text-slate-900">{lead.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <DollarSign size={12} />
                    Potential:
                  </span>
                  <span className="font-bold text-emerald-600">{lead.potentialRevenue}</span>
                </div>
              </div>

              {/* Tags */}
              {lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4 pb-4 border-b border-slate-100">
                  {lead.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                      {tag}
                    </span>
                  ))}
                  {lead.tags.length > 2 && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">
                      +{lead.tags.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLead(lead);
                  }}
                  className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Eye size={12} /> View
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Phone size={12} /> Contact
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
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Lead ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Confidence</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map((lead) => (
                  <motion.tr 
                    key={lead.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-emerald-50/30 transition-colors cursor-pointer group"
                    onClick={() => setSelectedLead(lead)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg font-mono text-xs font-bold border border-emerald-200">
                        {lead.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{lead.companyName}</p>
                        <p className="text-xs text-slate-500">{lead.sector}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{lead.contactPerson}</p>
                        <p className="text-xs text-slate-500">{lead.designation}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${STATUS_COLORS[lead.status].bg} ${STATUS_COLORS[lead.status].text} ${STATUS_COLORS[lead.status].border} inline-flex items-center gap-1`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[lead.status].dot}`}></span>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 inline-flex items-center gap-1">
                        {SOURCE_ICONS[lead.source]}
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-2">
                          <div 
                            className={`h-full rounded-full ${
                              lead.confidence >= 75 ? 'bg-emerald-500' :
                              lead.confidence >= 50 ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`}
                            style={{ width: `${lead.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{lead.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{lead.assignedTo}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLead(lead);
                          }}
                          className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                        >
                          <Phone size={16} />
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        >
                          <Edit2 size={16} />
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
      {filteredLeads.length === 0 && (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Target size={24} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Leads Found</h3>
          <p className="text-sm text-slate-500 mb-4">Try adjusting your search criteria</p>
          <button 
            onClick={() => {
              setSearchQuery('');
              setFilters({ statuses: [], sources: [], assignee: 'all' });
            }}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-all"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Modals */}
      <AddLeadModal 
        isOpen={isAddLeadModalOpen}
        onClose={() => setIsAddLeadModalOpen(false)}
      />

      <LeadDetailsModal 
        isOpen={selectedLead !== null}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
      />
    </div>
  );
}
