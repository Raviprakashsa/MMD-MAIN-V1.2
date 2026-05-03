'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Target,
  TrendingUp,
  AlertCircle,
  Search,
} from 'lucide-react'

import { GlassCard } from '@/components/ui/GlassCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

import { LeadsTable } from '@/components/leads/LeadsTable'
import { LeadDetailsDialog } from '@/components/leads/LeadDetailsDialog'
import { LeadActivityDialog } from '@/components/leads/LeadActivityDialog'
import { LeadConvertDialog } from '@/components/leads/LeadConvertDialog'
import { LeadsAnalytics } from '@/components/leads/LeadsAnalytics'
import { CreateLeadModal } from '@/components/leads/CreateLeadModal'

import { canConvertLead, canDeleteLead, canModifyLead } from '@/lib/auth/rbac'
import {
  convertLeadToCompany,
  getLeads,
  updateLead,
  deleteLead,
  addLeadActivity,
  getEnhancedLeadMetrics,
} from '@/lib/actions/module9-leads'
import { cn } from '@/lib/utils'
import type { Lead, LeadStatus, LeadFilters, LeadMetrics, LeadActivity, LeadSector } from '@/types/leads'
import { SECTORS, SOURCE_PLATFORMS } from '@/types/leads'

const statusOptions: { value: LeadStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'STALLED', label: 'Stalled' },
]

const sectorOptions = [
  { value: 'all', label: 'All Sectors' },
  ...SECTORS.map(s => ({ value: s.value, label: s.label })),
]

const sourceOptions = [
  { value: 'all', label: 'All Sources' },
  ...SOURCE_PLATFORMS.map(s => ({ value: s, label: s })),
]

const emptyForm = {
  _id: '',
  sourcePlatform: '',
  companyName: '',
  sector: 'IT' as LeadSector,
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  contactLinkedIn: '',
  confidenceScore: 70,
  notes: '',
  status: 'NEW' as LeadStatus,
  followUpDate: '',
  assignedTo: '',
  activities: [] as LeadActivity[],
}

