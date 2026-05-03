'use client'

import { useState, useMemo, useEffect, useCallback, memo } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Briefcase,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
  MapPin,
  IndianRupee,
  Users,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Send,
  Building2,
  Target,
  Download,
  AlertCircle,
  Archive,
  ArrowUpRight,
  Filter
} from 'lucide-react'
import { cn, getRequirementIdSectorCode } from '@/lib/utils'
import Button, { IconButton } from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Input'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { Combobox } from '@/components/ui/Combobox'
import {
  getRequirements,
  createRequirementAction,
  updateRequirementAction,
  updateRequirementStatusAction,
  deleteRequirementAction,
  freezeRequirementAction,
  reassignRequirementAction,
} from '@/lib/actions/module4-requirement'
import { getCompanies } from '@/lib/actions/module3-company'
import { AutomationPanel } from '@/components/automation/AutomationPanel'
import { createExportJobAction, listExportJobsAction } from '@/lib/actions/module15-export'

// Types
interface Requirement {
  id: string
  mmdId: string
  group: 'RASHMI' | 'MANJUNATH' | 'SCRAPING' | 'LEADS'
  title: string
  company: string
  companyId: string
  location: string
  locationType: string
  status: string
  priority: string
  owner: string
  budget: string
  openings: number
  filledPositions: number
  submissions: number
  interviews: number
  skills: string[]
  experienceMin: number
  experienceMax: number
  createdAt: string
  deadline?: string
  description?: string
  applicationFormId?: string | null
  whatsAppMessage?: string | null
  emailMessage?: string | null
  linkedInPost?: string | null
  automationStatus?: 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  automationAttempts?: number
  automationLastAttemptAt?: string | null
  automationLastSuccessAt?: string | null
  automationLastError?: string | null
  lastActivityAt?: string
  daysSinceActivity?: number | null
  stalled?: boolean
}

interface SelectOption {
  value: string
  label: string
}

interface RequirementCompany {
  _id: string
  name: string
  location?: string
  sector?: string
  mouStatus?: string
  mouEndDate?: string | Date | null
}

type MouEligibilityReason = 'ACTIVE' | 'NOT_SIGNED'

interface MouEligibilityState {
  active: boolean
  reason: MouEligibilityReason
}

interface ExportJobItem {
  _id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'
  format: 'CSV' | 'JSON' | 'XLSX'
  createdAt: string
  fileUrl?: string
  errorMessage?: string
}

function extractCompanyItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []

  const source = payload as Record<string, unknown>
  if (Array.isArray(source.companies)) return source.companies
  if (Array.isArray(source.items)) return source.items
  if (Array.isArray(source.data)) return source.data

  return []
}

function normalizeCompanyPayload(payload: unknown): RequirementCompany[] {
  const items = extractCompanyItems(payload)
  const deduped = new Map<string, RequirementCompany>()

  for (const item of items) {
    if (!item || typeof item !== 'object') continue

    const record = item as Record<string, unknown>
    const idCandidate = record._id ?? record.id
    const nameCandidate = record.name ?? record.companyName

    const id = typeof idCandidate === 'string' ? idCandidate.trim() : ''
    const name = typeof nameCandidate === 'string' ? nameCandidate.trim() : ''

    if (!id || !name) continue

    const normalized: RequirementCompany = {
      _id: id,
      name,
      location: typeof record.location === 'string' ? record.location : undefined,
      sector: typeof record.sector === 'string' ? record.sector : undefined,
      mouStatus: typeof record.mouStatus === 'string' ? record.mouStatus : undefined,
      mouEndDate: typeof record.mouEndDate === 'string' || record.mouEndDate instanceof Date || record.mouEndDate === null
        ? (record.mouEndDate as string | Date | null)
        : undefined,
    }

    if (!deduped.has(normalized._id)) {
      deduped.set(normalized._id, normalized)
    }
  }

  return Array.from(deduped.values())
}

function normalizeExportJobs(items: unknown): ExportJobItem[] {
  if (!Array.isArray(items)) return []

  return items
    .map((item: any) => {
      if (!item || typeof item !== 'object') return null
      const id = typeof item._id === 'string' ? item._id : ''
      if (!id) return null

      return {
        _id: id,
        status: item.status || 'PENDING',
        format: item.format || 'CSV',
        createdAt: item.createdAt || '',
        fileUrl: typeof item.fileUrl === 'string' ? item.fileUrl : undefined,
        errorMessage: typeof item.errorMessage === 'string' ? item.errorMessage : undefined,
      } as ExportJobItem
    })
    .filter((item): item is ExportJobItem => Boolean(item))
}

function inferDefaultGroup(name: string | null | undefined, role: string | undefined): Requirement['group'] {
  const normalizedName = (name || '').toUpperCase()

  if (role === 'SCRAPER') return 'SCRAPING'
  if (normalizedName.includes('RASHMI')) return 'RASHMI'
  if (normalizedName.includes('MANJUNATH')) return 'MANJUNATH'

  return 'LEADS'
}

function normalizeMouStatus(value?: string): string {
  return (value || '').trim().toUpperCase()
}

function formatMouStatusLabel(value?: string): string {
  const normalized = normalizeMouStatus(value)
  if (!normalized) return 'not started'
  return normalized.replace(/_/g, ' ').toLowerCase()
}

function getRequirementMouEligibility(company: { mouStatus?: string; mouEndDate?: string | Date | null } | undefined): MouEligibilityState {
  if (!company) return { active: false, reason: 'NOT_SIGNED' }

  const normalizedStatus = normalizeMouStatus(company.mouStatus)
  if (normalizedStatus !== 'SIGNED') {
    return { active: false, reason: 'NOT_SIGNED' }
  }

  // Manual testing mode: signed status alone is enough for Add Requirement eligibility.

  return { active: true, reason: 'ACTIVE' }
}

function getRequirementMouSubtitle(company: RequirementCompany, eligibility: MouEligibilityState): string {
  if (eligibility.active) return 'MOU signed'

  return `MOU ${formatMouStatusLabel(company.mouStatus)}`
}

function hasActiveRequirementMou(company: { mouStatus?: string; mouEndDate?: string | Date | null } | undefined) {
  return getRequirementMouEligibility(company).active
}

function formatWorkMode(workMode?: string): string {
  if (workMode === 'HYBRID') return 'Hybrid'
  if (workMode === 'ONSITE') return 'On-site'
  return 'Remote'
}

function parseWorkMode(locationType: string): 'REMOTE' | 'HYBRID' | 'ONSITE' {
  const normalized = locationType.trim().toLowerCase()
  if (normalized === 'hybrid') return 'HYBRID'
  if (normalized === 'on-site' || normalized === 'onsite') return 'ONSITE'
  return 'REMOTE'
}

function formatBudget(salaryMin?: number | null, salaryMax?: number | null): string {
  if (!salaryMin && !salaryMax) return 'Not specified'
  if (salaryMin && salaryMax) return `₹${(salaryMin / 100000).toFixed(1)}L - ₹${(salaryMax / 100000).toFixed(1)}L`
  if (salaryMin) return `₹${(salaryMin / 100000).toFixed(1)}L+`
  return `Up to ₹${((salaryMax || 0) / 100000).toFixed(1)}L`
}

