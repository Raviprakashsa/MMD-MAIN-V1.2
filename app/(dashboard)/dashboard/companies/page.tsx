'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useSession } from 'next-auth/react'
import {
  Building2,
  Plus,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  MinusCircle,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Users,
  Briefcase,
  Globe2,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import Button, { IconButton } from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Input'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { PageContainer } from '@/components/ui/PageContainer'

import { AnimatedButton } from '@/components/ui/AnimatedButton'
import {
  getCompanies,
  createCompanyAction,
  updateCompanyAction,
  deleteCompany,
} from '@/lib/actions/module3-company'
import { DocumentManager } from '@/components/ui/DocumentManager'
import { createExportJobAction, listExportJobsAction } from '@/lib/actions/module15-export'

// Stable skeleton placeholder IDs
const SKELETON_IDS = ['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5', 'sk-6'] as const

interface Contact {
  _id: string
  name: string
  email?: string
  phone?: string
  linkedIn?: string
  designation?: string
  isPrimary?: boolean
}

type MouStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SIGNED'

interface Company {
  _id: string
  name: string
  category: string
  sector: string
  location: string
  mouStatus: MouStatus
  website?: string
  contacts: Contact[]
  activeRequirements: number
  createdAt: Date | string
  hiringType: 'PERMANENT' | 'INTERNSHIP' | 'CONTRACT'
  source: 'SCRAPING' | 'LEAD' | 'EVENT' | 'REFERRAL'
  mouDocumentUrl?: string
  mouStartDate?: Date | string | null
  mouEndDate?: Date | string | null
  commercialPercent?: number | null
  paymentTerms?: string
  assignedCoordinatorId: string
}

interface ExportJobItem {
  _id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'
  format: 'CSV' | 'JSON' | 'XLSX'
  createdAt: string
  fileUrl?: string
  errorMessage?: string
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

const statusConfig = {
  SIGNED: {
    bg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    icon: CheckCircle2,
    label: 'MOU Signed',
  },
  IN_PROGRESS: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Clock,
    label: 'In Progress',
  },
  NOT_STARTED: {
    bg: 'bg-stone-100 text-stone-600 border-stone-200',
    icon: MinusCircle,
    label: 'Not Started',
  },
}

const sectorOptions = [
  { value: 'IT', label: 'IT' },
  { value: 'NON_IT', label: 'Non-IT' },
  { value: 'CORE', label: 'Core' },
  { value: 'STARTUP', label: 'Startup' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
]

const hiringTypeOptions = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'CONTRACT', label: 'Contract' },
]

const sourceOptions = [
  { value: 'SCRAPING', label: 'Scraping' },
  { value: 'LEAD', label: 'Lead' },
  { value: 'EVENT', label: 'Event' },
  { value: 'REFERRAL', label: 'Referral' },
]

const getInitial = (value?: string) => (value?.trim()?.charAt(0) || '?')

const KNOWN_BRAND_LOGOS: Array<{ aliases: string[]; domains: string[]; logo: string }> = [
  {
    aliases: ['amazon'],
    domains: ['amazon.com', 'amazon.in'],
    logo: 'https://cdn.simpleicons.org/amazon/FF9900',
  },
  {
    aliases: ['swiggy'],
    domains: ['swiggy.com', 'swiggy.in'],
    logo: 'https://cdn.simpleicons.org/swiggy/FC8019',
  },
  {
    aliases: ['zomato'],
    domains: ['zomato.com'],
    logo: 'https://cdn.simpleicons.org/zomato/E23744',
  },
  {
    aliases: ['flipkart', 'flipcart'],
    domains: ['flipkart.com'],
    logo: 'https://cdn.simpleicons.org/flipkart/2874F0',
  },
  {
    aliases: ['netflix'],
    domains: ['netflix.com'],
    logo: 'https://cdn.simpleicons.org/netflix/E50914',
  },
  {
    aliases: ['oracle', 'oracale'],
    domains: ['oracle.com'],
    logo: 'https://cdn.simpleicons.org/oracle/F80000',
  },
]

function normalizeDomain(raw?: string) {
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    return new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ''
  }
}