export default function LeadsPage() {
  const toast = useToast()
  const { data: session } = useSession()

  // Data state
  const [leads, setLeads] = useState<Lead[]>([])
  const [metrics, setMetrics] = useState<LeadMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  // UI state
  const [activeTab, setActiveTab] = useState<'pipeline' | 'analytics'>('pipeline')
  const [filters, setFilters] = useState<LeadFilters>({
    search: '',
    status: 'all',
    sector: 'all',
    source: 'all',
    showOverdueOnly: false,
  })
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false)
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [formState, setFormState] = useState(emptyForm)

  // Current user permissions
  const currentUser = useMemo(() => {
    return session?.user ? { role: session.user.role, _id: session.user.id } : null
  }, [session?.user])

  const role = currentUser?.role

  const hasLeadAccess = useMemo(() => {
    if (!role) return false
    return role !== 'RECRUITER'
  }, [role])

  const canCreateLead = useMemo(() => {
    if (!role) return false
    return (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any)) || role === 'COORDINATOR' || role === 'SCRAPER'
  }, [role])

  const canExportLeads = useMemo(() => (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any)), [role])

  const canDelete = useMemo(() => {
    return role ? canDeleteLead({ role }) : false
  }, [role])

  const canConvert = useMemo(() => {
    return currentUser ? canConvertLead({ role: currentUser.role }) : false
  }, [currentUser])

  const checkCanModify = useCallback((lead: Lead) => {
    return currentUser ? canModifyLead(currentUser, { assignedTo: lead.assignedTo }) : false
  }, [currentUser])

  // Calculate derived metrics from leads
  const calculatedMetrics = useMemo(() => {
    const total = leads.length
    const converted = leads.filter(l => l.status === 'CONVERTED').length
    const now = new Date()

    const followUpsDue = leads.filter(l => {
      if (!l.followUpDate) return false
      const followUp = new Date(l.followUpDate)
      return followUp <= now && l.status !== 'CONVERTED'
    }).length

    const overdue = leads.filter(l => l.isOverdue).length
    const avgConfidence = total > 0 ? Math.round(leads.reduce((acc, l) => acc + l.confidenceScore, 0) / total) : 0
    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0'

    return { total, converted, followUpsDue, overdue, avgConfidence, conversionRate }
  }, [leads])

  const filteredLeadIds = useMemo(() => {
    const searchLower = filters.search.toLowerCase()
    return leads
      .filter(lead => {
        const matchesSearch =
          !searchLower ||
          lead.companyName.toLowerCase().includes(searchLower) ||
          lead.contactName?.toLowerCase().includes(searchLower) ||
          lead.sector.toLowerCase().includes(searchLower) ||
          lead.sourcePlatform.toLowerCase().includes(searchLower)

        const matchesStatus = filters.status === 'all' || lead.status === filters.status
        const matchesSector = filters.sector === 'all' || lead.sector === filters.sector
        const matchesSource = filters.source === 'all' || lead.sourcePlatform === filters.source
        const matchesOverdue = !filters.showOverdueOnly || lead.isOverdue

        return matchesSearch && matchesStatus && matchesSector && matchesSource && matchesOverdue
      })
      .map(lead => lead._id)
  }, [leads, filters])

  const handleSelectLead = useCallback((id: string) => {
    setSelectedLeads(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }, [])

  const handleSelectAll = useCallback(() => {
    if (filteredLeadIds.length === 0) return
    const hasAll = filteredLeadIds.every(id => selectedLeads.includes(id))
    if (hasAll) {
      setSelectedLeads(prev => prev.filter(id => !filteredLeadIds.includes(id)))
    } else {
      setSelectedLeads(prev => Array.from(new Set([...prev, ...filteredLeadIds])))
    }
  }, [filteredLeadIds, selectedLeads])

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [leadsResult, metricsResult] = await Promise.all([
        getLeads({}),
        getEnhancedLeadMetrics({}),
      ])

      if (leadsResult.success && leadsResult.data) {
        // Add computed fields
        const now = new Date()
        const rawLeads = leadsResult.data as unknown as Lead[]
        const processedLeads = rawLeads.map(lead => {
          const createdAt = lead.createdAt ? new Date(lead.createdAt) : now
          const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
          const isOverdue = lead.followUpDate ? new Date(lead.followUpDate) < now && lead.status !== 'CONVERTED' : false
          return { ...lead, daysSinceCreated, isOverdue, activities: lead.activities || [] }
        })
        setLeads(processedLeads)
      }

      if (metricsResult.success && metricsResult.data) {
        setMetrics(metricsResult.data as LeadMetrics)
      }
    } catch {
      toast.error('Error', 'Failed to fetch leads data')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (!role) return

    if (!hasLeadAccess) {
      setLoading(false)
      return
    }

    fetchData()
  }, [fetchData, hasLeadAccess, role])

  // Handle action parameter to open specific modals (e.g. Add Lead)
  useEffect(() => {
    if (globalThis.window && canCreateLead) {
      const searchParams = new URLSearchParams(globalThis.window.location.search)
      if (searchParams.get('action') === 'new') {
        setIsCreateModalOpen(true)
        // Clean up the URL to prevent reopening on refresh
        const url = new URL(globalThis.window.location.href)
        url.searchParams.delete('action')
        globalThis.window.history.replaceState({}, '', url.toString())
      }
    }
  }, [canCreateLead])

  const handleCreateSuccess = async () => {
    await fetchData()
    setIsCreateModalOpen(false)
  }

  const handleEditLead = async () => {
    if (!selectedLead) return

    const result = await updateLead({
      id: selectedLead._id,
      ...formState,
    })

    if (!result.success) {
      toast.error('Update failed', result.error)
      return
    }

    await fetchData()
    setIsEditModalOpen(false)
    setSelectedLead(null)
    toast.success('Lead Updated', formState.companyName)
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!canDelete) {
      toast.error('Forbidden', 'Only admins can delete leads')
      return
    }

    const lead = leads.find(l => l._id === leadId)
    if (!lead) return

    if (!confirm(`Are you sure you want to delete lead "${lead.companyName}"? This action cannot be undone.`)) {
      return
    }

    const result = await deleteLead({ leadId })
    if (!result.success) {
      toast.error('Delete failed', result.error)
      return
    }

    await fetchData()
    toast.success('Lead Deleted', lead.companyName)
  }

  const handleConvertLead = async (leadId: string) => {
    const result = await convertLeadToCompany({ leadId })
    if (!result.success) {
      toast.error('Conversion failed', result.error)
      return
    }

    await fetchData()
    toast.success('Lead Converted', 'Company created from lead')
  }

  const handleAddActivity = async (leadId: string, activity: Omit<LeadActivity, '_id' | 'createdBy' | 'createdByName'>) => {
    const result = await addLeadActivity({ leadId, activity })
    if (!result.success) {
      toast.error('Failed to log activity', result.error)
      return
    }

    await fetchData()
    toast.success('Activity Logged', 'Activity has been recorded')
  }

  const handleExport = () => {
    if (!canExportLeads) {
      toast.error('Forbidden', 'Only admins can export leads')
      return
    }

    const leadsToExport = selectedLeads.length > 0
      ? leads.filter(l => selectedLeads.includes(l._id))
      : leads

    const csvData = [
      ['Lead ID', 'Company', 'Contact Name', 'Phone', 'Email', 'Sector', 'Source', 'Confidence', 'Status', 'Created Date', 'Follow-up Date', 'Assigned To'],
      ...leadsToExport.map(l => [
        l._id,
        l.companyName,
        l.contactName || '',
        l.contactPhone || '',
        l.contactEmail || '',
        l.sector,
        l.sourcePlatform,
        `${l.confidenceScore}%`,
        l.status,
        l.createdAt || '',
        l.followUpDate || '',
        l.assignedToName || l.assignedTo || '',
      ])
    ]

    const csv = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = globalThis.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()

    toast.success('Leads Exported', `${leadsToExport.length} leads exported to CSV`)
  }

  const openEditModal = (lead: Lead) => {
    setSelectedLead(lead)
    setFormState({
      _id: lead._id,
      sourcePlatform: lead.sourcePlatform,
      companyName: lead.companyName,
      sector: lead.sector,
      contactName: lead.contactName || '',
      contactPhone: lead.contactPhone || '',
      contactEmail: lead.contactEmail || '',
      contactLinkedIn: lead.contactLinkedIn || '',
      confidenceScore: lead.confidenceScore,
      notes: lead.notes || '',
      status: lead.status,
      followUpDate: lead.followUpDate || '',
      assignedTo: lead.assignedTo || '',
      activities: lead.activities || [],
    })
    setIsEditModalOpen(true)
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600 dark:text-slate-300">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="font-medium">Loading your permissionsâ€¦</span>
        </div>
      </div>
    )
  }

  if (!hasLeadAccess) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-6">
        <div className="max-w-xl rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-10 shadow-sm">
          <div className="mb-4 flex items-center gap-3 text-red-600 dark:text-red-400">
            <AlertCircle className="w-6 h-6" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Access restricted</h1>
          </div>
          <p className="text-gray-700 dark:text-slate-300">
            Lead creation and conversion are reserved for Admins and Coordinators. As a Recruiter, focus on your assigned JDs, candidates, and timesheets.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 relative z-10">
      <div className="px-4 py-6 space-y-6 relative z-10">
        {/* Hero Section — rendered immediately for best LCP */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1.5">
              Leads <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-600">Management</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Track, nurture, and convert potential hiring opportunities into active clients.
            </p>
          </div>

          {/* Quick Stats / Actions */}
          <div className="flex items-center gap-3">
            {(canExportLeads || canCreateLead) && (
              <>
                {canExportLeads && (
                  <button
                    onClick={handleExport}
                    className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium rounded-xl border border-slate-200 transition-all hover:border-slate-300 hover:shadow-sm"
                  >
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
                    Export {selectedLeads.length > 0 && `(${selectedLeads.length})`}
                  </button>
                )}
                {canCreateLead && (
                  <button
                    onClick={() => {
                      setFormState(emptyForm)
                      setIsCreateModalOpen(true)
                    }}
                    className="group relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-600 text-white font-bold rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    New Lead
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Analytics Section */}
        <div>
          <LeadsAnalytics leads={leads} />
        </div>

        {/* Overdue Alert */}
        {calculatedMetrics.overdue > 0 && (
          <div
            className="rounded-2xl border border-orange-200 bg-orange-50/50 backdrop-blur-sm p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-bold text-orange-900">
                  {calculatedMetrics.overdue} lead{calculatedMetrics.overdue > 1 ? 's' : ''} overdue for follow-up
                </p>
                <p className="text-sm text-orange-700">Action required immediately</p>
              </div>
            </div>
            <button
              onClick={() => setFilters(prev => ({ ...prev, showOverdueOnly: !prev.showOverdueOnly }))}
              className="px-4 py-2 bg-white rounded-lg text-sm font-bold text-orange-700 border border-orange-200 hover:bg-orange-50 transition-colors shadow-sm"
            >
              {filters.showOverdueOnly ? 'Show All' : 'Show Overdue Only'}
            </button>
          </div>
        )}

        {/* Main Content - Glass Table */}
        <div>
          <GlassCard
            noPadding
            lightMode
            className="overflow-hidden border-slate-200/60 !bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/40"
          >
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
                    <button
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all',
                        activeTab === 'pipeline' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                      )}
                      onClick={() => setActiveTab('pipeline')}
                    >
                      <Target className="h-4 w-4" />
                      Pipeline
                    </button>
                    <button
                      className={cn(
                        'flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all',
                        activeTab === 'analytics' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'
                      )}
                      onClick={() => setActiveTab('analytics')}
                    >
                      <BarChart3 className="h-4 w-4" />
                      Analytics
                    </button>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Real-time pipeline health overview</p>
                </div>

                {activeTab === 'pipeline' ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
                      <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-blue-700">Total Leads</p>
                            <p className="mt-2 text-3xl font-bold text-blue-900">{calculatedMetrics.total}</p>
                            <p className="mt-1 text-xs text-blue-600">Active pipeline</p>
                          </div>
                          <div className="rounded-xl bg-blue-600 p-3 text-white">
                            <Target className="h-6 w-6" />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-green-700">Conversion Rate</p>
                            <p className="mt-2 text-3xl font-bold text-green-900">{calculatedMetrics.conversionRate}%</p>
                            <p className="mt-1 text-xs text-green-600">{calculatedMetrics.converted} converted</p>
                          </div>
                          <div className="rounded-xl bg-green-600 p-3 text-white">
                            <TrendingUp className="h-6 w-6" />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-orange-700">Follow-ups Due</p>
                            <p className="mt-2 text-3xl font-bold text-orange-900">{calculatedMetrics.followUpsDue}</p>
                            <p className="mt-1 text-xs text-orange-600">Requires attention</p>
                          </div>
                          <div className="rounded-xl bg-orange-600 p-3 text-white">
                            <Clock className="h-6 w-6" />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-red-700">Overdue</p>
                            <p className="mt-2 text-3xl font-bold text-red-900">{calculatedMetrics.overdue}</p>
                            <p className="mt-1 text-xs text-red-600">Immediate action</p>
                          </div>
                          <div className="rounded-xl bg-red-600 p-3 text-white">
                            <AlertCircle className="h-6 w-6" />
                          </div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-medium text-purple-700">Avg Confidence</p>
                            <p className="mt-2 text-3xl font-bold text-purple-900">{calculatedMetrics.avgConfidence}%</p>
                            <p className="mt-1 text-xs text-purple-600">Lead quality</p>
                          </div>
                          <div className="rounded-xl bg-purple-600 p-3 text-white">
                            <CheckCircle2 className="h-6 w-6" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
                      <div className="flex flex-col gap-4 lg:flex-row">
                        <div className="flex-1">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              aria-label="Search leads"
                              placeholder="Search by company, contact, or sector..."
                              value={filters.search}
                              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                              className="h-12 w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-10 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                            />
                          </div>
                        </div>
                        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-3">
                          <select
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as LeadStatus | 'all' }))}
                            className="h-12 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-gray-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                          >
                            {statusOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <select
                            value={filters.sector}
                            onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value as LeadSector | 'all' }))}
                            className="h-12 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-gray-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                          >
                            {sectorOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <select
                            value={filters.source}
                            onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}
                            className="h-12 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm font-semibold text-gray-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                          >
                            {sourceOptions.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {selectedLeads.length > 0 && canExportLeads && (
                        <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                          <p>
                            {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} selected
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedLeads([])}
                              className="rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              Clear Selection
                            </button>
                            <button
                              onClick={handleExport}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-100"
                            >
                              <Download className="h-4 w-4" />
                              Export Selected
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <LeadsTable
                      leads={leads}
                      filters={filters}
                      selectedLeads={selectedLeads}
                      onSelectLead={handleSelectLead}
                      onSelectAll={handleSelectAll}
                      onViewLead={(lead) => {
                        setSelectedLead(lead)
                        setIsViewDialogOpen(true)
                      }}
                      onEditLead={openEditModal}
                      onDeleteLead={handleDeleteLead}
                      onLogActivity={(lead) => {
                        setSelectedLead(lead)
                        setIsActivityDialogOpen(true)
                      }}
                      onConvertLead={(lead) => {
                        setSelectedLead(lead)
                        setIsConvertDialogOpen(true)
                      }}
                      onQuickCall={(phone) => {
                        window.open(`tel:${phone}`)
                        toast.info('Opening dialer...')
                      }}
                      onQuickEmail={(email) => {
                        window.open(`mailto:${email}`)
                        toast.info('Opening email client...')
                      }}
                      canModify={checkCanModify}
                      canConvert={canConvert}
                      canDelete={canDelete}
                      loading={loading}
                      onFiltersChange={setFilters}
                    />
                  </div>
                ) : (
                  <LeadsAnalytics leads={leads} metrics={metrics || undefined} />
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Lead Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Lead - ${selectedLead?.companyName || ''}`}
        description="Update lead information"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-source" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Source Platform *</label>
              <select
                id="edit-source"
                title="Source Platform"
                className="select-modern w-full"
                value={formState.sourcePlatform}
                onChange={(e) => setFormState(prev => ({ ...prev, sourcePlatform: e.target.value }))}
              >
                <option value="">Select source</option>
                {SOURCE_PLATFORMS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-company" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Company Name *</label>
              <input
                id="edit-company"
                className="input-modern"
                placeholder="Enter company name"
                value={formState.companyName}
                onChange={(e) => setFormState(prev => ({ ...prev, companyName: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="edit-sector" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Sector *</label>
              <select
                id="edit-sector"
                title="Sector"
                className="select-modern w-full"
                value={formState.sector}
                onChange={(e) => setFormState(prev => ({ ...prev, sector: e.target.value as LeadSector }))}
              >
                {SECTORS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-confidence" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confidence % *</label>
              <input
                id="edit-confidence"
                className="input-modern"
                type="number"
                min="1"
                max="100"
                placeholder="1-100"
                value={formState.confidenceScore}
                onChange={(e) => setFormState(prev => ({ ...prev, confidenceScore: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label htmlFor="edit-status" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status *</label>
              <select
                id="edit-status"
                title="Status"
                className="select-modern w-full"
                value={formState.status}
                onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
              >
                {statusOptions.filter(s => s.value !== 'all').map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-followup" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Follow-up Date</label>
              <input
                id="edit-followup"
                className="input-modern"
                type="date"
                title="Follow-up Date"
                placeholder="Select follow-up date"
                value={formState.followUpDate}
                onChange={(e) => setFormState(prev => ({ ...prev, followUpDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <h4 className="font-semibold text-slate-900 mb-4">Contact Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-contact-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Contact Name</label>
                <input
                  id="edit-contact-name"
                  className="input-modern"
                  placeholder="Full name"
                  value={formState.contactName}
                  onChange={(e) => setFormState(prev => ({ ...prev, contactName: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="edit-phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone</label>
                <input
                  id="edit-phone"
                  className="input-modern"
                  placeholder="+91 XXXXX XXXXX"
                  value={formState.contactPhone}
                  onChange={(e) => setFormState(prev => ({ ...prev, contactPhone: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="edit-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                <input
                  id="edit-email"
                  className="input-modern"
                  type="email"
                  placeholder="email@company.com"
                  value={formState.contactEmail}
                  onChange={(e) => setFormState(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="edit-linkedin" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {formState.sourcePlatform ? `${formState.sourcePlatform} Profile` : 'Profile Link'}
                </label>
                <input
                  id="edit-linkedin"
                  className="input-modern"
                  placeholder={formState.sourcePlatform ? `Enter ${formState.sourcePlatform} profile URL...` : "https://..."}
                  value={formState.contactLinkedIn}
                  onChange={(e) => setFormState(prev => ({ ...prev, contactLinkedIn: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="edit-notes" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
            <textarea
              id="edit-notes"
              className="input-modern min-h-[80px]"
              placeholder="Add any relevant notes..."
              value={formState.notes}
              onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <AnimatedButton variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton variant="primary" onClick={handleEditLead}>
              Save Changes
            </AnimatedButton>
          </div>
        </div>
      </Modal>

      {/* View Lead Details Dialog */}
      <LeadDetailsDialog
        lead={selectedLead}
        isOpen={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false)
          setSelectedLead(null)
        }}
        onEdit={(lead) => {
          setIsViewDialogOpen(false)
          openEditModal(lead)
        }}
        onConvert={(lead) => {
          setIsViewDialogOpen(false)
          setSelectedLead(lead)
          setIsConvertDialogOpen(true)
        }}
        onLogActivity={(lead) => {
          setSelectedLead(lead)
          setIsActivityDialogOpen(true)
        }}
        canConvert={canConvert}
      />

      {/* Add Activity Dialog */}
      <LeadActivityDialog
        lead={selectedLead}
        isOpen={isActivityDialogOpen}
        onClose={() => {
          setIsActivityDialogOpen(false)
          if (!isViewDialogOpen) setSelectedLead(null)
        }}
        onSubmit={handleAddActivity}
      />

      {/* Convert Lead Dialog */}
      <LeadConvertDialog
        lead={selectedLead}
        isOpen={isConvertDialogOpen}
        onClose={() => {
          setIsConvertDialogOpen(false)
          setSelectedLead(null)
        }}
        onConvert={handleConvertLead}
      />
    </div>
  )
}