function parseBudgetValue(token: string): number | undefined {
  const normalized = token.replace(/,/g, '').trim().toLowerCase()
  const numeric = Number.parseFloat(normalized)
  if (!Number.isFinite(numeric)) return undefined

  if (normalized.includes('cr')) return Math.round(numeric * 10000000)
  if (normalized.includes('lac') || normalized.includes('lakh') || /\d(?:\.\d+)?l\b/.test(normalized)) {
    return Math.round(numeric * 100000)
  }
  if (normalized.includes('k')) return Math.round(numeric * 1000)
  return Math.round(numeric)
}

function parseBudgetRange(budget: string | undefined): { salaryMin?: number; salaryMax?: number } {
  if (!budget?.trim()) return {}

  const matches = budget.match(/\d+(?:\.\d+)?\s*(?:cr|crore|lac|lakh|l|k)?/gi) || []
  const parsed = matches
    .map(parseBudgetValue)
    .filter((value): value is number => typeof value === 'number')

  if (parsed.length >= 2) {
    return { salaryMin: parsed[0], salaryMax: parsed[1] }
  }

  if (parsed.length === 1) {
    if (/up to|max/i.test(budget)) return { salaryMax: parsed[0] }
    return { salaryMin: parsed[0] }
  }

  return {}
}

function buildRequirementDescription(payload: {
  title: string
  company: string
  location: string
  budget: string
  skills: string[]
  description?: string
}): string {
  const explicitDescription = payload.description?.trim()
  if (explicitDescription && explicitDescription.length >= 50) return explicitDescription

  const fallback = [
    `Requirement for ${payload.title} at ${payload.company || 'the selected company'}.`,
    `Location: ${payload.location || 'To be confirmed'}.`,
    `Budget: ${payload.budget || 'To be finalized'}.`,
    `Core skills: ${(payload.skills.length > 0 ? payload.skills : ['General hiring']).join(', ')}.`,
    explicitDescription,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return fallback.length >= 50
    ? fallback
    : `${fallback} Additional hiring details will be added during intake.`.trim()
}

function mapRequirement(raw: Record<string, unknown>): Requirement {
  const id = String(raw.id ?? raw._id ?? '')
  const company = typeof raw.company === 'string'
    ? raw.company
    : (raw.company as { name?: string } | undefined)?.name || (raw.companyDetails as { name?: string } | undefined)?.name || 'Unknown Company'

  const companyId = typeof raw.companyId === 'string'
    ? raw.companyId
    : String((raw.companyId as { _id?: string } | undefined)?._id || (raw.companyDetails as { _id?: string } | undefined)?._id || '')

  const owner = typeof raw.owner === 'string'
    ? raw.owner
    : (raw.accountOwnerId as { name?: string } | undefined)?.name || 'Unassigned'

  const title = String(raw.title ?? raw.jobTitle ?? 'Untitled Position')
  const skills = Array.isArray(raw.skills)
    ? raw.skills.filter((skill): skill is string => typeof skill === 'string')
    : []

  const deadline = raw.deadline
    ? String(raw.deadline)
    : raw.interviewClosingDate
      ? new Date(String(raw.interviewClosingDate)).toISOString().slice(0, 10)
      : ''

  const lastActivityAt = raw.lastActivityAt ? String(raw.lastActivityAt) : undefined

  return {
    id,
    mmdId: String(raw.mmdId ?? ''),
    group: (raw.group as Requirement['group']) || 'LEADS',
    title,
    company,
    companyId,
    location: String(raw.location ?? ''),
    locationType: String(raw.locationType ?? formatWorkMode(String(raw.workMode ?? 'REMOTE'))),
    status: String(raw.status ?? 'PENDING_INTAKE'),
    priority: String(raw.priority ?? 'Medium'),
    owner,
    budget: typeof raw.budget === 'string' ? raw.budget : formatBudget(raw.salaryMin as number | undefined, raw.salaryMax as number | undefined),
    openings: Number(raw.openings ?? 1),
    filledPositions: Number(raw.filledPositions ?? 0),
    submissions: Number(raw.submissions ?? 0),
    interviews: Number(raw.interviews ?? 0),
    skills,
    experienceMin: Number(raw.experienceMin ?? 0),
    experienceMax: Number(raw.experienceMax ?? 0),
    createdAt: raw.createdAt ? new Date(String(raw.createdAt)).toISOString() : new Date().toISOString(),
    deadline,
    description: String(raw.description ?? raw.fullDescription ?? ''),
    applicationFormId: typeof raw.applicationFormId === 'string' ? raw.applicationFormId : null,
    whatsAppMessage: typeof raw.whatsAppMessage === 'string' ? raw.whatsAppMessage : null,
    emailMessage: typeof raw.emailMessage === 'string' ? raw.emailMessage : null,
    linkedInPost: typeof raw.linkedInPost === 'string' ? raw.linkedInPost : null,
    automationStatus: (raw.automationStatus === 'PROCESSING' || raw.automationStatus === 'COMPLETED' || raw.automationStatus === 'FAILED')
      ? raw.automationStatus
      : 'NOT_STARTED',
    automationAttempts: Number(raw.automationAttempts ?? 0),
    automationLastAttemptAt: raw.automationLastAttemptAt ? String(raw.automationLastAttemptAt) : null,
    automationLastSuccessAt: raw.automationLastSuccessAt ? String(raw.automationLastSuccessAt) : null,
    automationLastError: typeof raw.automationLastError === 'string' ? raw.automationLastError : null,
    lastActivityAt,
    daysSinceActivity: calculateDaysSinceActivity(lastActivityAt),
    stalled: Boolean(raw.stalled),
  }
}

const REQUIREMENT_FILTER_STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'PENDING_INTAKE', label: 'Pending Intake' },
  { value: 'AWAITING_JD', label: 'Awaiting JD' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SOURCING', label: 'Sourcing' },
  { value: 'INTERVIEWING', label: 'Interviewing' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'STALLED', label: 'Stalled (idle)' },
  { value: 'CLOSED_HIRED', label: 'Closed Hired' },
  { value: 'CLOSED_NOT_HIRED', label: 'Closed Not Hired' },
]

const REQUIREMENT_FILTER_STATUS_VALUES = new Set(REQUIREMENT_FILTER_STATUS_OPTIONS.map((option) => option.value))
const REQUIREMENT_FILTER_PRIORITY_VALUES = new Set(['all', 'High', 'Medium', 'Low'])
const REQUIREMENTS_PAGE_SIZE = 24

const REQUIREMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'PENDING_INTAKE', label: 'Pending Intake' },
  { value: 'AWAITING_JD', label: 'Awaiting JD' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SOURCING', label: 'Sourcing' },
  { value: 'INTERVIEWING', label: 'Interviewing' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'CLOSED_HIRED', label: 'Closed Hired' },
  { value: 'CLOSED_NOT_HIRED', label: 'Closed Not Hired' },
]