function getAutoCompanyLogo(name?: string, website?: string) {
  const normalizedName = (name || '').trim().toLowerCase()
  const domain = normalizeDomain(website)

  const matchedBrand = KNOWN_BRAND_LOGOS.find((brand) => {
    const byAlias = brand.aliases.some((alias) => normalizedName.includes(alias))
    const byDomain = domain ? brand.domains.some((d) => domain === d || domain.endsWith(`.${d}`)) : false
    return byAlias || byDomain
  })

  if (matchedBrand) return matchedBrand.logo

  if (domain) {
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(domain)}`
  }

  return ''
}

function CompanyAvatar({
  name,
  website,
  className,
}: Readonly<{ name?: string; website?: string; className: string }>) {
  const [imageFailed, setImageFailed] = useState(false)
  const logoUrl = useMemo(() => getAutoCompanyLogo(name, website), [name, website])

  useEffect(() => {
    setImageFailed(false)
  }, [name, website])

  return (
    <div className={className} title={name}>
      {logoUrl && !imageFailed ? (
        <img
          src={logoUrl}
          alt={`${name || 'Company'} logo`}
          className="h-full w-full rounded-inherit object-cover"
          onError={() => setImageFailed(true)}
          loading="lazy"
        />
      ) : (
        getInitial(name)
      )}
    </div>
  )
}

function toDateInputValue(value?: Date | string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

function parseDateInput(value: string) {
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed
}

function formatReadableDate(value?: Date | string | null) {
  if (!value) return 'Not specified'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Not specified'
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function getPartnershipType(hiringType: Company['hiringType']) {
  if (hiringType === 'CONTRACT') return 'Development Partner'
  if (hiringType === 'INTERNSHIP') return 'Placement Partner'
  return 'Talent Acquisition Partner'
}

function generatePartnershipDocId(company: Company) {
  const year = new Date().getFullYear()
  const seed = (company._id || '').slice(-6)
  const numeric = parseInt(seed, 16)
  const sequence = Number.isFinite(numeric) ? (numeric % 999) + 1 : 1
  return `MC-PRT-${year}-${String(sequence).padStart(3, '0')}`
}

function buildPartnershipScope(company: Company) {
  return [
    `Sourcing and engagement support for ${company.sector} hiring initiatives.`,
    `Coordination for requirement intake, screening alignment, and hiring workflows at ${company.name}.`,
    `Operational collaboration for ${company.activeRequirements || 0} active requirement${company.activeRequirements === 1 ? '' : 's'} and related HR touchpoints.`,
  ]
}

function hasActiveRequirementMou(company: Pick<Company, 'mouStatus' | 'mouEndDate'>): boolean {
  if (company.mouStatus !== 'SIGNED') return false
  if (!company.mouEndDate) return false

  const mouEndDate = new Date(company.mouEndDate)
  if (Number.isNaN(mouEndDate.getTime())) return false

  const mouEndOfDayUtc = Date.UTC(
    mouEndDate.getUTCFullYear(),
    mouEndDate.getUTCMonth(),
    mouEndDate.getUTCDate(),
    23,
    59,
    59,
    999
  )

  return mouEndOfDayUtc >= Date.now()
}

const mouOptions: { value: MouStatus; label: string }[] = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'SIGNED', label: 'Signed' },
]

const companiesPalette: CSSProperties = {
  ['--primary' as any]: '#0f3d5e',
  ['--primary-hover' as any]: '#0b2f4a',
  ['--primary-light' as any]: '#eaf5ff',
  ['--accent' as any]: '#0d9488',
  ['--surface-hover' as any]: '#f4f8fc',
  ['--border' as any]: '#d6e2ee',
  ['--foreground-muted' as any]: '#475569',
}

function StatusBadge({ status }: Readonly<{ status: Company['mouStatus'] }>) {
  const config = statusConfig[status] || statusConfig.NOT_STARTED
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-5', config.bg)}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

function CompanyCard({ company, onView, onEdit, onDelete, canEdit, canDelete }: Readonly<{ company: Company; onView: () => void; onEdit: () => void; onDelete: () => void; canEdit: boolean; canDelete: boolean }>) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 opacity-75" aria-hidden="true" />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyAvatar
            name={company.name}
            website={company.website}
            className="avatar avatar-lg bg-gradient-to-br from-sky-800 via-cyan-700 to-teal-600 text-white shadow-sm"
          />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-tight text-slate-900">
              {company.name}
            </h3>
            <p className="truncate text-sm text-slate-600">{company.category || 'Uncategorized'}</p>
          </div>
        </div>

        <div className="relative">
          <IconButton aria-label="More options" variant="ghost" size="sm" onClick={() => setMenuOpen(!menuOpen)}>
            <MoreHorizontal className="w-4 h-4" />
          </IconButton>
          {menuOpen && (
            <>
              <button
                className="fixed inset-0 z-10 cursor-default bg-transparent border-0"
                onClick={() => setMenuOpen(false)}
                onKeyDown={(e) => e.key === 'Escape' && setMenuOpen(false)}
                aria-label="Close menu"
              />
              <div className="absolute right-0 top-full mt-1 z-20 dropdown-menu">
                <button onClick={() => { onView(); setMenuOpen(false) }} className="dropdown-item w-full">
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                {canEdit && (
                  <button onClick={() => { onEdit(); setMenuOpen(false) }} className="dropdown-item w-full">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <>
                    <div className="dropdown-separator" />
                    <button onClick={() => { onDelete(); setMenuOpen(false) }} className="dropdown-item dropdown-item-danger w-full">
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

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={company.mouStatus} />
        <span className="rounded-full border border-sky-100 bg-sky-50/70 px-2.5 py-1 text-xs font-semibold text-sky-800">{company.sector}</span>
        <span className="rounded-full border border-teal-100 bg-teal-50/70 px-2.5 py-1 text-xs font-semibold text-teal-800">{company.hiringType}</span>
      </div>

      <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
        <MapPin className="h-4 w-4 text-slate-400" />
        <span className="truncate">{company.location}</span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-cyan-50/70 px-3 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-sky-800">
            <Briefcase className="h-4 w-4" />
            <span className="text-lg font-semibold tabular-nums">{company.activeRequirements}</span>
          </div>
          <p className="text-xs font-medium text-sky-800/90">Active requirements</p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50/60 px-3 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-teal-800">
            <Users className="h-4 w-4" />
            <span className="text-lg font-semibold tabular-nums">{company.contacts?.length || 0}</span>
          </div>
          <p className="text-xs font-medium text-teal-800/90">Total contacts</p>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="type-eyebrow text-slate-600">
            Contact Group
          </p>
          <span className="type-metadata text-slate-700">{company.source}</span>
        </div>
        <div className="avatar-group">
          {(company.contacts || []).slice(0, 3).map((contact) => (
            <div
              key={contact._id}
              className="avatar avatar-sm bg-slate-100 text-slate-600 border-2 border-white"
              title={contact.name}
            >
              {getInitial(contact.name)}
            </div>
          ))}
          {(company.contacts?.length || 0) > 3 && (
            <div className="avatar avatar-sm bg-cyan-50 text-cyan-700 border-2 border-white text-xs">
              +{company.contacts.length - 3}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default function CompaniesPage() {
  const toast = useToast()
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const role = session?.user?.role
  const canCreate = (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any)) || role === 'COORDINATOR'
  const canEdit = canCreate
  const canDeleteCompany = (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any))
  const canViewSensitive = role !== 'RECRUITER'
  const initialStatus = searchParams.get('status') || 'all'
  const showExpiringDefault = searchParams.get('mou') === 'expiring'
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus)
  const [filterSector, setFilterSector] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('recent')
  const [showExpiringOnly, _setShowExpiringOnly] = useState<boolean>(showExpiringDefault)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mouFileName, setMouFileName] = useState('')
  const [exportJobs, setExportJobs] = useState<ExportJobItem[]>([])
  const [isLoadingExportJobs, setIsLoadingExportJobs] = useState(false)

  const handlePrintPartnershipLetter = useCallback((company: Company) => {
    const docId = generatePartnershipDocId(company)
    const partner = company.contacts?.find((c) => c.isPrimary) || company.contacts?.[0]
    const scopeItems = buildPartnershipScope(company)
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Partnership Confirmation Letter - ${docId}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 28px; }
    .sheet { border: 1px solid #d1d5db; border-radius: 12px; padding: 24px; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
    .brand { font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
    .meta { font-size: 12px; color: #475569; line-height: 1.5; }
    h1 { margin: 22px 0 6px; font-size: 24px; }
    .id { font-size: 13px; color: #334155; margin-bottom: 20px; }
    h2 { font-size: 14px; margin: 16px 0 6px; }
    p, li { font-size: 13px; line-height: 1.6; color: #1e293b; }
    ul { margin: 8px 0 0 16px; padding: 0; }
    .sig { margin-top: 28px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="row">
      <div>
        <div class="brand">MAGNUS COPO</div>
        <div class="meta">Bangalore, India<br/>Email: marketing@magnuscopo.com<br/>Website: www.magnuscopo.com</div>
      </div>
      <div class="meta" style="text-align:right;">
        Document ID: ${docId}<br/>
        Date: ${formatReadableDate(new Date())}
      </div>
    </div>

    <h1>Partnership Confirmation Letter</h1>
    <p>
      This is to formally confirm that Magnus Copo has entered into a professional partnership with <strong>${company.name}</strong>
      ${partner?.name ? `represented by <strong>${partner.name}</strong>${partner.designation ? `, ${partner.designation}` : ''}` : ''}.
    </p>

    <h2>Partner Company Details</h2>
    <p>
      Company: ${company.name}<br/>
      Category: ${company.category || 'Not specified'}<br/>
      Sector: ${company.sector}<br/>
      Location: ${company.location}<br/>
      Website: ${company.website || 'Not specified'}
    </p>

    <h2>Nature of Partnership</h2>
    <p>${getPartnershipType(company.hiringType)}</p>

    <h2>Scope of Work</h2>
    <ul>
      ${scopeItems.map((item) => `<li>${item}</li>`).join('')}
    </ul>

    <h2>Commercial Understanding</h2>
    <p>${company.commercialPercent !== null && company.commercialPercent !== undefined ? `Commercial percentage: ${company.commercialPercent}%` : 'Commercial terms shall be governed by mutually agreed written terms.'}</p>

    <h2>Validity</h2>
    <p>Effective from ${formatReadableDate(company.mouStartDate)} and valid until ${formatReadableDate(company.mouEndDate)}, unless modified by mutual agreement.</p>

    <p>We value this collaboration and look forward to a mutually beneficial and verifiable professional relationship.</p>

    <div class="sig">
      <strong>Authorized Signatory</strong><br/>
      Magnus Copo
    </div>

    <div class="footer">
      Verification Ref: ${docId} | Contact: marketing@magnuscopo.com | www.magnuscopo.com/verify/${docId}
    </div>
  </div>
  <script>window.print()</script>
</body>
</html>`

    const popup = window.open('', '_blank', 'width=980,height=900')
    if (!popup) {
      toast.error('Popup blocked', 'Allow popups to download/print the letter')
      return
    }
    popup.document.write(html)
    popup.document.close()
  }, [toast])

  const addContactRow = () => {
    setFormState((s) => ({
      ...s,
      hrContacts: [
        ...s.hrContacts,
        { name: '', email: '', phone: '', linkedIn: '', designation: '', isPrimary: false },
      ],
    }))
  }

  const updateContactField = (index: number, key: keyof CompanyFormState['hrContacts'][number], value: string | boolean) => {
    setFormState((s) => {
      const next = [...s.hrContacts]
      next[index] = { ...next[index], [key]: value }
      return { ...s, hrContacts: next }
    })
  }

  const removeContactRow = (index: number) => {
    setFormState((s) => {
      let next = s.hrContacts.filter((_, i) => i !== index)
      if (!next.length) {
        next = [{ name: '', email: '', phone: '', linkedIn: '', designation: '', isPrimary: true }]
      } else if (!next.some((c) => c.isPrimary)) {
        next[0] = { ...next[0], isPrimary: true }
      }
      return { ...s, hrContacts: next }
    })
  }

  const setPrimaryContact = (index: number) => {
    setFormState((s) => {
      const next = s.hrContacts.map((contact, i) => ({ ...contact, isPrimary: i === index }))
      return { ...s, hrContacts: next }
    })
  }

  interface CompanyFormState {
    name: string
    category: string
    sector: string
    location: string
    mouStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'SIGNED'
    website: string
    hiringType: 'PERMANENT' | 'INTERNSHIP' | 'CONTRACT'
    source: 'SCRAPING' | 'LEAD' | 'EVENT' | 'REFERRAL'
    assignedCoordinatorId: string
    mouDocumentUrl: string
    mouStartDate: string
    mouEndDate: string
    commercialPercent: string
    paymentTerms: string
    hrContacts: Array<{
      _id?: string
      name: string
      phone?: string
      email?: string
      linkedIn?: string
      designation?: string
      isPrimary?: boolean
    }>
  }

  const [formState, setFormState] = useState<CompanyFormState>({
    name: '',
    category: '',
    sector: 'IT',
    location: '',
    mouStatus: 'NOT_STARTED',
    website: '',
    hiringType: 'PERMANENT',
    source: 'SCRAPING',
    assignedCoordinatorId: 'system',
    mouDocumentUrl: '',
    mouStartDate: '',
    mouEndDate: '',
    commercialPercent: '',
    paymentTerms: '',
    hrContacts: [
      {
        name: '',
        email: '',
        phone: '',
        linkedIn: '',
        designation: '',
        isPrimary: true,
      },
    ],
  })

  const autoLogoUrl = useMemo(() => getAutoCompanyLogo(formState.name, formState.website), [formState.name, formState.website])

  // Fetch companies on mount
  const fetchCompanies = async () => {
    setIsLoading(true)
    const result = await getCompanies({})
    if (result.success && result.data) {
      // Transform backend data to match frontend interface
      const transformed = result.data.map((c: any) => ({
        _id: c._id,
        name: c.name,
        category: c.category || '',
        sector: c.sector,
        location: c.location,
        mouStatus: c.mouStatus,
        website: c.website,
        contacts: c.contacts || [],
        activeRequirements: c.activeRequirements || 0,
        createdAt: c.createdAt,
        hiringType: c.hiringType,
        source: c.source,
        mouDocumentUrl: c.mouDocumentUrl || '',
        mouStartDate: c.mouStartDate || null,
        mouEndDate: c.mouEndDate || null,
        commercialPercent: c.commercialPercent ?? null,
        paymentTerms: c.paymentTerms || '',
        assignedCoordinatorId: c.assignedCoordinatorId || '',
      }))
      setCompanies(transformed)
    } else {
      toast.error('Failed to load companies', result.error || 'Unknown error')
    }
    setIsLoading(false)
  }

  const loadExportJobs = useCallback(async () => {
    if (!session?.user?.id) return

    setIsLoadingExportJobs(true)
    const result = await listExportJobsAction({ entityType: 'COMPANY', limit: 5 })
    if (result.success) {
      setExportJobs(normalizeExportJobs(result.data))
    }
    setIsLoadingExportJobs(false)
  }, [session?.user?.id])

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      loadExportJobs()
    }
  }, [session?.user?.id, loadExportJobs])

  const sectors = useMemo(() => {
    const unique = new Set<string>(sectorOptions.map((s) => s.value))
    companies.forEach((c) => unique.add(c.sector))
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [companies])

  const filteredCompanies = useMemo(() => {
    let result = [...companies]

    if (showExpiringOnly) {
      const threshold = new Date()
      threshold.setDate(threshold.getDate() + 7)
      result = result.filter((c) => {
        if (!c.mouEndDate) return false
        const end = new Date(c.mouEndDate)
        return end <= threshold
      })
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      )
    }

    if (filterStatus !== 'all') {
      result = result.filter((c) => c.mouStatus === filterStatus)
    }

    if (filterSector !== 'all') {
      result = result.filter((c) => c.sector === filterSector)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'requirements':
          return b.activeRequirements - a.activeRequirements
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return result
  }, [companies, searchQuery, filterStatus, filterSector, sortBy, showExpiringOnly])

  const stats = useMemo(() => {
    const signed = companies.filter((company) => company.mouStatus === 'SIGNED').length
    const activeSigned = companies.filter((company) => hasActiveRequirementMou(company)).length

    return {
      total: companies.length,
      signed,
      activeSigned,
      signedInactive: Math.max(0, signed - activeSigned),
      inProgress: companies.filter((company) => company.mouStatus === 'IN_PROGRESS').length,
      activeReqs: companies.reduce((acc, company) => acc + company.activeRequirements, 0),
    }
  }, [companies])

  const statusCounts = useMemo(() => ({
    all: companies.length,
    SIGNED: companies.filter((company) => company.mouStatus === 'SIGNED').length,
    IN_PROGRESS: companies.filter((company) => company.mouStatus === 'IN_PROGRESS').length,
    NOT_STARTED: companies.filter((company) => company.mouStatus === 'NOT_STARTED').length,
  }), [companies])

  const resetForm = () => {
    setFormState({
      name: '',
      category: '',
      sector: 'IT',
      location: '',
      mouStatus: 'NOT_STARTED',
      website: '',
      hiringType: 'PERMANENT',
      source: 'SCRAPING',
      assignedCoordinatorId: 'system',
      mouDocumentUrl: '',
      mouStartDate: '',
      mouEndDate: '',
      commercialPercent: '',
      paymentTerms: '',
      hrContacts: [
        { name: '', email: '', phone: '', linkedIn: '', designation: '', isPrimary: true },
      ],
    })
    setMouFileName('')
    setEditingId(null)
  }

  const openAddModal = () => {
    if (!canCreate) {
      toast.error('Forbidden', 'Only admins or coordinators can add companies')
      return
    }
    resetForm()
    setIsAddModalOpen(true)
  }

  const openEditModal = (company: Company) => {
    if (!canEdit) {
      toast.error('Forbidden', 'You do not have permission to edit companies')
      return
    }
    setFormState({
      name: company.name,
      category: company.category,
      sector: company.sector,
      location: company.location,
      mouStatus: company.mouStatus,
      website: company.website || '',
      hiringType: company.hiringType,
      source: company.source,
      assignedCoordinatorId: company.assignedCoordinatorId || '',
      mouDocumentUrl: company.mouDocumentUrl || '',
      mouStartDate: toDateInputValue(company.mouStartDate),
      mouEndDate: toDateInputValue(company.mouEndDate),
      commercialPercent: company.commercialPercent === null || company.commercialPercent === undefined
        ? ''
        : String(company.commercialPercent),
      paymentTerms: company.paymentTerms || '',
      hrContacts:
        (company.contacts && company.contacts.length
          ? company.contacts.map((c) => ({
            _id: c._id,
            name: c.name,
            email: c.email || '',
            phone: c.phone || '',
            linkedIn: c.linkedIn || '',
            designation: c.designation || '',
            isPrimary: c.isPrimary || false,
          }))
          : [{ name: '', email: '', phone: '', linkedIn: '', designation: '', isPrimary: true }]),
    })
    setMouFileName('')
    setEditingId(company._id)
    setIsAddModalOpen(true)
  }

  const handleMouFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const maxSize = 3 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('File too large', 'Please upload a file up to 3MB')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const fileData = reader.result
      if (typeof fileData === 'string') {
        setFormState((s) => ({ ...s, mouDocumentUrl: fileData }))
        setMouFileName(file.name)
        toast.success('File attached', `${file.name} attached as MOU document`) 
      }
    }
    reader.onerror = () => {
      toast.error('Upload failed', 'Unable to read selected file')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (editingId && !canEdit) {
      toast.error('Forbidden', 'You do not have permission to update companies')
      return
    }
    if (!editingId && !canCreate) {
      toast.error('Forbidden', 'You do not have permission to create companies')
      return
    }

    if (!formState.name.trim()) {
      toast.error('Missing name', 'Company name is required')
      return
    }
    if (!formState.category.trim()) {
      toast.error('Missing category', 'Category is required')
      return
    }
    if (!formState.location.trim()) {
      toast.error('Missing location', 'Location is required')
      return
    }
    if (!formState.assignedCoordinatorId.trim()) {
      toast.error('Missing coordinator', 'Assigned coordinator is required')
      return
    }
    const preparedContacts = formState.hrContacts
      .map((c) => ({
        name: c.name.trim(),
        email: (c.email || '').trim(),
        phone: (c.phone || '').trim(),
        linkedIn: (c.linkedIn || '').trim(),
        designation: (c.designation || '').trim(),
        isPrimary: Boolean(c.isPrimary),
      }))
      .filter((c) => c.name)

    if (!preparedContacts.length) {
      toast.error('Contact required', 'Add at least one HR contact name')
      return
    }

    const hasPrimary = preparedContacts.some((c) => c.isPrimary)
    if (!hasPrimary) {
      toast.error('Primary contact required', 'Mark one HR contact as primary')
      return
    }

    const incompleteContact = preparedContacts.find((c) => !c.phone && !c.email)
    if (incompleteContact) {
      toast.error('Contact info missing', 'Each HR contact needs a phone or email')
      return
    }

    const mouStartDate = parseDateInput(formState.mouStartDate)
    const mouEndDate = parseDateInput(formState.mouEndDate)
    const commercialPercent = formState.commercialPercent.trim().length > 0
      ? Number(formState.commercialPercent)
      : undefined

    if (formState.mouStatus === 'SIGNED') {
      if (!mouStartDate || !mouEndDate) {
        toast.error('MOU dates required', 'Provide MOU start and end dates when status is Signed')
        return
      }
      if (mouStartDate >= mouEndDate) {
        toast.error('Invalid MOU dates', 'MOU end date must be after the start date')
        return
      }
      if (commercialPercent === undefined || Number.isNaN(commercialPercent) || commercialPercent < 0 || commercialPercent > 100) {
        toast.error('Invalid commercial percent', 'Set a commercial percentage between 0 and 100 for signed MOU')
        return
      }
    }

    const mouPayload = formState.mouStatus === 'SIGNED'
      ? {
        mouStartDate,
        mouEndDate,
        commercialPercent,
      }
      : {
        mouStartDate: undefined,
        mouEndDate: undefined,
        commercialPercent: undefined,
      }

    setIsSaving(true)

    if (editingId) {
      const result = await updateCompanyAction({
        id: editingId,
        name: formState.name,
        category: formState.category,
        sector: formState.sector as 'IT' | 'NON_IT' | 'CORE' | 'STARTUP' | 'ENTERPRISE',
        location: formState.location,
        mouStatus: formState.mouStatus,
        website: formState.website || undefined,
        hiringType: formState.hiringType,
        source: formState.source,
        assignedCoordinatorId: formState.assignedCoordinatorId,
        mouDocumentUrl: formState.mouDocumentUrl || undefined,
        ...mouPayload,
        paymentTerms: formState.paymentTerms || undefined,
        hrContacts: preparedContacts,
      })

      if (result.success) {
        toast.success('Company Updated', `${formState.name} updated successfully`)
        fetchCompanies() // Refresh list
      } else {
        toast.error('Update Failed', result.error || 'Unknown error')
      }
    } else {
      const result = await createCompanyAction({
        name: formState.name,
        category: formState.category,
        sector: formState.sector as 'IT' | 'NON_IT' | 'CORE' | 'STARTUP' | 'ENTERPRISE',
        location: formState.location,
        mouStatus: formState.mouStatus,
        website: formState.website || undefined,
        hiringType: formState.hiringType,
        source: formState.source,
        assignedCoordinatorId: formState.assignedCoordinatorId,
        mouDocumentUrl: formState.mouDocumentUrl || undefined,
        ...mouPayload,
        paymentTerms: formState.paymentTerms || undefined,
        hrContacts: preparedContacts,
      })

      if (result.success) {
        toast.success('Company Created', `${formState.name} added successfully`)
        fetchCompanies() // Refresh list
      } else {
        toast.error('Creation Failed', result.error || 'Unknown error')
      }
    }

    setIsSaving(false)
    setIsAddModalOpen(false)
    resetForm()
  }

  const handleDelete = (company: Company) => {
    if (!canDeleteCompany) {
      toast.error('Forbidden', 'Only admins can delete companies')
      return
    }
    setSelectedCompany(company)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!canDeleteCompany) {
      toast.error('Forbidden', 'Only admins can delete companies')
      setIsDeleteDialogOpen(false)
      return
    }
    if (selectedCompany) {
      const result = await deleteCompany(selectedCompany._id)
      if (result.success) {
        setCompanies((prev) => prev.filter((c) => c._id !== selectedCompany._id))
        toast.success('Company Deleted', `${selectedCompany.name} has been removed`)
      } else {
        toast.error('Delete Failed', result.error || 'Unknown error')
      }
      const fetchResult = await getCompanies({})
      if (fetchResult.success) {
        fetchCompanies()
      }
      setSelectedCompany(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleExport = async () => {
    const res = await createExportJobAction({
      entityType: 'COMPANY',
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
    <PageContainer
      maxWidth="7xl"
      header={
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-orange-50/50 p-6 lg:p-7">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-sky-200/70 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute left-1/2 top-3 h-36 w-36 -translate-x-1/2 rounded-full bg-cyan-100/70 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-14 -left-14 h-44 w-44 rounded-full bg-amber-100/60 blur-3xl" aria-hidden="true" />

          <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-sky-800 via-cyan-700 to-teal-600 p-3 text-white shadow-md">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <p className="type-eyebrow tracking-[0.2em] text-slate-600">Partner Directory</p>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Companies</h1>
                <p className="type-helper font-medium text-slate-700">Manage client organizations, HR contacts, and MOU readiness.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport} className="bg-white hover:bg-slate-50 border-slate-300 text-slate-700">
                Export CSV
              </Button>
              {canCreate && (
                <AnimatedButton variant="primary" icon={<Plus className="w-4 h-4" />} iconPosition="left" onClick={openAddModal}>
                  Add Company
                </AnimatedButton>
              )}
            </div>
          </div>

          <div className="relative z-10 mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">Total Companies</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-teal-50 px-4 py-3">
              <p className="text-sm font-medium text-cyan-900">MOU Signed</p>
              <p className="mt-1 text-2xl font-semibold text-cyan-800 tabular-nums">{stats.signed}</p>
              <p className="text-xs font-medium text-cyan-900/85">Eligible for requirement intake: {stats.activeSigned}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3">
              <p className="text-sm font-medium text-amber-900">In Progress</p>
              <p className="mt-1 text-2xl font-semibold text-amber-800 tabular-nums">{stats.inProgress}</p>
              <p className="text-xs font-medium text-amber-900/85">Signed but inactive: {stats.signedInactive}</p>
            </div>
            <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-sky-900">Active Requirements</p>
              <p className="mt-1 text-2xl font-semibold text-sky-800 tabular-nums">{stats.activeReqs}</p>
            </div>
          </div>
        </section>
      }
    >
      <div className="space-y-6" style={companiesPalette}>
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="type-section-title text-slate-800">Company Workspace</h2>
              <p className="type-helper font-medium text-slate-700">Search, filter, and sort company records with MOU status context.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: 'recent', label: 'Most Recent' },
                  { value: 'name', label: 'Sort by Name' },
                  { value: 'requirements', label: 'Sort by Requirements' },
                ]}
                className="w-44"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row">
            <SearchInput
              placeholder="Search by name, category, or location"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              className="w-full lg:max-w-md"
            />
            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-[440px]">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'SIGNED', label: 'MOU Signed' },
                  { value: 'IN_PROGRESS', label: 'In Progress' },
                  { value: 'NOT_STARTED', label: 'Not Started' },
                ]}
              />
              <Select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                options={[{ value: 'all', label: 'All Sectors' }, ...sectors.map((s) => ({ value: s, label: s }))]}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: 'all', label: 'All', count: statusCounts.all },
              { value: 'SIGNED', label: 'Signed', count: statusCounts.SIGNED },
              { value: 'IN_PROGRESS', label: 'In Progress', count: statusCounts.IN_PROGRESS },
              { value: 'NOT_STARTED', label: 'Not Started', count: statusCounts.NOT_STARTED },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilterStatus(item.value)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  filterStatus === item.value
                    ? 'border-sky-700 bg-gradient-to-r from-sky-700 to-cyan-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50/60'
                )}
              >
                <span>{item.label}</span>
                <span className={cn('rounded-full px-1.5 py-0.5 text-xs font-semibold', filterStatus === item.value ? 'bg-white/20 text-white' : 'bg-white text-slate-700')}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-slate-900">Recent Export Jobs</p>
            <Button variant="ghost" size="sm" onClick={loadExportJobs}>Refresh</Button>
          </div>
          {isLoadingExportJobs && (
            <p className="type-helper text-slate-600">Loading export jobs...</p>
          )}
          {!isLoadingExportJobs && exportJobs.length === 0 && (
            <p className="type-helper text-slate-600">No export jobs yet.</p>
          )}
          {!isLoadingExportJobs && exportJobs.length > 0 && (
            <div className="space-y-2">
              {exportJobs.map((job) => (
                <div key={job._id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 transition-colors hover:bg-sky-50/40">
                  <div className="min-w-0">
                    <p className="truncate type-metadata text-slate-600">{job._id}</p>
                    <p className="type-metadata text-slate-600">{job.createdAt ? new Date(job.createdAt).toLocaleString('en-US') : 'Unknown time'} • {job.format}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-xs font-semibold',
                      job.status === 'COMPLETED' && 'text-cyan-700',
                      (job.status === 'FAILED' || job.status === 'DEAD_LETTER') && 'text-red-600',
                      (job.status === 'PENDING' || job.status === 'PROCESSING') && 'text-amber-700'
                    )}>
                      {job.status}
                    </p>
                    {job.status === 'COMPLETED' && job.fileUrl && (
                      <a href={job.fileUrl} className="text-xs font-semibold text-cyan-700 underline-offset-2 hover:text-cyan-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:rounded" target="_blank" rel="noopener noreferrer">Download</a>
                    )}
                    {(job.status === 'FAILED' || job.status === 'DEAD_LETTER') && job.errorMessage && (
                      <p className="text-xs text-red-600 truncate max-w-48">{job.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            Showing <span className="font-semibold text-slate-900">{filteredCompanies.length}</span> of {companies.length} companies
          </p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {SKELETON_IDS.map((id) => (
              <div key={id} className="h-72 rounded-2xl bg-[var(--surface-hover)] animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && filteredCompanies.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCompanies.map((company) => (
              <CompanyCard
                key={company._id}
                company={company}
                onView={() => {
                  setSelectedCompany(company)
                  setIsViewDrawerOpen(true)
                }}
                onEdit={() => openEditModal(company)}
                onDelete={() => handleDelete(company)}
                canEdit={canEdit}
                canDelete={canDeleteCompany}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredCompanies.length === 0 && (
          <div className="empty-state bg-white rounded-2xl border border-[var(--border)]">
            <div className="empty-state-icon">
              <Building2 />
            </div>
            <h3 className="empty-state-title">No companies found</h3>
            <p className="empty-state-description">
              {searchQuery || filterStatus !== 'all' || filterSector !== 'all'
                ? 'Try adjusting your filters or search query'
                : 'Get started by adding your first company'}
            </p>
            {canCreate && !searchQuery && filterStatus === 'all' && filterSector === 'all' && (
              <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />} onClick={openAddModal}>
                Add Company
              </Button>
            )}
          </div>
        )}

        <Modal
          isOpen={isViewDrawerOpen}
          onClose={() => setIsViewDrawerOpen(false)}
          title={selectedCompany?.name}
          description="Company profile, contacts, and MOU details"
          size="xl"
        >
          {selectedCompany && (
            <div className="w-full space-y-4 pb-1">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <CompanyAvatar
                      name={selectedCompany.name}
                      website={selectedCompany.website}
                      className="avatar avatar-xl avatar-gradient"
                    />
                    <div className="min-w-0">
                      <p className="type-eyebrow mb-1 tracking-[0.1em] text-slate-600">{selectedCompany.category || 'Uncategorized'}</p>
                      <h2 className="truncate text-xl font-bold text-[var(--foreground)]">{selectedCompany.name}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge status={selectedCompany.mouStatus} />
                        <span className="chip chip-outline text-xs">{selectedCompany.sector}</span>
                        <span className="chip chip-outline text-xs">{selectedCompany.hiringType}</span>
                        {selectedCompany.website && (
                          <a className="chip chip-outline text-xs" href={selectedCompany.website} target="_blank" rel="noreferrer">
                            <Globe2 className="w-3 h-3" />
                            Website
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Reqs</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{selectedCompany.activeRequirements}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Contacts</p>
                    <p className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{selectedCompany.contacts?.length || 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Source</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCompany.source}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">Company Details</h3>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-900">
                      <MapPin className="h-4 w-4 text-slate-500" />
                      {selectedCompany.location}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Coordinator</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{selectedCompany.assignedCoordinatorId || 'Not assigned'}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-semibold text-slate-900">MOU and Commercials</h3>
                {canViewSensitive ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">MOU Start</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{formatReadableDate(selectedCompany.mouStartDate)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">MOU End</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{formatReadableDate(selectedCompany.mouEndDate)}</p>
                      </div>
                    </div>

                    {selectedCompany.commercialPercent !== null && selectedCompany.commercialPercent !== undefined && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Commercial</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">{selectedCompany.commercialPercent}%</p>
                      </div>
                    )}

                    {selectedCompany.paymentTerms && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Terms</p>
                        <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{selectedCompany.paymentTerms}</p>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">MOU Document</p>
                      {selectedCompany.mouDocumentUrl ? (
                        <a
                          href={selectedCompany.mouDocumentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-sm font-semibold text-[var(--primary)] underline underline-offset-2 hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:rounded"
                        >
                          View MOU
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-slate-600">No document uploaded</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-600">MOU details are restricted for recruiters.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-900">HR Contacts</h3>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {selectedCompany.contacts?.length || 0}
                  </span>
                </div>

                {selectedCompany.contacts?.length ? (
                  <div className="space-y-3">
                    {selectedCompany.contacts.map((contact) => (
                      <div key={contact._id} className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="avatar avatar-md bg-white text-[var(--primary)] border border-[var(--border)]">
                            {getInitial(contact.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">{contact.name}</p>
                            <p className="text-xs text-slate-600">{contact.designation || 'Designation not specified'}</p>

                            {canViewSensitive ? (
                              <div className="mt-2 space-y-1.5">
                                {contact.email ? (
                                  <a
                                    href={`mailto:${contact.email}`}
                                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:rounded"
                                  >
                                    <Mail className="h-4 w-4" />
                                    <span className="truncate">{contact.email}</span>
                                  </a>
                                ) : (
                                  <p className="text-sm text-slate-500">Email not provided</p>
                                )}

                                {contact.phone ? (
                                  <a
                                    href={`tel:${contact.phone}`}
                                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:rounded"
                                  >
                                    <Phone className="h-4 w-4" />
                                    <span>{contact.phone}</span>
                                  </a>
                                ) : (
                                  <p className="text-sm text-slate-500">Phone not provided</p>
                                )}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm text-slate-500">Contact details hidden for recruiters.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm italic text-slate-600">No contacts added yet.</p>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3">
                  <h3 className="text-base font-semibold text-slate-900">Documents</h3>
                  <p className="text-sm text-slate-600">All company documents are listed below in a single scroll-safe container.</p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <DocumentManager entityType="Company" entityId={selectedCompany._id} readonly={!canEdit} />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Partnership Letter</h3>
                    <p className="text-sm text-slate-600">Compact preview details with printable export.</p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                    {generatePartnershipDocId(selectedCompany)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Partnership Type</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{getPartnershipType(selectedCompany.hiringType)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verification</p>
                    <p className="mt-1 text-sm text-slate-700">www.magnuscopo.com/verify/{generatePartnershipDocId(selectedCompany)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Download className="w-4 h-4" />}
                    onClick={() => handlePrintPartnershipLetter(selectedCompany)}
                  >
                    Download / Print Letter
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FileText className="w-4 h-4" />}
                    onClick={() => handlePrintPartnershipLetter(selectedCompany)}
                  >
                    Print
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-3">
                  {canEdit && (
                    <Button variant="gradient" fullWidth leftIcon={<Edit2 className="w-4 h-4" />} onClick={() => openEditModal(selectedCompany)}>
                      Edit Company
                    </Button>
                  )}
                  <Button variant="secondary" fullWidth leftIcon={<Briefcase className="w-4 h-4" />}>
                    View Requirements
                  </Button>
                </div>
              </section>
            </div>
          )}
        </Modal>

        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          title="Delete Company"
          message={`Are you sure you want to delete "${selectedCompany?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />

        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={editingId ? 'Edit Company' : 'Add New Company'}
          description={editingId ? 'Update company details' : 'Enter the details for the new client company'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label htmlFor="company-name" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">
                  Company Name *
                </label>
                <input
                  id="company-name"
                  className="input-modern"
                  placeholder="e.g., Acme Corporation"
                  value={formState.name}
                  onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Category *</label>
                <input
                  id="category"
                  className="input-modern"
                  placeholder="e.g., Technology, Healthcare"
                  value={formState.category}
                  onChange={(e) => setFormState((s) => ({ ...s, category: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="sector" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Sector</label>
                <select
                  id="sector"
                  className="select-modern w-full"
                  value={formState.sector}
                  onChange={(e) => setFormState((s) => ({ ...s, sector: e.target.value }))}
                >
                  {sectorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mou-status" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">MOU Status</label>
                <select
                  id="mou-status"
                  className="select-modern w-full"
                  value={formState.mouStatus}
                  onChange={(e) => setFormState((s) => ({ ...s, mouStatus: e.target.value as 'NOT_STARTED' | 'IN_PROGRESS' | 'SIGNED' }))}
                >
                  {mouOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Location *</label>
                <input
                  id="location"
                  className="input-modern"
                  placeholder="e.g., San Francisco, CA"
                  value={formState.location}
                  onChange={(e) => setFormState((s) => ({ ...s, location: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="website" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Website</label>
                <input
                  id="website"
                  className="input-modern"
                  placeholder="https://company.com"
                  value={formState.website}
                  onChange={(e) => setFormState((s) => ({ ...s, website: e.target.value }))}
                />
              </div>
              <div className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] p-3">
                <div className="flex items-center gap-3">
                  <CompanyAvatar
                    name={formState.name || 'Company'}
                    website={formState.website}
                    className="avatar avatar-lg bg-gradient-to-br from-sky-800 via-cyan-700 to-teal-600 text-white shadow-sm"
                  />
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Display Picture Preview</p>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      {autoLogoUrl
                        ? 'Logo detected automatically from website/company name.'
                        : 'Enter company name or website to auto-detect logo.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="hiring-type" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Hiring Type *</label>
                <select
                  id="hiring-type"
                  className="select-modern w-full"
                  value={formState.hiringType}
                  onChange={(e) => setFormState((s) => ({ ...s, hiringType: e.target.value as CompanyFormState['hiringType'] }))}
                >
                  {hiringTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="source" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Source *</label>
                <select
                  id="source"
                  className="select-modern w-full"
                  value={formState.source}
                  onChange={(e) => setFormState((s) => ({ ...s, source: e.target.value as CompanyFormState['source'] }))}
                >
                  {sourceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="assigned-coordinator" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Assigned Coordinator *</label>
                <input
                  id="assigned-coordinator"
                  className="input-modern"
                  placeholder="Coordinator user ID"
                  value={formState.assignedCoordinatorId}
                  onChange={(e) => setFormState((s) => ({ ...s, assignedCoordinatorId: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="mou-document" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">MOU Document (Optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    id="mou-document"
                    className="input-modern"
                    placeholder="Paste MOU link (optional)"
                    value={formState.mouDocumentUrl}
                    onChange={(e) => {
                      setMouFileName('')
                      setFormState((s) => ({ ...s, mouDocumentUrl: e.target.value }))
                    }}
                  />
                  <label htmlFor="mou-upload" className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-hover)]">
                    <Upload className="h-4 w-4" />
                    Upload
                  </label>
                  <input
                    id="mou-upload"
                    type="file"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={handleMouFileUpload}
                  />
                </div>
                {mouFileName && (
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">Attached: {mouFileName}</p>
                )}
              </div>
              {formState.mouStatus === 'SIGNED' && (
                <>
                  <div>
                    <label htmlFor="mou-start-date" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">MOU Start Date *</label>
                    <input
                      id="mou-start-date"
                      className="input-modern"
                      type="date"
                      value={formState.mouStartDate}
                      onChange={(e) => setFormState((s) => ({ ...s, mouStartDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="mou-end-date" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">MOU End Date *</label>
                    <input
                      id="mou-end-date"
                      className="input-modern"
                      type="date"
                      value={formState.mouEndDate}
                      onChange={(e) => setFormState((s) => ({ ...s, mouEndDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label htmlFor="commercial-percent" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Commercial % *</label>
                    <input
                      id="commercial-percent"
                      className="input-modern"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="e.g., 8.5"
                      value={formState.commercialPercent}
                      onChange={(e) => setFormState((s) => ({ ...s, commercialPercent: e.target.value }))}
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label htmlFor="payment-terms" className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Payment Terms</label>
                <textarea
                  id="payment-terms"
                  className="input-modern min-h-[72px]"
                  placeholder="Add payment terms or notes"
                  value={formState.paymentTerms}
                  onChange={(e) => setFormState((s) => ({ ...s, paymentTerms: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--foreground)]">HR Contacts *</h4>
                <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={addContactRow}>
                  Add Contact
                </Button>
              </div>
              <div className="space-y-3">
                {formState.hrContacts.map((contact, index) => (
                  <div key={index} className="border border-[var(--border)] rounded-xl p-3 bg-[var(--surface-hover)]">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-sm font-semibold text-[var(--foreground-muted)]">Contact {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1 text-sm text-[var(--foreground-muted)]">
                          <input
                            type="radio"
                            name="primary-contact"
                            checked={Boolean(contact.isPrimary)}
                            onChange={() => setPrimaryContact(index)}
                          />
                          Primary
                        </label>
                        {formState.hrContacts.length > 1 && (
                          <IconButton aria-label="Remove contact" variant="ghost" size="sm" onClick={() => removeContactRow(index)}>
                            <Trash2 className="w-4 h-4" />
                          </IconButton>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[var(--foreground-muted)]">Name *</label>
                        <input
                          className="input-modern"
                          value={contact.name}
                          onChange={(e) => updateContactField(index, 'name', e.target.value)}
                          placeholder="Contact name"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[var(--foreground-muted)]">Designation</label>
                        <input
                          className="input-modern"
                          value={contact.designation || ''}
                          onChange={(e) => updateContactField(index, 'designation', e.target.value)}
                          placeholder="HR Manager"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[var(--foreground-muted)]">Email</label>
                        <input
                          className="input-modern"
                          type="email"
                          value={contact.email || ''}
                          onChange={(e) => updateContactField(index, 'email', e.target.value)}
                          placeholder="email@example.com"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-semibold text-[var(--foreground-muted)]">Phone</label>
                        <input
                          className="input-modern"
                          value={contact.phone || ''}
                          onChange={(e) => updateContactField(index, 'phone', e.target.value)}
                          placeholder="Phone number"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="mb-1 block text-sm font-semibold text-[var(--foreground-muted)]">LinkedIn</label>
                        <input
                          className="input-modern"
                          value={contact.linkedIn || ''}
                          onChange={(e) => updateContactField(index, 'linkedIn', e.target.value)}
                          placeholder="https://www.linkedin.com/in/..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
              <AnimatedButton variant="secondary" onClick={() => { setIsAddModalOpen(false); resetForm() }}>
                Cancel
              </AnimatedButton>
              <AnimatedButton
                variant="primary"
                icon={<Sparkles className="w-4 h-4" />}
                iconPosition="left"
                onClick={handleSave}
                disabled={isSaving}
                loading={isSaving}
              >
                {editingId ? 'Save Changes' : 'Create Company'}
              </AnimatedButton>
            </div>
          </div>
        </Modal>
      </div >
    </PageContainer >
  );
}
