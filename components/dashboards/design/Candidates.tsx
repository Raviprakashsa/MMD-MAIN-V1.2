"use client";

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Phone, 
  Mail, 
  Linkedin,
  X,
  FileText,
  Check,
  Plus,
  ArrowRight,
  MoreVertical,
  Paperclip,
  Calendar,
  SlidersHorizontal,
  Tag,
  UserPlus,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type Candidate = {
  id: string;
  name: string;
  role: string;
  status: 'Applied' | 'Shortlisted' | 'Interview' | 'Offer' | 'Hired' | 'Rejected' | 'On Hold';
  experience: string;
  location: string;
  skills: string[];
  email: string;
  phone: string;
  college: string;
  reqId?: string;
  avatar?: string;
  appliedDate: string;
};

// --- Mock Data ---
const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'MMD-C-001',
    name: 'Priya Sharma',
    role: 'Senior Frontend Developer',
    status: 'Interview',
    experience: '5 Years',
    location: 'Bangalore',
    skills: ['React', 'TypeScript', 'Node.js'],
    email: 'priya.s@example.com',
    phone: '+91 98765 43210',
    college: 'IIT Delhi',
    reqId: 'MMD-REQ-092',
    appliedDate: '2 Feb 2026',
    avatar: 'https://images.unsplash.com/photo-1649589244330-09ca58e4fa64?ixlib=rb-4.1.0&q=80&w=200&fm=jpg&crop=faces&fit=crop'
  },
  {
    id: 'MMD-C-002',
    name: 'Rahul Verma',
    role: 'Product Manager',
    status: 'Shortlisted',
    experience: '8 Years',
    location: 'Mumbai',
    skills: ['Agile', 'Jira', 'Strategy'],
    email: 'rahul.v@example.com',
    phone: '+91 98765 43211',
    college: 'IIM Bangalore',
    reqId: 'MMD-REQ-104',
    appliedDate: '1 Feb 2026',
    avatar: 'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?ixlib=rb-4.1.0&q=80&w=200&fm=jpg&crop=faces&fit=crop'
  },
  {
    id: 'MMD-C-003',
    name: 'Ankit Gupta',
    role: 'Backend Engineer',
    status: 'Applied',
    experience: '3 Years',
    location: 'Pune',
    skills: ['Java', 'Spring Boot', 'AWS'],
    email: 'ankit.g@example.com',
    phone: '+91 98765 43212',
    college: 'VIT Pune',
    reqId: 'MMD-REQ-092',
    appliedDate: '3 Feb 2026',
    avatar: undefined // No avatar test
  },
  {
    id: 'MMD-C-004',
    name: 'Sneha Reddy',
    role: 'UI/UX Designer',
    status: 'Offer',
    experience: '4 Years',
    location: 'Hyderabad',
    skills: ['Figma', 'Adobe XD', 'Prototyping'],
    email: 'sneha.r@example.com',
    phone: '+91 98765 43213',
    college: 'NID Ahmedabad',
    reqId: 'MMD-REQ-105',
    appliedDate: '28 Jan 2026',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.1.0&q=80&w=200&fm=jpg&crop=faces&fit=crop'
  }
];

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    'Applied': 'bg-slate-100 text-slate-600 border-slate-200',
    'Shortlisted': 'bg-blue-50 text-blue-700 border-blue-200',
    'Interview': 'bg-amber-50 text-amber-700 border-amber-200',
    'Offer': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Hired': 'bg-green-100 text-green-800 border-green-200',
    'Rejected': 'bg-rose-50 text-rose-700 border-rose-200',
    'On Hold': 'bg-gray-100 text-gray-600 border-gray-200'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${styles[status] || styles['Applied']}`}>
      {status}
    </span>
  );
};

// Modal Component for Module 8 (Add Candidate)
const AddCandidateModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  return (
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
            <h2 className="text-xl font-bold text-slate-900">Add New Candidate</h2>
            <p className="text-xs text-slate-500 mt-1">Create a new candidate profile in Module 8.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto custom-scrollbar">
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number *</label>
                <input type="tel" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" placeholder="+91 ..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
                <input type="email" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Linked Requirement ID</label>
                <select className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all bg-white text-sm font-medium text-slate-700">
                  <option value="">Select Requirement...</option>
                  <option value="MMD-REQ-092">MMD-REQ-092 (Backend Dev)</option>
                  <option value="MMD-REQ-104">MMD-REQ-104 (Product Design)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Skills</label>
               <input type="text" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" placeholder="React, Node.js, AWS..." />
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">College / Education</label>
                  <input type="text" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" placeholder="University Name" />
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Experience</label>
                  <input type="text" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" placeholder="e.g. 4 Years" />
               </div>
            </div>

            {/* File Upload Area */}
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer group">
               <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                 <Paperclip size={20} />
               </div>
               <p className="text-sm font-bold text-slate-700">Upload Resume</p>
               <p className="text-xs text-slate-400 mt-1 font-medium">PDF, DOCX up to 5MB</p>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
            Cancel
          </button>
          <button className="px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
            <Check size={16} /> Save Candidate
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default function Candidates() {
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // MMDSS Module 8: Candidate Statistics
  const candidateStats = {
    total: MOCK_CANDIDATES.length,
    applied: MOCK_CANDIDATES.filter(c => c.status === 'Applied').length,
    shortlisted: MOCK_CANDIDATES.filter(c => c.status === 'Shortlisted').length,
    interview: MOCK_CANDIDATES.filter(c => c.status === 'Interview').length,
    offer: MOCK_CANDIDATES.filter(c => c.status === 'Offer').length,
    hired: MOCK_CANDIDATES.filter(c => c.status === 'Hired').length,
  };

  return (
    <div className="space-y-6 pb-6">
      
      {/* MMDSS Module 8: Header with Stats */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_20px_-4px_rgba(6,11,40,0.08)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
                <UserPlus size={20} />
              </div>
              Candidate Management
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">Module 8: Track and manage your talent pool with MMD-ID traceability.</p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <Download size={16} className="text-slate-400" />
              Export CSV
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 hover:shadow-xl"
            >
              <Plus size={18} />
              Add Candidate
            </button>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedStatus('All')}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Pool</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{candidateStats.total}</h3>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedStatus('Applied')}>
            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Applied</p>
            <h3 className="text-2xl font-extrabold text-slate-700">{candidateStats.applied}</h3>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl border border-blue-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedStatus('Shortlisted')}>
            <p className="text-xs font-bold text-blue-600 uppercase mb-1">Shortlisted</p>
            <h3 className="text-2xl font-extrabold text-blue-700">{candidateStats.shortlisted}</h3>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-xl border border-amber-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedStatus('Interview')}>
            <p className="text-xs font-bold text-amber-600 uppercase mb-1">Interview</p>
            <h3 className="text-2xl font-extrabold text-amber-700">{candidateStats.interview}</h3>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-xl border border-emerald-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedStatus('Offer')}>
            <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Offer Sent</p>
            <h3 className="text-2xl font-extrabold text-emerald-700">{candidateStats.offer}</h3>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-white p-4 rounded-xl border border-green-200 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedStatus('Hired')}>
            <p className="text-xs font-bold text-green-600 uppercase mb-1">Hired</p>
            <h3 className="text-2xl font-extrabold text-green-700">{candidateStats.hired}</h3>
          </div>
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-28rem)]">
      
      {/* --- Main List Section --- */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${selectedCandidate ? 'w-2/3' : 'w-full'}`}>
        
        {/* Toolbar */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3">
             <div className="relative group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search by name, ID or skill..." 
                  className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium shadow-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none w-80 transition-all"
                />
             </div>
             <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
               <SlidersHorizontal size={16} />
               <span>Filters</span>
             </button>
          </div>
          <div className="flex gap-3">
             <button 
               onClick={() => setIsAddModalOpen(true)}
               className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2 hover:shadow-xl"
             >
               <Plus size={18} />
               <span>Add Candidate</span>
             </button>
          </div>
        </div>

        {/* Enhanced Table */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_-4px_rgba(6,11,40,0.08)] border border-slate-100 flex-1 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <div className="col-span-4 pl-2">Candidate Profile</div>
            <div className="col-span-3">Role & Req ID</div>
            <div className="col-span-2">Experience</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right"></div>
          </div>
          
          {/* List Items */}
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {MOCK_CANDIDATES.map((candidate, index) => (
              <motion.div 
                key={candidate.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedCandidate(candidate)}
                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-slate-50 hover:bg-indigo-50/40 cursor-pointer transition-all group ${selectedCandidate?.id === candidate.id ? 'bg-indigo-50/60 border-l-4 border-l-indigo-500 pl-[20px]' : 'pl-6'}`}
              >
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold overflow-hidden shrink-0 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                    {candidate.avatar ? (
                      <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
                    ) : (
                      candidate.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{candidate.name}</h4>
                    <p className="text-xs text-slate-400 font-medium">{candidate.email}</p>
                  </div>
                </div>
                
                <div className="col-span-3">
                  <p className="text-sm font-bold text-slate-700 truncate">{candidate.role}</p>
                  {candidate.reqId && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold font-mono text-slate-500 mt-1 border border-slate-200">
                      <Briefcase size={10} /> {candidate.reqId}
                    </span>
                  )}
                </div>
                
                <div className="col-span-2">
                  <div className="flex flex-col text-sm text-slate-600">
                    <span className="font-bold text-slate-700">{candidate.experience}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{candidate.college}</span>
                  </div>
                </div>
                
                <div className="col-span-2">
                  <StatusBadge status={candidate.status} />
                </div>
                
                <div className="col-span-1 text-right">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white hover:shadow-sm text-slate-300 group-hover:text-indigo-600 transition-all ml-auto">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Detail Slide-over Panel (Module 8 Detail View) --- */}
      <AnimatePresence>
        {selectedCandidate && (
          <motion.div 
            initial={{ width: 0, opacity: 0, x: 20 }}
            animate={{ width: 440, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden flex flex-col h-full shrink-0 relative z-20"
          >
             {/* Profile Header */}
             <div className="p-8 border-b border-slate-100 relative bg-slate-50/30">
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
                >
                  <X size={18} />
                </button>
                
                <div className="flex flex-col items-center text-center mt-2">
                  <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center text-3xl font-bold text-slate-500 overflow-hidden shadow-lg shadow-slate-200/50 mb-5 border-4 border-white">
                    {selectedCandidate.avatar ? (
                      <img src={selectedCandidate.avatar} alt={selectedCandidate.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedCandidate.name.charAt(0)
                    )}
                  </div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">{selectedCandidate.name}</h3>
                  <p className="text-sm text-slate-500 font-bold mt-1 mb-4 flex items-center gap-2">
                    <Briefcase size={14} className="text-indigo-500" />
                    {selectedCandidate.role}
                  </p>
                  <StatusBadge status={selectedCandidate.status} />
                </div>
             </div>

             {/* Action Buttons */}
             <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100 bg-white">
               <button className="flex flex-col items-center gap-2 p-3 hover:bg-slate-50 rounded-xl transition-all group border border-transparent hover:border-slate-100">
                 <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm"><Phone size={18} /></div>
                 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Call</span>
               </button>
               <button className="flex flex-col items-center gap-2 p-3 hover:bg-slate-50 rounded-xl transition-all group border border-transparent hover:border-slate-100">
                 <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm"><Mail size={18} /></div>
                 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Email</span>
               </button>
               <button className="flex flex-col items-center gap-2 p-3 hover:bg-slate-50 rounded-xl transition-all group border border-transparent hover:border-slate-100">
                 <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-sm"><FileText size={18} /></div>
                 <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Resume</span>
               </button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                
                {/* Details Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    Candidate Details
                  </h4>
                  
                  <div className="space-y-0 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                    <div className="flex justify-between items-center p-4 border-b border-slate-200/50">
                       <span className="text-xs font-bold text-slate-500">Linked Requirement</span>
                       <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{selectedCandidate.reqId}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 border-b border-slate-200/50">
                       <span className="text-xs font-bold text-slate-500">Education</span>
                       <span className="text-xs font-bold text-slate-800 text-right">{selectedCandidate.college}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 border-b border-slate-200/50">
                       <span className="text-xs font-bold text-slate-500">Total Experience</span>
                       <span className="text-xs font-bold text-slate-800">{selectedCandidate.experience}</span>
                    </div>
                    <div className="flex justify-between items-center p-4">
                       <span className="text-xs font-bold text-slate-500">Location</span>
                       <span className="text-xs font-bold text-slate-800 flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {selectedCandidate.location}</span>
                    </div>
                  </div>
                </div>

                {/* Skills Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Technical Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.skills.map((skill: string) => (
                      <span key={skill} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm hover:border-indigo-300 transition-colors cursor-default">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Timeline / Activity */}
                <div className="space-y-5">
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">History</h4>
                   <div className="pl-3 border-l-[2px] border-slate-100 space-y-8 ml-1">
                      <div className="relative pl-6 group">
                        <div className="absolute -left-[7px] top-1.5 w-3 h-3 bg-indigo-600 rounded-full ring-4 ring-white shadow-sm group-hover:scale-125 transition-transform"></div>
                        <p className="text-sm font-bold text-slate-800">Interview Scheduled</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Today, 2:00 PM with Hiring Manager</p>
                      </div>
                      <div className="relative pl-6 opacity-60 grayscale group hover:grayscale-0 transition-all">
                        <div className="absolute -left-[7px] top-1.5 w-3 h-3 bg-slate-400 rounded-full ring-4 ring-white"></div>
                        <p className="text-sm font-bold text-slate-800">Shortlisted</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Feb 2, 2026 • By Rashmi</p>
                      </div>
                      <div className="relative pl-6 opacity-40 grayscale">
                        <div className="absolute -left-[7px] top-1.5 w-3 h-3 bg-slate-300 rounded-full ring-4 ring-white"></div>
                        <p className="text-sm font-bold text-slate-800">Applied</p>
                        <p className="text-xs text-slate-500 mt-1 font-medium">Feb 1, 2026 • via LinkedIn</p>
                      </div>
                   </div>
                </div>

             </div>

             <div className="p-6 border-t border-slate-100 bg-white">
               <button className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold shadow-xl shadow-slate-200 transition-all active:scale-95 flex justify-center items-center gap-2 hover:translate-y-[-2px]">
                 Move to Offer Stage <ArrowRight size={16} />
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

       <AddCandidateModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      </div>
    </div>
  );
}