const REQUIREMENT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
})

function formatRequirementDate(value?: string | Date | null) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return REQUIREMENT_DATE_FORMATTER.format(date)
}

function calculateDaysSinceActivity(value?: string) {
  if (!value) return null

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return null

  return Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24)))
}

// Status Configuration
const statusConfig: Record<string, { bg: string; icon: any; color: string }> = {
  // Title Case (Legacy/Frontend)
  Active: {
    bg: 'bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-900/20 dark:border-emerald-700/30',
    color: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  'On Hold': {
    bg: 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-900/20 dark:border-amber-700/30',
    color: 'text-amber-700 dark:text-amber-400',
    icon: Pause,
  },
  Filled: {
    bg: 'bg-blue-50/50 border-blue-200/50 dark:bg-blue-900/20 dark:border-blue-700/30',
    color: 'text-blue-700 dark:text-blue-400',
    icon: Users,
  },
  Closed: {
    bg: 'bg-slate-50/50 border-slate-200/50 dark:bg-slate-800/20 dark:border-slate-700/30',
    color: 'text-slate-600 dark:text-slate-400',
    icon: Archive,
  },
  Cancelled: {
    bg: 'bg-red-50/50 border-red-200/50 dark:bg-red-900/20 dark:border-red-700/30',
    color: 'text-red-700 dark:text-red-400',
    icon: XCircle,
  },
  // UPPERCASE (DB)
  ACTIVE: {
    bg: 'bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-900/20 dark:border-emerald-700/30',
    color: 'text-emerald-700 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  ON_HOLD: {
    bg: 'bg-amber-50/50 border-amber-200/50 dark:bg-amber-900/20 dark:border-amber-700/30',
    color: 'text-amber-700 dark:text-amber-400',
    icon: Pause,
  },
  FILLED: {
    bg: 'bg-blue-50/50 border-blue-200/50 dark:bg-blue-900/20 dark:border-blue-700/30',
    color: 'text-blue-700 dark:text-blue-400',
    icon: Users,
  },
  CLOSED_HIRED: {
    bg: 'bg-slate-50/50 border-slate-200/50 dark:bg-slate-800/20 dark:border-slate-700/30',
    color: 'text-slate-600 dark:text-slate-400',
    icon: Archive,
  },
  CLOSED_NOT_HIRED: {
    bg: 'bg-slate-50/50 border-slate-200/50 dark:bg-slate-800/20 dark:border-slate-700/30',
    color: 'text-slate-600 dark:text-slate-400',
    icon: XCircle,
  },
  PENDING_INTAKE: {
    bg: 'bg-blue-50/50 border-blue-200/50 dark:bg-blue-900/20 dark:border-blue-700/30',
    color: 'text-blue-700 dark:text-blue-400',
    icon: Clock,
  },
  SOURCING: {
    bg: 'bg-indigo-50/50 border-indigo-200/50 dark:bg-indigo-900/20 dark:border-indigo-700/30',
    color: 'text-indigo-700 dark:text-indigo-400',
    icon: Users,
  },
  INTERVIEWING: {
    bg: 'bg-violet-50/50 border-violet-200/50 dark:bg-violet-900/20 dark:border-violet-700/30',
    color: 'text-violet-700 dark:text-violet-400',
    icon: Users,
  },
  OFFER: {
    bg: 'bg-teal-50/50 border-teal-200/50 dark:bg-teal-900/20 dark:border-teal-700/30',
    color: 'text-teal-700 dark:text-teal-400',
    icon: CheckCircle2,
  },
  // Default/Fallback
  default: {
    bg: 'bg-slate-50/50 border-slate-200/50 dark:bg-slate-800/20 dark:border-slate-700/30',
    color: 'text-slate-700 dark:text-slate-400',
    icon: Clock,
  }
}

const priorityConfig: Record<string, string> = {
  High: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
  Low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  default: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
}

const locationTypeConfig: Record<string, string> = {
  Remote: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800',
  Hybrid: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800',
  'On-site': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
  default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const config = statusConfig[status] || statusConfig.default
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm', config.bg, config.color)}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  )
}

function PriorityBadge({ priority }: Readonly<{ priority: Requirement['priority'] }>) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-sm', priorityConfig[priority] || priorityConfig.default)}>
      <Target className="w-3 h-3" />
      {priority}
    </span>
  )
}

