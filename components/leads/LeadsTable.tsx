'use client'

import { useMemo, useState } from 'react'
import {
  Calendar,
  Mail,
  MoreVertical,
  Phone,
  Users,
  Edit,
  Trash2,
  Activity,
  ArrowUpRight,
  AlertCircle,
  Bell,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Eye,
  Search,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import type { Lead, LeadStatus, LeadFilters, LeadSector } from '@/types/leads'
import { STATUS_CONFIG, SECTORS, SOURCE_PLATFORMS } from '@/types/leads'

interface LeadsTableProps {
  readonly leads: Lead[]
  readonly filters: LeadFilters
  readonly selectedLeads: string[]
  readonly onSelectLead: (leadId: string) => void
  readonly onSelectAll: () => void
  readonly onViewLead: (lead: Lead) => void
  readonly onEditLead: (lead: Lead) => void
  readonly onDeleteLead: (leadId: string) => void
  readonly onLogActivity: (lead: Lead) => void
  readonly onConvertLead: (lead: Lead) => void
  readonly onQuickCall: (phone: string) => void
  readonly onQuickEmail: (email: string) => void
  readonly canModify: (lead: Lead) => boolean
  readonly canConvert: boolean
  readonly canDelete: boolean
  readonly loading?: boolean
  readonly forceShowAll?: boolean
  readonly onFiltersChange?: (filters: LeadFilters) => void
}

type SortField = 'companyName' | 'confidenceScore' | 'status' | 'followUpDate' | 'assignedToName'
type SortDir = 'asc' | 'desc' | null

// ── Status colour map ────────────────────────────────────────────────────
const STATUS_STYLE: Record<LeadStatus, { dot: string; pill: string; text: string }> = {
  NEW: { dot: 'bg-blue-600', pill: 'bg-blue-50 border-blue-300', text: 'text-blue-800' },
  CONTACTED: { dot: 'bg-sky-600', pill: 'bg-sky-50 border-sky-300', text: 'text-sky-800' },
  QUALIFIED: { dot: 'bg-violet-600', pill: 'bg-violet-50 border-violet-300', text: 'text-violet-800' },
  FOLLOW_UP: { dot: 'bg-amber-600', pill: 'bg-amber-50 border-amber-300', text: 'text-amber-900' },
  CONVERTED: { dot: 'bg-emerald-600', pill: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-800' },
  REJECTED: { dot: 'bg-red-600', pill: 'bg-red-50 border-red-300', text: 'text-red-800' },
  STALLED: { dot: 'bg-gray-600', pill: 'bg-gray-50 border-gray-300', text: 'text-gray-800' },
}

// ── Confidence colour helper ─────────────────────────────────────────────
const confStyle = (score: number) => {
  if (score >= 80) return { bar: 'bg-emerald-600', text: 'text-emerald-800' }
  if (score >= 60) return { bar: 'bg-amber-500', text: 'text-amber-900' }
  return { bar: 'bg-red-600', text: 'text-red-800' }
}

// ── Sort icon ────────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { readonly active: boolean; readonly dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3 h-3 opacity-30" />
  if (dir === 'asc') return <ChevronUp className="w-3 h-3 text-indigo-600" />
  return <ChevronDown className="w-3 h-3 text-indigo-600" />
}

// ── Column header helper moved outside component ─────────────────────
function ThComponent({ 
  field, 
  label, 
  right,
  sortField,
  sortDir,
  toggleSort 
}: { 
  readonly field: SortField; 
  readonly label: string; 
  readonly right?: boolean;
  readonly sortField: SortField | null;
  readonly sortDir: SortDir;
  readonly toggleSort: (field: SortField) => void;
}) {
  return (
    <th
      onClick={() => toggleSort(field)}
      className={cn(
        'cursor-pointer select-none whitespace-nowrap px-3 py-3 text-sm font-semibold uppercase tracking-wide transition-colors',
        'text-slate-700 hover:text-slate-900',
        sortField === field && 'text-indigo-700',
        right && 'text-right',
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon active={sortField === field} dir={sortDir} />
      </span>
    </th>
  )
}

export function LeadsTable({
  leads,
  filters,
  selectedLeads,
  onSelectLead,
  onSelectAll,
  onViewLead,
  onEditLead,
  onDeleteLead,
  onLogActivity,
  onConvertLead,
  onQuickCall,
  onQuickEmail,
  canModify,
  canConvert,
  canDelete,
  loading = false,
  forceShowAll = false,
  onFiltersChange,
}: LeadsTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [isViewAllOpen, setIsViewAllOpen] = useState(false)

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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortField(null); setSortDir(null) }
    } else {
      setSortField(field); setSortDir('asc')
    }
  }

  // ── Filter + sort ────────────────────────────────────────────────────
  const filteredLeads = useMemo(() => {
    let rows = leads.filter((lead) => {
      const q = filters.search.toLowerCase()
      const matchSearch = !q ||
        lead.companyName.toLowerCase().includes(q) ||
        lead.contactName?.toLowerCase().includes(q) ||
        lead.sector.toLowerCase().includes(q) ||
        lead.sourcePlatform.toLowerCase().includes(q)

      return matchSearch
        && (filters.status === 'all' || lead.status === filters.status)
        && (filters.sector === 'all' || lead.sector === filters.sector)
        && (filters.source === 'all' || lead.sourcePlatform === filters.source)
        && (!filters.showOverdueOnly || lead.isOverdue)
    })

    if (sortField && sortDir) {
      rows = [...rows].sort((a, b) => {
        const aVal = a[sortField as keyof Lead]
        const bVal = b[sortField as keyof Lead]
        const av = typeof aVal === 'object' ? JSON.stringify(aVal) : String(aVal ?? '')
        const bv = typeof bVal === 'object' ? JSON.stringify(bVal) : String(bVal ?? '')
        const c = av.localeCompare(bv, undefined, { numeric: true })
        return sortDir === 'asc' ? c : -c
      })
    }
    return rows
  }, [leads, filters, sortField, sortDir])

  const displayedLeads = useMemo(() => {
    return forceShowAll ? filteredLeads : filteredLeads.slice(0, 20)
  }, [filteredLeads, forceShowAll])

  const selCount = useMemo(() => filteredLeads.filter(l => selectedLeads.includes(l._id)).length, [filteredLeads, selectedLeads])
  const allSel = filteredLeads.length > 0 && selCount === filteredLeads.length
  const someSel = selCount > 0 && !allSel

  // ── Skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    const skeletonHeaders = Array.from({ length: 8 }, (_, i) => `header-${i}`)
    const skeletonRows = Array.from({ length: 7 }, (_, i) => `row-${i}`)
    
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {skeletonHeaders.map((key) => (
                <th key={key} className="px-3 py-3">
                  <div className="h-3 w-14 animate-pulse rounded bg-slate-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skeletonRows.map((rowKey) => (
              <tr key={rowKey} className="border-b border-slate-100">
                {skeletonHeaders.map((colKey) => (
                  <td key={`${rowKey}-${colKey}`} className="px-3 py-3">
                    <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${50 + (Number.parseInt(colKey.split('-')[1], 10) * 7) % 40}%` }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────
  if (filteredLeads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <AlertCircle className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-600">No leads found</p>
        <p className="text-xs text-slate-400">Try adjusting your filters</p>
      </div>
    )
  }

  // ── Table ─────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden w-full">

      {/* Meta bar */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <span className="text-xs text-slate-600">
          <span className="font-bold text-slate-800">{filteredLeads.length}</span>
          {' '}{filteredLeads.length === 1 ? 'lead' : 'leads'}
          {selCount > 0 && (
            <span className="ml-2 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
              {selCount} selected
            </span>
          )}
        </span>
        <span className="text-[11px] font-medium text-slate-600">Click headers to sort</span>
      </div>

      {/* Table — no overflow-x-auto so it never scrolls horizontally */}
      <table className="w-full table-fixed border-collapse text-sm">

        {/* ── THEAD ── */}
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">

            {/* Checkbox — fixed 36px */}
            <th className="w-9 px-3 py-3">
              <input
                type="checkbox"
                title="Select all"
                aria-label="Select all leads"
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                checked={allSel}
                ref={(el) => { if (el) el.indeterminate = someSel }}
                onChange={onSelectAll}
              />
            </th>

            {/* Company — widest column */}
            <ThComponent field="companyName" label="Company" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} />

            {/* Contact */}
            <th className="px-3 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-700 whitespace-nowrap">
              Contact
            </th>

            {/* Source */}
            <th className="px-3 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-700 whitespace-nowrap">
              Source
            </th>

            {/* Score */}
            <ThComponent field="confidenceScore" label="Score" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} />

            {/* Status */}
            <ThComponent field="status" label="Status" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} />

            {/* Follow-up */}
            <ThComponent field="followUpDate" label="Follow-up" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} />

            {/* Owner */}
            <ThComponent field="assignedToName" label="Owner" sortField={sortField} sortDir={sortDir} toggleSort={toggleSort} />

            {/* Actions — fixed 90px */}
            <th className="w-[90px] px-3 py-3 text-right text-sm font-semibold uppercase tracking-wide text-slate-700">
              Actions
            </th>
          </tr>
        </thead>

        {/* ── TBODY ── */}
        <tbody className="divide-y divide-slate-100">
          {displayedLeads.map((lead, idx) => {
            const ss = STATUS_STYLE[lead.status] ?? STATUS_STYLE['NEW']
            const cs = confStyle(lead.confidenceScore)
            const isSel = selectedLeads.includes(lead._id)

            // Calculate row background classes
            let rowBgClass = 'bg-slate-50/40 hover:bg-slate-50/80'
            if (isSel) {
              rowBgClass = 'bg-indigo-50/70 hover:bg-indigo-50'
            } else if (lead.isOverdue) {
              rowBgClass = 'bg-amber-50/50 hover:bg-amber-50/80'
            } else if (idx % 2 === 0) {
              rowBgClass = 'bg-white hover:bg-slate-50/80'
            }

            return (
              <tr
                key={lead._id}
                className={cn(
                  'group transition-colors duration-75',
                  rowBgClass,
                )}
              >
                {/* ── Checkbox ── */}
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    title={`Select ${lead.companyName}`}
                    aria-label={`Select lead ${lead.companyName}`}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                    checked={isSel}
                    onChange={() => onSelectLead(lead._id)}
                  />
                </td>

                {/* ── Company + sector ── */}
                <td className="px-3 py-2.5 overflow-hidden">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {lead.isOverdue && (
                      <Bell className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 animate-pulse" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900 leading-tight">
                        {lead.companyName}
                      </p>
                      <p className="truncate text-xs text-slate-400">{lead.sector}</p>
                    </div>
                  </div>
                </td>

                {/* ── Contact + quick actions ── */}
                <td className="px-3 py-2.5 overflow-hidden">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-700 leading-tight">
                      {lead.contactName || <span className="italic text-slate-400">TBD</span>}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {lead.contactPhone && (
                        <button
                          onClick={() => onQuickCall(lead.contactPhone!)}
                          title={lead.contactPhone}
                          className="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 transition-all"
                        >
                          <Phone className="w-3 h-3" />Call
                        </button>
                      )}
                      {lead.contactEmail && (
                        <button
                          onClick={() => onQuickEmail(lead.contactEmail!)}
                          title={lead.contactEmail}
                          className="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-700 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-800 transition-all"
                        >
                          <Mail className="w-3 h-3" />Mail
                        </button>
                      )}
                    </div>
                  </div>
                </td>

                {/* ── Source ── */}
                <td className="px-3 py-2.5 overflow-hidden">
                  <p className="truncate text-sm font-medium text-slate-700">{lead.sourcePlatform}</p>
                </td>

                {/* ── Confidence score + bar ── */}
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className={cn('text-sm font-bold leading-none', cs.text)}>
                      {lead.confidenceScore}%
                    </span>
                    <div className="h-1 w-14 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cn('h-full rounded-full', cs.bar)}
                        style={{ width: `${lead.confidenceScore}%` }}
                      />
                    </div>
                  </div>
                </td>

                {/* ── Status ── */}
                <td className="px-3 py-2.5">
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
                    ss.pill, ss.text,
                  )}>
                    <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', ss.dot)} />
                    {STATUS_CONFIG[lead.status]?.label ?? lead.status}
                  </span>
                </td>

                {/* ── Follow-up ── */}
                <td className="px-3 py-2.5">
                  {lead.followUpDate ? (
                    <div className={cn(
                      'flex items-center gap-1 text-sm whitespace-nowrap font-medium',
                      lead.isOverdue ? 'font-bold text-amber-800' : 'text-slate-700',
                    )}>
                      <Calendar className={cn('w-3.5 h-3.5 flex-shrink-0', lead.isOverdue ? 'text-amber-600' : 'text-slate-500')} />
                      {lead.followUpDate}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-slate-500">—</span>
                  )}
                </td>

                {/* ── Owner ── */}
                <td className="px-3 py-2.5 overflow-hidden">
                  {lead.assignedToName || lead.assignedTo ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">
                        {(lead.assignedToName || lead.assignedTo || '?')[0].toUpperCase()}
                      </div>
                      <span className="truncate text-sm font-medium text-slate-800">
                        {lead.assignedToName || lead.assignedTo}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 opacity-60">
                      <Users className="w-4 h-4 text-slate-600" />
                      <span className="text-sm font-medium text-slate-600">—</span>
                    </div>
                  )}
                </td>

                {/* ── Actions ── */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-1">

                    {/* View icon button */}
                    <button
                      onClick={() => onViewLead(lead)}
                      title="View lead"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-all hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {/* More actions */}
                    <div className="relative group/menu">
                      <button
                        title="More actions"
                        aria-label="More actions"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition-all hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown */}
                      <div className="invisible absolute right-0 top-full z-50 mt-1 w-48 origin-top-right scale-95 rounded-xl border border-slate-200 bg-white py-1 opacity-0 shadow-xl ring-1 ring-slate-900/5 transition-all duration-100 group-hover/menu:visible group-hover/menu:scale-100 group-hover/menu:opacity-100">

                        {canModify(lead) && (
                          <button
                            onClick={() => onEditLead(lead)}
                            className="flex w-full items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Edit className="w-4 h-4 text-slate-400" />
                            Edit Lead
                          </button>
                        )}

                        <button
                          onClick={() => onLogActivity(lead)}
                          className="flex w-full items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Activity className="w-4 h-4 text-slate-400" />
                          Log Activity
                        </button>

                        {lead.status !== 'CONVERTED' && canConvert && (
                          <>
                            <div className="my-1 h-px bg-slate-100" />
                            <button
                              onClick={() => onConvertLead(lead)}
                              className="flex w-full items-center gap-2 px-3.5 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                              Convert to Company
                            </button>
                          </>
                        )}

                        {canModify(lead) && canDelete && (
                          <>
                            <div className="my-1 h-px bg-slate-100" />
                            <button
                              onClick={() => onDeleteLead(lead._id)}
                              className="flex w-full items-center gap-2 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Lead
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex flex-col border-t border-slate-100 bg-slate-50/60">
        {!forceShowAll && filteredLeads.length > 20 && (
          <div className="p-4 flex justify-center border-b border-slate-100 bg-white">
            <button
              onClick={() => setIsViewAllOpen(true)}
              className="px-6 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all hover:scale-105 shadow-sm active:scale-95"
            >
              View All Leads ({filteredLeads.length})
            </button>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[11px] text-slate-500 font-medium">
            Showing{' '}
            <span className="font-bold text-slate-700">{displayedLeads.length}</span>
            {' '}of{' '}
            <span className="font-bold text-slate-700">{filteredLeads.length}</span>
            {' '}filtered leads (Total: {leads.length})
          </span>
          {selCount > 0 && (
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
              {selCount} selected
            </span>
          )}
        </div>
      </div>

      {!forceShowAll && (
        <Modal
          isOpen={isViewAllOpen}
          onClose={() => setIsViewAllOpen(false)}
          title="All Leads Database"
          size="full"
        >
          <div className="pb-6 space-y-4 w-full">
            {/* Filter Controls */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      aria-label="Search leads"
                      placeholder="Search by company, contact, or sector..."
                      value={filters.search}
                      onChange={(e) => onFiltersChange?.({ ...filters, search: e.target.value })}
                      className="h-12 w-full rounded-xl border border-gray-200 bg-white px-10 text-sm font-medium text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-3">
                  <select
                    value={filters.status}
                    onChange={(e) => onFiltersChange?.({ ...filters, status: e.target.value as LeadStatus | 'all' })}
                    className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <select
                    value={filters.sector}
                    onChange={(e) => onFiltersChange?.({ ...filters, sector: e.target.value as LeadSector | 'all' })}
                    className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    {sectorOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <select
                    value={filters.source}
                    onChange={(e) => onFiltersChange?.({ ...filters, source: e.target.value })}
                    className="h-12 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100"
                  >
                    {sourceOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Table */}
            <div className="h-[75vh] overflow-y-auto">
              <LeadsTable
                leads={leads}
                filters={filters}
                selectedLeads={selectedLeads}
                onSelectLead={onSelectLead}
                onSelectAll={onSelectAll}
                onViewLead={onViewLead}
                onEditLead={onEditLead}
                onDeleteLead={onDeleteLead}
                onLogActivity={onLogActivity}
                onConvertLead={onConvertLead}
                onQuickCall={onQuickCall}
                onQuickEmail={onQuickEmail}
                canModify={canModify}
                canConvert={canConvert}
                canDelete={canDelete}
                loading={loading}
                forceShowAll={true}
                onFiltersChange={onFiltersChange}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