// Requirement Card Component
const RequirementCard = memo(function RequirementCard({
  requirement,
  onView,
  onEdit,
  onDelete,
  onFreeze,
  onReassign,
  canEdit,
  canDelete,
  canFreeze,
  canReassign,
  hideFinancials = false,
}: Readonly<{
  requirement: Requirement
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onFreeze?: () => void
  onReassign?: () => void
  canEdit: boolean
  canDelete: boolean
  canFreeze?: boolean
  canReassign?: boolean
  hideFinancials?: boolean
}>) {
  const [menuOpen, setMenuOpen] = useState(false)
  const daysSinceActivity = requirement.daysSinceActivity ?? calculateDaysSinceActivity(requirement.lastActivityAt)
  const fillPercentage = requirement.openings > 0
    ? Math.round((requirement.filledPositions / requirement.openings) * 100)
    : 0

  return (
    <div className="group relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-black/20 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-violet-500/30 dark:hover:border-violet-500/30">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[11px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 px-2 py-0.5 rounded-full font-medium tracking-wide">
              {requirement.mmdId}
            </span>
            <PriorityBadge priority={requirement.priority} />
            {requirement.stalled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800">
                <AlertCircle className="w-3 h-3" />
                Stalled {daysSinceActivity !== null ? `(${daysSinceActivity}d)` : ''}
              </span>
            )}
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
            {requirement.title}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
            <Building2 className="w-3.5 h-3.5" />
            <span className="font-medium">{requirement.company}</span>
          </div>
        </div>

        <div className="relative flex-shrink-0">
          <IconButton
            aria-label="More options"
            variant="ghost"
            size="sm"
            onClick={() => setMenuOpen(!menuOpen)}
            className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md"
          >
            <MoreHorizontal className="w-4 h-4" />
          </IconButton>
          {menuOpen && (
            <>
              <button
                className="fixed inset-0 z-10 w-full h-full cursor-default border-none bg-transparent"
                onClick={() => setMenuOpen(false)}
                tabIndex={-1}
                aria-label="Close menu"
                type="button"
              />
              <div className="absolute right-0 top-full mt-2 w-48 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden p-1 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => { onView(); setMenuOpen(false) }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  View Details
                </button>
                {canEdit && (
                  <button
                    onClick={() => { onEdit(); setMenuOpen(false) }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-slate-500" />
                    Edit
                  </button>
                )}
                <button onClick={() => setMenuOpen(false)} className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                  <Send className="w-4 h-4 text-slate-500" />
                  Add Submission
                </button>
                {canFreeze && (
                  <button onClick={() => { onFreeze?.(); setMenuOpen(false) }} className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                    <Pause className="w-4 h-4 text-slate-500" />
                    Put On Hold
                  </button>
                )}
                {canReassign && (
                  <button onClick={() => { onReassign?.(); setMenuOpen(false) }} className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                    <Users className="w-4 h-4 text-slate-500" />
                    Reassign Owner
                  </button>
                )}
                {canDelete && (
                  <>
                    <div className="h-px bg-slate-200 dark:bg-slate-700/50 my-1 mx-2" />
                    <button
                      onClick={() => { onDelete(); setMenuOpen(false) }}
                      className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs uppercase tracking-wide font-semibold">Location</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={requirement.location}>{requirement.location}</p>
        </div>
        {!hideFinancials && (
          <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs uppercase tracking-wide font-semibold">Budget</span>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
              {requirement.budget ? requirement.budget.replace(/\$/g, '₹') : 'N/A'}
            </p>
          </div>
        )}
      </div>

      {/* Status & Deadline Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <StatusBadge status={requirement.status} />
        <div className="flex items-center gap-1.5">
          <span className={cn('px-2.5 py-1 rounded-md text-xs font-medium border backdrop-blur-sm', locationTypeConfig[requirement.locationType] || locationTypeConfig.default)}>
            {requirement.locationType}
          </span>
          {requirement.deadline && (
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              {formatRequirementDate(requirement.deadline)}
            </span>
          )}
        </div>
      </div>


      {/* Progress Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">Filling Progress</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {requirement.filledPositions} <span className="text-slate-400 font-normal">/ {requirement.openings}</span>
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500 ease-out shadow-sm',
              fillPercentage === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
            )}
            style={{ width: `${fillPercentage}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/50">
          <p className="text-xl font-extrabold text-slate-900 dark:text-white tabular-nums">{requirement.submissions}</p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Submissions</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700/50">
          <p className="text-xl font-extrabold text-violet-600 dark:text-violet-400 tabular-nums">{requirement.interviews}</p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">Interviews</p>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {requirement.skills.slice(0, 3).map((skill) => (
          <span key={skill} className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{skill}</span>
        ))}
        {requirement.skills.length > 3 && (
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">+{requirement.skills.length - 3}</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500">
            {requirement.owner.charAt(0)}
          </div>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {requirement.owner}
          </span>
        </div>
        <button onClick={onView} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 group/btn">
          View Details <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.requirement === nextProps.requirement &&
    prevProps.canEdit === nextProps.canEdit &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.canFreeze === nextProps.canFreeze &&
    prevProps.canReassign === nextProps.canReassign &&
    prevProps.hideFinancials === nextProps.hideFinancials
  )
})

RequirementCard.displayName = 'RequirementCard'

function RequirementDrawer({
  requirement,
  isOpen,
  onClose,
}: {
  requirement: Requirement | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!requirement) return null

  const createdOnLabel = formatRequirementDate(requirement.createdAt) || 'Unknown'
  const deadlineLabel = formatRequirementDate(requirement.deadline) || 'Open Ended'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Requirement Case File" size="xl">
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800/50 pb-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-mono text-xl font-bold shadow-lg shadow-indigo-500/30">
              {requirement.mmdId.split('-').pop()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 px-2 py-0.5 rounded-full font-medium tracking-wide">
                  {requirement.mmdId}
                </span>
                <PriorityBadge priority={requirement.priority} />
                <StatusBadge status={requirement.status} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{requirement.title}</h2>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium mb-1">
              <Building2 className="w-4 h-4" />
              <span>{requirement.company}</span>
            </div>
            <p className="text-xs text-slate-400">Created on: {createdOnLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left Column: Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-2 text-sm">
                <Filter className="w-4 h-4 text-violet-500" />
                Full Description
              </h3>
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                {requirement.description || 'No detailed description provided.'}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-2 text-sm">
                <Target className="w-4 h-4 text-violet-500" />
                Required Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {requirement.skills.map(skill => (
                  <span key={skill} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium border border-slate-200 dark:border-slate-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Key Metrics & Details */}
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-2 text-sm">
                Overview Config
              </h3>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Location</label>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {requirement.location}
                  <span className="text-slate-400 text-sm font-normal">({requirement.locationType})</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Budget Setup</label>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                  <IndianRupee className="w-4 h-4" />
                  {requirement.budget ? requirement.budget.replace(/\$/g, '₹') : 'Not specified'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Closure Deadline</label>
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium">
                  <Clock className="w-4 h-4 text-rose-400" />
                  {deadlineLabel}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-700/50 pb-2 text-sm">
                Pipeline Stats
              </h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Headcount Auth</span>
                <span className="font-bold text-slate-900 dark:text-white">{requirement.openings} Openings</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Filled Seats</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{requirement.filledPositions} Joined</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Deep Pipeline</span>
                <span className="font-bold text-violet-600 dark:text-violet-400">{requirement.submissions} Pending</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/50 pt-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Automation Hub</h3>
          <AutomationPanel
            requirementId={requirement.id}
            content={{
              whatsapp: requirement.whatsAppMessage,
              email: requirement.emailMessage,
              linkedIn: requirement.linkedInPost,
            }}
            automation={{
              status: requirement.automationStatus,
              attempts: requirement.automationAttempts,
              lastAttemptAt: requirement.automationLastAttemptAt,
              lastSuccessAt: requirement.automationLastSuccessAt,
              lastError: requirement.automationLastError,
            }}
          />
        </div>
      </div>
    </Modal>
  )
}

// Main Page Component
export default function RequirementsPage() {
  const toast = useToast()
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = session?.user?.role
  const canCreate = (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any)) || role === 'COORDINATOR'
  const canEdit = canCreate
  const canDelete = (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any))
  const searchParams = useSearchParams()
  // Keep the first render deterministic for SSR hydration; URL params are applied in an effect.
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('recent')
  const [currentPage, setCurrentPage] = useState(1)

  // Modal States
  const [selectedRequirement, setSelectedRequirement] = useState<Requirement | null>(null)
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [requirements, setRequirements] = useState<Requirement[]>([]) // Start empty, fetch real data
  const [isLoading, setIsLoading] = useState(true)
  const [companies, setCompanies] = useState<RequirementCompany[]>([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [companiesLoadError, setCompaniesLoadError] = useState<string | null>(null)
  const [exportJobs, setExportJobs] = useState<ExportJobItem[]>([])
  const [isLoadingExportJobs, setIsLoadingExportJobs] = useState(false)
  const defaultGroup = useMemo(() => inferDefaultGroup(session?.user?.name, role), [role, session?.user?.name])

  const setQueryParam = useCallback((key: string, value?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!value) {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
  }, [pathname, router, searchParams])

  const closeViewDrawer = useCallback(() => {
    setIsViewDrawerOpen(false)
    setSelectedRequirement(null)
    setQueryParam('view')
  }, [setQueryParam])

  useEffect(() => {
    const queryFromUrl = searchParams.get('q') || ''
    setSearchInput((current) => (current === queryFromUrl ? current : queryFromUrl))
    setSearchQuery((current) => (current === queryFromUrl ? current : queryFromUrl))

    const statusFromUrl = searchParams.get('status') || 'all'
    const normalizedStatus = REQUIREMENT_FILTER_STATUS_VALUES.has(statusFromUrl) ? statusFromUrl : 'all'
    setFilterStatus((current) => (current === normalizedStatus ? current : normalizedStatus))

    const priorityFromUrl = searchParams.get('priority') || 'all'
    const normalizedPriority = REQUIREMENT_FILTER_PRIORITY_VALUES.has(priorityFromUrl) ? priorityFromUrl : 'all'
    setFilterPriority((current) => (current === normalizedPriority ? current : normalizedPriority))
  }, [searchParams])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchInput, filterStatus, filterPriority, sortBy])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery((current) => (current === searchInput ? current : searchInput))
    }, 250)

    return () => window.clearTimeout(timer)
  }, [searchInput])

  // Fetch Data
  const fetchData = async () => {
    if (sessionStatus !== 'authenticated') return

    setIsLoading(true)
    const res = await getRequirements({
      status: filterStatus !== 'all' && filterStatus !== 'STALLED' && filterStatus !== 'AWAITING_JD' ? filterStatus : undefined,
      stalled: filterStatus === 'STALLED' ? true : undefined,
    })
    if (res.success) {
      const mapped = Array.isArray(res.data)
        ? (res.data as Record<string, unknown>[]).map(mapRequirement)
        : []
      setRequirements(mapped)
    } else {
      toast.error('Error', res.error || 'Failed to fetch requirements')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchData()
    }
  }, [filterStatus, sessionStatus])

  // Fetch companies for the dropdown
  const fetchCompanies = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return

    setIsLoadingCompanies(true)
    setCompaniesLoadError(null)
    const res = await getCompanies({})
    if (res.success) {
      const normalizedCompanies = normalizeCompanyPayload(res.data)
      setCompanies(normalizedCompanies)

      if (extractCompanyItems(res.data).length > 0 && normalizedCompanies.length === 0) {
        setCompaniesLoadError('Company records were returned in an unexpected format. Please refresh and try again.')
      }
    } else {
      setCompanies([])
      setCompaniesLoadError(res.error || 'Failed to fetch companies')
      toast.error('Error', res.error || 'Failed to fetch companies')
    }
    setIsLoadingCompanies(false)
  }, [sessionStatus, toast])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      void fetchCompanies()
    }
  }, [sessionStatus, fetchCompanies])

  const loadExportJobs = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return

    setIsLoadingExportJobs(true)
    const result = await listExportJobsAction({ entityType: 'REQUIREMENT', limit: 5 })
    if (result.success) {
      setExportJobs(normalizeExportJobs(result.data))
    }
    setIsLoadingExportJobs(false)
  }, [sessionStatus])

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      loadExportJobs()
    }
  }, [sessionStatus, loadExportJobs])

  // Sync deep-link view query to the in-page drawer so all entry points share one UI.
  useEffect(() => {
    const viewTarget = (searchParams.get('view') || '').trim().toLowerCase()
    if (!viewTarget || requirements.length === 0) return

    const matchedRequirement = requirements.find((requirement) => {
      const idMatch = requirement.id.toLowerCase() === viewTarget
      const mmdMatch = requirement.mmdId.toLowerCase() === viewTarget
      return idMatch || mmdMatch
    })

    if (!matchedRequirement) return

    if (selectedRequirement?.id !== matchedRequirement.id) {
      setSelectedRequirement(matchedRequirement)
    }
    if (!isViewDrawerOpen) {
      setIsViewDrawerOpen(true)
    }
  }, [isViewDrawerOpen, requirements, searchParams, selectedRequirement?.id])

  // Handle action parameter for creating new requirements
  useEffect(() => {
    if (!canCreate) return

    if (searchParams.get('action') === 'new') {
      setIsAddModalOpen(true)
      setQueryParam('action')
    }
  }, [canCreate, searchParams, setQueryParam])

  const [formState, setFormState] = useState({
    title: '',
    mmdId: '',
    company: '',
    companyId: '',
    location: '',
    locationType: 'Remote',
    status: 'ACTIVE',
    priority: 'Medium',
    group: 'LEADS' as Requirement['group'],
    budget: '',
    openings: 1,
    filledPositions: 0,
    experienceMin: 2,
    experienceMax: 5,
    skills: '',
    deadline: '',
    description: '',
  })

  const eligibleCompanyIds = useMemo(() => {
    return new Set(
      companies
        .filter((company) => hasActiveRequirementMou(company))
        .map((company) => company._id)
    )
  }, [companies])

  const mouSummary = useMemo(() => {
    return companies.reduce(
      (acc, company) => {
        if (normalizeMouStatus(company.mouStatus) === 'SIGNED') {
          acc.signed += 1
          const eligibility = getRequirementMouEligibility(company)
          if (eligibility.active) {
            acc.activeSigned += 1
          }
        }
        return acc
      },
      { signed: 0, activeSigned: 0 }
    )
  }, [companies])

  const selectableCompanies = useMemo(() => {
    return [...companies].sort((left, right) => {
      const leftEligible = eligibleCompanyIds.has(left._id)
      const rightEligible = eligibleCompanyIds.has(right._id)

      if (leftEligible !== rightEligible) {
        return leftEligible ? -1 : 1
      }

      return left.name.localeCompare(right.name)
    })
  }, [companies, eligibleCompanyIds])

  const resetForm = () => {
    setFormState({
      title: '',
      mmdId: '',
      company: '',
      companyId: '',
      location: '',
      locationType: 'Remote',
      status: 'ACTIVE', // Default to DB enum
      priority: 'Medium',
      group: defaultGroup,
      budget: '',
      openings: 1,
      filledPositions: 0,
      experienceMin: 2,
      experienceMax: 5,
      skills: '',
      deadline: '',
      description: '',
    })
    setEditingId(null)
  }

  const requirementIdPreview = useMemo(() => {
    if (editingId && formState.mmdId) return formState.mmdId

    const selectedCompany = companies.find((company) => company._id === formState.companyId)
    const sectorCode = getRequirementIdSectorCode(selectedCompany?.sector || 'IT')
    const yearCode = new Date().getFullYear().toString().slice(-2)
    return `REQ-${yearCode}-${sectorCode}-###`
  }, [companies, editingId, formState.companyId, formState.mmdId])

  // Filter and sort
  const filteredRequirements = useMemo(() => {
    let result = [...requirements]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.mmdId.toLowerCase().includes(query) ||
          r.company.toLowerCase().includes(query) ||
          r.skills.some((s) => s.toLowerCase().includes(query))
      )
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'AWAITING_JD') {
        result = result.filter((r) => r.status === 'ACTIVE' && (!r.description || r.description.length < 50))
      } else if (filterStatus === 'STALLED') {
        result = result.filter((r) => r.stalled)
      } else {
        result = result.filter((r) => r.status === filterStatus)
      }
    }

    if (filterPriority !== 'all') {
      result = result.filter((r) => r.priority === filterPriority)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title)
        case 'submissions':
          return b.submissions - a.submissions
        case 'priority': {
          const priorityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
          const pA = priorityOrder[a.priority] ?? 99
          const pB = priorityOrder[b.priority] ?? 99
          return pA - pB
        }
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return result
  }, [searchQuery, filterStatus, filterPriority, sortBy, requirements])

  const totalFilteredRequirements = filteredRequirements.length
  const totalPages = Math.max(1, Math.ceil(totalFilteredRequirements / REQUIREMENTS_PAGE_SIZE))

  useEffect(() => {
    setCurrentPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const paginatedRequirements = useMemo(() => {
    const startIndex = (currentPage - 1) * REQUIREMENTS_PAGE_SIZE
    return filteredRequirements.slice(startIndex, startIndex + REQUIREMENTS_PAGE_SIZE)
  }, [currentPage, filteredRequirements])

  const currentRangeStart = totalFilteredRequirements === 0
    ? 0
    : (currentPage - 1) * REQUIREMENTS_PAGE_SIZE + 1
  const currentRangeEnd = Math.min(currentPage * REQUIREMENTS_PAGE_SIZE, totalFilteredRequirements)

  // Stats
  const stats = useMemo(() => {
    return requirements.reduce(
      (acc, requirement) => {
        acc.total += 1
        if (requirement.status === 'ACTIVE') acc.active += 1
        if (requirement.status === 'ON_HOLD') acc.onHold += 1
        if (requirement.stalled) acc.stalled += 1
        if (requirement.status === 'CLOSED_HIRED' || requirement.status === 'OFFER') acc.filled += 1
        acc.totalSubmissions += requirement.submissions
        acc.totalInterviews += requirement.interviews
        return acc
      },
      {
        total: 0,
        active: 0,
        onHold: 0,
        stalled: 0,
        filled: 0,
        totalSubmissions: 0,
        totalInterviews: 0,
      }
    )
  }, [requirements])

  // Handlers
  const handleView = (requirement: Requirement) => {
    setSelectedRequirement(requirement)
    setIsViewDrawerOpen(true)
    setQueryParam('view', requirement.id)
  }

  const handleEdit = (requirement: Requirement) => {
    if (!canEdit) {
      toast.error('Forbidden', 'You do not have permission to edit requirements')
      return
    }
    setFormState({
      title: requirement.title,
      mmdId: requirement.mmdId,
      company: requirement.company,
      companyId: requirement.companyId,
      location: requirement.location,
      locationType: requirement.locationType,
      status: requirement.status,
      priority: requirement.priority,
      group: requirement.group || defaultGroup,
      budget: requirement.budget ? requirement.budget.replace(/\$/g, '₹') : '',
      openings: requirement.openings,
      filledPositions: requirement.filledPositions,
      experienceMin: requirement.experienceMin,
      experienceMax: requirement.experienceMax,
      skills: requirement.skills.join(', '),
      deadline: requirement.deadline || '',
      description: requirement.description || '',
    })
    setEditingId(requirement.id)
    setIsAddModalOpen(true)
  }

  const handleDelete = (requirement: Requirement) => {
    if (!canDelete) {
      toast.error('Forbidden', 'Only admins can delete requirements')
      return
    }
    setSelectedRequirement(requirement)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!canDelete) {
      toast.error('Forbidden', 'Only admins can delete requirements')
      setIsDeleteDialogOpen(false)
      return
    }
    if (selectedRequirement) {
      const res = await deleteRequirementAction({ id: selectedRequirement.id })
      if (res.success) {
        setRequirements((prev) => prev.filter((r) => r.id !== selectedRequirement.id))
        toast.success('Requirement Deleted', `${selectedRequirement.mmdId} has been removed`)
        fetchData()
      } else {
        toast.error('Error', res.error || 'Failed to delete requirement')
      }
      setIsDeleteDialogOpen(false)
      setSelectedRequirement(null)
    }
  }

  const handleFreeze = async (requirement: Requirement) => {
    if (!canEdit) {
      toast.error('Forbidden', 'Only admins or coordinators can put requirements on hold')
      return
    }

    const comment = window.prompt('Add a note for putting this requirement on hold (optional)') || undefined
    const res = await freezeRequirementAction({
      requirementId: requirement.id,
      comment,
    })
    if (res.success) {
      setRequirements((prev) => prev.map((r) => r.id === requirement.id ? { ...r, status: 'ON_HOLD', stalled: false } : r))
      toast.success('Requirement On Hold', `${requirement.mmdId} has been moved to On Hold`)
      fetchData()
    } else {
      toast.error('Error', res.error || 'Failed to put requirement on hold')
    }
  }

  const handleReassign = async (requirement: Requirement) => {
    if (!canEdit) {
      toast.error('Forbidden', 'Only admins or coordinators can reassign requirements')
      return
    }

    const newOwnerId = window.prompt('Enter the new owner user ID')
    if (!newOwnerId || !newOwnerId.trim()) return
    const comment = window.prompt('Add a note for this reassignment (optional)') || undefined

    const res = await reassignRequirementAction({
      requirementId: requirement.id,
      newOwnerId: newOwnerId.trim(),
      comment,
    })
    if (res.success) {
      toast.success('Requirement Reassigned', `${requirement.mmdId} reassigned successfully`)
      fetchData()
    } else {
      toast.error('Error', res.error || 'Failed to reassign requirement')
    }
  }

  const openAddModal = async () => {
    if (!canCreate) {
      toast.error('Forbidden', 'Only admins or coordinators can create requirements')
      return
    }

    if (companies.length === 0 && !isLoadingCompanies) {
      await fetchCompanies()
    }

    resetForm()
    setIsAddModalOpen(true)
  }

  const handleSave = async () => {
    if (editingId && !canEdit) {
      toast.error('Forbidden', 'You do not have permission to update requirements')
      return
    }
    if (!editingId && !canCreate) {
      toast.error('Forbidden', 'You do not have permission to create requirements')
      return
    }

    if (!formState.title.trim()) {
      toast.error('Missing title', 'Job title is required')
      return
    }

    if (!formState.companyId) {
      toast.error('Missing company', 'Please select a company')
      return
    }

    const selectedCompany = companies.find((company) => company._id === formState.companyId)
    if (!selectedCompany) {
      toast.error('Invalid company', 'The selected company could not be found')
      return
    }

    const existingRequirement = editingId ? requirements.find((requirement) => requirement.id === editingId) : null

    if (formState.experienceMin >= formState.experienceMax) {
      toast.error('Invalid experience range', 'Minimum experience must be less than maximum experience')
      return
    }

    const skillsArray = formState.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const statusToSave = formState.status as 'PENDING_INTAKE' | 'AWAITING_JD' | 'ACTIVE' | 'SOURCING' | 'INTERVIEWING' | 'OFFER' | 'CLOSED_HIRED' | 'CLOSED_NOT_HIRED' | 'ON_HOLD'
    const budgetRange = parseBudgetRange(formState.budget || '')
    const fullDescription = buildRequirementDescription({
      title: formState.title,
      company: formState.company || selectedCompany.name,
      location: formState.location || 'Remote',
      budget: formState.budget || '',
      skills: skillsArray,
      description: formState.description,
    })

    const updatePayload = {
      id: editingId || '',
      companyId: formState.companyId,
      jobTitle: formState.title,
      fullDescription,
      skills: skillsArray.length > 0 ? skillsArray : ['General hiring'],
      experienceMin: Number(formState.experienceMin),
      experienceMax: Number(formState.experienceMax),
      openings: Number(formState.openings),
      workMode: parseWorkMode(formState.locationType),
      location: formState.location || 'Remote',
      interviewClosingDate: formState.deadline ? new Date(formState.deadline) : undefined,
      priority: formState.priority as 'High' | 'Medium' | 'Low',
      group: formState.group,
      ...budgetRange,
    }

    const createPayload = {
      companyId: formState.companyId,
      jobTitle: formState.title,
      fullDescription,
      skills: skillsArray.length > 0 ? skillsArray : ['General hiring'],
      experienceMin: Number(formState.experienceMin),
      experienceMax: Number(formState.experienceMax),
      openings: Number(formState.openings),
      workMode: parseWorkMode(formState.locationType),
      location: formState.location || 'Remote',
      interviewClosingDate: formState.deadline ? new Date(formState.deadline) : undefined,
      priority: formState.priority as 'High' | 'Medium' | 'Low',
      group: formState.group,
      accountOwnerId: session?.user?.id || '',
      status: statusToSave,
      ...budgetRange,
    }

    if (editingId) {
      const currentStatus = existingRequirement?.status
      const statusChanged = Boolean(currentStatus && currentStatus !== statusToSave)

      const res = await updateRequirementAction(updatePayload)
      if (res.success) {
        if (statusChanged) {
          const statusRes = await updateRequirementStatusAction({
            requirementId: editingId,
            status: statusToSave,
            comment: `Status updated from ${currentStatus} to ${statusToSave}`,
          })

          if (!statusRes.success) {
            toast.error('Partial Update', statusRes.error || 'Requirement details saved but status update failed')
            fetchData()
            setIsAddModalOpen(false)
            resetForm()
            return
          }
        }

        toast.success('Requirement Updated', 'Changes saved successfully')
        fetchData()
      } else {
        toast.error('Error', res.error || 'Failed to update requirement')
      }
    } else {
      const res = await createRequirementAction(createPayload)
      if (res.success) {
        const createdMmdId = (res.data as { mmdId?: string } | undefined)?.mmdId
        toast.success('Requirement Created', `${createdMmdId || 'New requirement'} added successfully`)
        fetchData()
      } else {
        toast.error('Error', res.error || 'Failed to create requirement')
      }
    }

    setIsAddModalOpen(false)
    resetForm()
  }

  const handleExport = async () => {
    const res = await createExportJobAction({
      entityType: 'REQUIREMENT',
      format: 'CSV',
      filter: { status: filterStatus !== 'all' ? filterStatus : undefined }
    })
    if (res.success) {
      toast.success('Export Started', 'You will be notified when it is ready')
      loadExportJobs()
    } else {
      toast.error('Export Failed', res.error || 'Could not start export')
    }
  }

  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-emerald-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 transform group-hover:scale-105 transition-transform duration-300">
              <Briefcase className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Requirements</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Manage job requirements and track submissions</p>
          </div>
        </div>

        {canCreate && (
          <div className="flex gap-3">
            <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport} className="bg-white hover:bg-slate-50 border-slate-200">
              Export
            </Button>
            <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddModal} className="shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all">
              Add Requirement
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-y-4 gap-x-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-slate-800 dark:text-white', bg: 'bg-white/60 dark:bg-slate-800/60' },
          { label: 'Active', value: stats.active, color: 'text-emerald-600', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' },
          { label: 'On Hold', value: stats.onHold, color: 'text-amber-600', bg: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30' },
          { label: 'Filled', value: stats.filled, color: 'text-blue-600', bg: 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30' },
          { label: 'Stalled', value: stats.stalled, color: 'text-rose-600', bg: 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-800/30' },
          { label: 'Submissions', value: stats.totalSubmissions, color: 'text-indigo-600', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30' },
          { label: 'Interviews', value: stats.totalInterviews, color: 'text-violet-600', bg: 'bg-violet-50/50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-800/30' },
        ].map((stat, i) => (
          <div key={i} className={cn(
            "p-4 rounded-2xl backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300",
            stat.bg
          )}>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <p className={cn("text-2xl font-extrabold tracking-tight", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/20 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Recent Requirement Exports</p>
          <Button variant="ghost" size="sm" onClick={loadExportJobs}>Refresh</Button>
        </div>
        {isLoadingExportJobs && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading export jobs...</p>
        )}
        {!isLoadingExportJobs && exportJobs.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No export jobs yet.</p>
        )}
        {!isLoadingExportJobs && exportJobs.length > 0 && (
          <div className="space-y-2">
            {exportJobs.map((job) => (
              <div key={job._id} className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{job._id}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{job.createdAt ? new Date(job.createdAt).toLocaleString('en-US') : 'Unknown time'} • {job.format}</p>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'text-xs font-semibold',
                    job.status === 'COMPLETED' && 'text-emerald-600',
                    (job.status === 'FAILED' || job.status === 'DEAD_LETTER') && 'text-rose-600',
                    (job.status === 'PENDING' || job.status === 'PROCESSING') && 'text-amber-600'
                  )}>
                    {job.status}
                  </p>
                  {job.status === 'COMPLETED' && job.fileUrl && (
                    <a href={job.fileUrl} className="text-xs text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">Download</a>
                  )}
                  {(job.status === 'FAILED' || job.status === 'DEAD_LETTER') && job.errorMessage && (
                    <p className="text-xs text-rose-600 truncate max-w-48">{job.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full md:w-auto">
          <div className="relative">
            <SearchInput
              placeholder="Search requirements..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClear={() => setSearchInput('')}
              className="sm:w-80 shadow-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 rounded-xl"
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={REQUIREMENT_FILTER_STATUS_OPTIONS}
            className="sm:w-48 shadow-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 rounded-xl"
          />
          <Select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            options={[
              { value: 'all', label: 'All Priorities' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
            className="sm:w-48 shadow-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'recent', label: 'Most Recent' },
              { value: 'title', label: 'By Title' },
              { value: 'submissions', label: 'By Submissions' },
              { value: 'priority', label: 'By Priority' },
            ]}
            className="sm:w-48 shadow-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 rounded-xl"
          />
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-900 dark:text-white">{currentRangeStart}-{currentRangeEnd}</span> of {totalFilteredRequirements} matching requirements ({requirements.length} total)
        </p>
      </div>


      {/* Requirements Grid */}
      {(() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center p-20">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
                <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
              </div>
            </div>
          )
        }

        if (filteredRequirements.length > 0) {
          return (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedRequirements.map((requirement) => (
                  <RequirementCard
                    key={requirement.id}
                    requirement={requirement}
                    onView={() => handleView(requirement)}
                    onEdit={() => handleEdit(requirement)}
                    onDelete={() => handleDelete(requirement)}
                    onFreeze={() => handleFreeze(requirement)}
                    onReassign={() => handleReassign(requirement)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canFreeze={canEdit && requirement.status !== 'ON_HOLD'}
                    canReassign={canEdit}
                  />
                ))}
              </div>
              {totalFilteredRequirements > REQUIREMENTS_PAGE_SIZE && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )
        }

        return (
          <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-16 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No requirements found</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
              {searchInput || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Get started by creating your first requirement'}
            </p>
            {canCreate && !searchInput && filterStatus === 'all' && filterPriority === 'all' && (
              <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
                Add Requirement
              </Button>
            )}
          </div>
        )
      })()}

      {/* View Requirement Drawer */}
      <RequirementDrawer
        requirement={selectedRequirement}
        isOpen={isViewDrawerOpen}
        onClose={closeViewDrawer}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Requirement"
        message={`Are you sure you want to delete "${selectedRequirement?.mmdId}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />

      {/* Add Requirement Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => { setIsAddModalOpen(false); resetForm() }}
        title={editingId ? 'Edit Requirement' : 'Add New Requirement'}
        description={editingId ? 'Update requirement details' : 'Create a new job requirement'}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="req-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Job Title</label>
              <input
                id="req-title"
                className="input-modern w-full"
                placeholder="e.g., Senior Software Engineer"
                value={formState.title}
                onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
              />
            </div>
            <div>
              <Combobox
                label="Company"
                placeholder="Select a company"
                searchPlaceholder="Search companies..."
                emptyMessage={isLoadingCompanies ? 'Loading companies...' : 'No companies found'}
                value={formState.companyId}
                disabled={isLoadingCompanies}
                onChange={(companyId) => {
                  const selectedCompany = companies.find((c) => c._id === companyId)
                  setFormState((s) => ({
                    ...s,
                    companyId,
                    company: selectedCompany?.name || '',
                    location: selectedCompany?.location || s.location,
                  }))
                }}
                options={selectableCompanies.map((company) => {
                  const eligibility = getRequirementMouEligibility(company)
                  return {
                    value: company._id,
                    label: company.name,
                    subtitle: `${company.location || 'No location specified'} - ${getRequirementMouSubtitle(company, eligibility)}`,
                  }
                })}
                className="w-full"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">All companies are listed. MOU status is shown for reference; validation is temporarily disabled for manual testing.</p>
              {!isLoadingCompanies && companies.length > 0 && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  MOU signed (status): {mouSummary.signed} | Eligible for requirements: {mouSummary.activeSigned}
                </p>
              )}
              {isLoadingCompanies && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loading companies...</p>
              )}
              {!isLoadingCompanies && companiesLoadError && (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                  {companiesLoadError}{' '}
                  <button
                    type="button"
                    onClick={() => { void fetchCompanies() }}
                    className="font-semibold underline underline-offset-2 hover:no-underline"
                  >
                    Retry
                  </button>
                </p>
              )}
              {!isLoadingCompanies && companies.length === 0 && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">No companies are available yet. Add a company first in Companies.</p>
              )}
            </div>
            <div>
              <label htmlFor="req-priority" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <Select
                value={formState.priority}
                onChange={(e) => setFormState((s) => ({ ...s, priority: e.target.value }))}
                options={[
                  { value: 'High', label: 'High' },
                  { value: 'Medium', label: 'Medium' },
                  { value: 'Low', label: 'Low' },
                ]}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="req-location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location</label>
              <input
                id="req-location"
                className="input-modern w-full"
                placeholder="e.g., San Francisco, CA"
                value={formState.location}
                onChange={(e) => setFormState((s) => ({ ...s, location: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="req-budget" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Budget Range</label>
              <input
                id="req-budget"
                className="input-modern w-full"
                placeholder="e.g., ₹12L - ₹15L"
                value={formState.budget}
                onChange={(e) => setFormState((s) => ({ ...s, budget: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="req-openings" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Number of Openings</label>
              <input
                id="req-openings"
                className="input-modern w-full"
                type="number"
                placeholder="1"
                min="1"
                value={formState.openings}
                onChange={(e) => setFormState((s) => ({ ...s, openings: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label htmlFor="req-deadline" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deadline</label>
              <input
                id="req-deadline"
                className="input-modern w-full"
                type="date"
                value={formState.deadline}
                onChange={(e) => setFormState((s) => ({ ...s, deadline: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="req-status" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <Select
                value={formState.status}
                onChange={(e) => setFormState((s) => ({ ...s, status: e.target.value }))}
                options={REQUIREMENT_STATUS_OPTIONS}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="req-location-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location Type</label>
              <Select
                value={formState.locationType}
                onChange={(e) => setFormState((s) => ({ ...s, locationType: e.target.value }))}
                options={[
                  { value: 'Remote', label: 'Remote' },
                  { value: 'Hybrid', label: 'Hybrid' },
                  { value: 'On-site', label: 'On-site' }
                ]}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="req-group" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assignment Group</label>
              <Select
                value={formState.group}
                onChange={(e) => setFormState((s) => ({ ...s, group: e.target.value as Requirement['group'] }))}
                options={[
                  { value: 'RASHMI', label: 'Rashmi' },
                  { value: 'MANJUNATH', label: 'Manjunath' },
                  { value: 'SCRAPING', label: 'Scraping' },
                  { value: 'LEADS', label: 'Leads' }
                ]}
                className="w-full"
              />
            </div>
            <div>
              <label htmlFor="req-mmd" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Requirement ID</label>
              <input
                id="req-mmd"
                className="input-modern w-full"
                value={requirementIdPreview}
                readOnly
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Generated automatically in the `REQ-YY-SECTOR-###` format.</p>
            </div>
            <div>
              <label htmlFor="req-skills" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Skills (comma separated)</label>
              <input
                id="req-skills"
                className="input-modern w-full"
                placeholder="React, TypeScript, GraphQL"
                value={formState.skills}
                onChange={(e) => setFormState((s) => ({ ...s, skills: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="req-exp-min" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Min Experience (Years)</label>
              <input
                id="req-exp-min"
                className="input-modern w-full"
                type="number"
                min="0"
                value={formState.experienceMin}
                onChange={(e) => setFormState((s) => ({ ...s, experienceMin: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label htmlFor="req-exp-max" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Max Experience (Years)</label>
              <input
                id="req-exp-max"
                className="input-modern w-full"
                type="number"
                min="1"
                value={formState.experienceMax}
                onChange={(e) => setFormState((s) => ({ ...s, experienceMax: Number(e.target.value) }))}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="req-description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                id="req-description"
                className="input-modern w-full min-h-[100px]"
                placeholder="Brief description"
                value={formState.description}
                onChange={(e) => setFormState((s) => ({ ...s, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={() => { setIsAddModalOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSave}>
              {editingId ? 'Save Changes' : 'Create Requirement'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
