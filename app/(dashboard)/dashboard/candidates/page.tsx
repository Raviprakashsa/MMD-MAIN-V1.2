'use client'

import { useRef, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Users,
  Plus,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  FileText,
  Calendar,
  Briefcase,
  Star,
  Download,
  Upload,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  ArrowUpRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Button, { IconButton } from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Input'
import { Modal, ConfirmDialog, Drawer } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  getCandidates,
  addCandidateAction,
  updateCandidate,
  updateCandidateStatusAction,
  deleteCandidate,
} from '@/lib/actions/module8-candidate'
import { getRequirements } from '@/lib/actions/module4-requirement'


interface Skill {
  name: string
  level: 'Beginner' | 'Intermediate' | 'Expert'
}

interface Experience {
  company: string
  role: string
  duration: string
  current: boolean
}

interface Candidate {
  id: string
  name: string
  email: string
  phone: string
  location: string
  role: string
  status: 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected'
  source: string
  experience: number
  skills: Skill[]
  workHistory: Experience[]
  rating: number
  isStarred: boolean
  appliedDate: string
  resumeUrl?: string
  notes?: string
  // Backend-linked fields
  requirementId?: string
  requirementTitle?: string
  companyName?: string
}

// Backend candidate type from the API
interface BackendCandidate {
  _id: string
  requirementId: string
  name: string
  phone: string
  email: string
  resumeUrl?: string
  skills: string[]
  college?: string | null
  yearsExperience?: number | null
  status: 'APPLIED' | 'SHORTLISTED' | 'INTERVIEWED' | 'OFFERED' | 'JOINED' | 'REJECTED'
  appliedAt?: string
  createdAt?: string
  requirement?: {
    _id: string
    title?: string
    jobTitle?: string
    company?: string
    companyDetails?: {
      name: string
      location?: string
    }
  } | null
}

// Status mapping: backend uppercase to frontend display
const statusMap: Record<BackendCandidate['status'], Candidate['status']> = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Screening',
  INTERVIEWED: 'Interview',
  OFFERED: 'Offer',
  JOINED: 'Hired',
  REJECTED: 'Rejected',
}

// Reverse status mapping: frontend display to backend uppercase
const reverseStatusMap: Record<Candidate['status'], BackendCandidate['status']> = {
  Applied: 'APPLIED',
  Screening: 'SHORTLISTED',
  Interview: 'INTERVIEWED',
  Offer: 'OFFERED',
  Hired: 'JOINED',
  Rejected: 'REJECTED',
}

// Transform backend candidate to frontend format
function transformCandidate(bc: BackendCandidate): Candidate {
  return {
    id: bc._id,
    name: bc.name,
    email: bc.email,
    phone: bc.phone,
    location: bc.requirement?.companyDetails?.location || 'Not specified',
    role: bc.requirement?.jobTitle || bc.requirement?.title || 'General Application',
    status: statusMap[bc.status],
    source: 'Database', // Backend doesn't track source, default value
    experience: bc.yearsExperience ?? 0,
    skills: bc.skills.map((s) => ({ name: s, level: 'Intermediate' as const })),
    workHistory: bc.college
      ? [{ company: bc.college, role: 'Education', duration: 'Past', current: false }]
      : [],
    rating: 3, // Default rating - could be stored in backend later
    isStarred: false, // Could be stored in backend later
    appliedDate: bc.appliedAt || bc.createdAt || new Date().toISOString(),
    resumeUrl: bc.resumeUrl,
    notes: bc.college ? `College: ${bc.college}` : undefined,
    requirementId: bc.requirementId,
    requirementTitle: bc.requirement?.jobTitle || bc.requirement?.title,
    companyName: bc.requirement?.company || bc.requirement?.companyDetails?.name,
  }
}

type StatusTransitionPayload = {
  candidateId: string
  status: BackendCandidate['status']
  phoneLog?: string
  interview?: { datetime: string; interviewerEmail: string }
  rejectionReasonCode?: string
  offeredCtc?: number
}

type StatusTransitionResult =
  | { cancelled: true; message: string }
  | { cancelled: false; payload: StatusTransitionPayload }

function buildStatusTransitionPayload(candidateId: string, status: BackendCandidate['status']): StatusTransitionResult {
  const payload: StatusTransitionPayload = {
    candidateId,
    status,
  }

  if (status === 'SHORTLISTED') {
    const phoneLog = window.prompt('Add phone screening note to move candidate to Screening')
    if (!phoneLog?.trim()) {
      return { cancelled: true, message: 'Status update cancelled: phone screening note is required' }
    }
    payload.phoneLog = phoneLog.trim()
  }

  if (status === 'INTERVIEWED') {
    const datetime = window.prompt('Enter interview datetime (ISO format)')
    if (!datetime?.trim()) {
      return { cancelled: true, message: 'Status update cancelled: interview datetime is required' }
    }

    const interviewerEmail = window.prompt('Enter interviewer email')
    if (!interviewerEmail?.trim()) {
      return { cancelled: true, message: 'Status update cancelled: interviewer email is required' }
    }

    payload.interview = {
      datetime: datetime.trim(),
      interviewerEmail: interviewerEmail.trim(),
    }
  }

  if (status === 'OFFERED') {
    const offeredCtcRaw = window.prompt('Enter offered CTC (numeric value)')
    const offeredCtc = Number.parseFloat(offeredCtcRaw || '')
    if (!Number.isFinite(offeredCtc) || offeredCtc < 0) {
      return { cancelled: true, message: 'Status update cancelled: valid offered CTC is required' }
    }
    payload.offeredCtc = offeredCtc
  }

  if (status === 'REJECTED') {
    const rejectionReasonCode = window.prompt('Enter rejection reason code')
    if (!rejectionReasonCode?.trim()) {
      return { cancelled: true, message: 'Status update cancelled: rejection reason code is required' }
    }
    payload.rejectionReasonCode = rejectionReasonCode.trim()
  }

  return { cancelled: false, payload }
}




const emptyForm: Candidate = {
  id: '',
  name: '',
  email: '',
  phone: '',
  location: '',
  role: '',
  status: 'Applied',
  source: 'LinkedIn',
  experience: 0,
  skills: [],
  workHistory: [],
  rating: 3,
  isStarred: false,
  appliedDate: new Date().toISOString().slice(0, 10),
  notes: '',
}

const statusConfig = {
  Applied: {
    bg: 'bg-blue-50/50 text-blue-700 border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30',
    icon: Clock,
  },
  Screening: {
    bg: 'bg-amber-50/50 text-amber-700 border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/30',
    icon: AlertCircle,
  },
  Interview: {
    bg: 'bg-purple-50/50 text-purple-700 border-purple-200/50 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-700/30',
    icon: Calendar,
  },
  Offer: {
    bg: 'bg-emerald-50/50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/30',
    icon: FileText,
  },
  Hired: {
    bg: 'bg-green-50/50 text-green-700 border-green-200/50 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/30',
    icon: CheckCircle2,
  },
  Rejected: {
    bg: 'bg-red-50/50 text-red-700 border-red-200/50 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30',
    icon: XCircle,
  },
}

type StatusKey = keyof typeof statusConfig

type StatusConfig = (typeof statusConfig)[StatusKey]

function StatusBadge({ status }: { status: Candidate['status'] }) {
  const config: StatusConfig = statusConfig[status]
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm', config.bg)}>
      <Icon className="w-3.5 h-3.5" />
      {status}
    </span>
  )
}

function SkillBadge({ skill }: { skill: Skill }) {
  const levelColors = {
    Beginner: 'bg-slate-100/80 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
    Intermediate: 'bg-blue-50/80 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    Expert: 'bg-emerald-50/80 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  }
  return <span className={cn('px-2.5 py-1 rounded-md text-xs font-medium border backdrop-blur-sm transition-all hover:scale-105 cursor-default', levelColors[skill.level])}>{skill.name}</span>
}

function RatingStars({ rating, onChange }: { rating: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange?.(n)}
          aria-label={`Rate ${n} stars`}
          className={cn(
            'w-4 h-4 transition-all duration-200 hover:scale-110',
            n <= rating ? 'text-amber-400 drop-shadow-sm' : 'text-slate-200 dark:text-slate-700',
            onChange && 'hover:text-amber-300 cursor-pointer'
          )}
          disabled={!onChange}
        >
          <Star className={cn('w-full h-full', n <= rating && 'fill-current')} />
        </button>
      ))}
    </div>
  )
}

function CandidateCard({
  candidate,
  onView,
  onEdit,
  onDelete,
  onToggleStar,
  onConvertToPlacement,
  canEdit,
  canDelete,
}: {
  candidate: Candidate
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStar: () => void
  onConvertToPlacement: () => void
  canEdit: boolean
  canDelete: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="group relative bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-black/20 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:border-violet-500/30 dark:hover:border-violet-500/30">

      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <IconButton aria-label="More options" variant="ghost" size="sm" onClick={() => setMenuOpen(!menuOpen)} className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md">
            <MoreHorizontal className="w-4 h-4" />
          </IconButton>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 w-full h-full cursor-default bg-transparent border-none"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 z-20 bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden p-1 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => {
                    onView()
                    setMenuOpen(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  View Profile
                </button>
                {(candidate.status === 'Hired' || candidate.status === 'Offer') && (
                  <button
                    onClick={() => {
                      onConvertToPlacement()
                      setMenuOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    Create Placement
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      onEdit()
                      setMenuOpen(false)
                    }}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-slate-500" />
                    Edit
                  </button>
                )}
                {canDelete && (
                  <>
                    <div className="h-px bg-slate-200 dark:bg-slate-700/50 my-1 mx-2" />
                    <button
                      onClick={() => {
                        onDelete()
                        setMenuOpen(false)
                      }}
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

      <div className="flex items-start gap-3 mb-4">
        {/* Candidate Avatar (Symbol) */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-violet-500/30">
            {candidate.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          {candidate.isStarred && (
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
              <Star className="w-3 h-3 text-amber-500 fill-current" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={candidate.status} />
          </div>
          <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
            {candidate.name}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 mt-1">
            <Briefcase className="w-3.5 h-3.5" />
            <span className="font-medium truncate text-emerald-600 dark:text-emerald-400">{candidate.role}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          Source: {candidate.source}
        </span>
        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {new Date(candidate.appliedDate).toLocaleDateString('en-US')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-violet-500" />
            <span className="text-xs uppercase tracking-wide font-semibold">Location</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate" title={candidate.location}>{candidate.location}</p>
        </div>
        <div className="p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1">
            <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs uppercase tracking-wide font-semibold">Experience</span>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{candidate.experience} years</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-5">
        {candidate.skills.slice(0, 3).map((skill) => (
          <span key={skill.name} className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">{skill.name}</span>
        ))}
        {candidate.skills.length > 3 && (
          <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">+{candidate.skills.length - 3}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/50">
        <RatingStars rating={candidate.rating} />
        <button onClick={onView} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 flex items-center gap-1 group/btn">
          View Details <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}

export default function CandidatesPage() {
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('recent')

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null)
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // State now fetches from backend instead of using mock data
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [availableRequirements, setAvailableRequirements] = useState<Array<{ id: string; title: string; company: string; mmdId?: string }>>([])
  const [formData, setFormData] = useState<Candidate>(emptyForm)
  const [skillsInput, setSkillsInput] = useState('')
  const [selectedRequirementId, setSelectedRequirementId] = useState('')

  const role = (session?.user?.role as string | undefined) ?? 'RECRUITER'
  const hasSession = Boolean(session?.user)
  const isAdmin = (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any))
  const isCoordinator = role === 'COORDINATOR'
  const canCreateCandidate = hasSession && (isAdmin || isCoordinator || role === 'RECRUITER')
  const canEditCandidate = hasSession && (isAdmin || isCoordinator || role === 'RECRUITER')
  const canDeleteCandidate = hasSession && (isAdmin || isCoordinator)
  const canImportCandidates = hasSession && (isAdmin || isCoordinator)
  const recruiterStatusOptions = useMemo(() => ['Applied', 'Screening', 'Interview'] as Candidate['status'][], [])
  const allStatusOptions = useMemo(
    () => ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected'] as Candidate['status'][],
    []
  )
  const isPrivileged = isAdmin || isCoordinator

  // Fetch candidates from backend on mount and filter changes
  const fetchCandidates = async () => {
    setIsLoading(true)
    try {
      const statusToFetch = filterStatus !== 'all' ? reverseStatusMap[filterStatus as Candidate['status']] : undefined
      const result = await getCandidates({ status: statusToFetch })
      if (result.success && result.data) {
        const transformedCandidates = (result.data as BackendCandidate[]).map(transformCandidate)
        setCandidates(transformedCandidates)
      } else {
        toast.error('Failed to load candidates', result.error || 'Unknown error')
      }
    } catch (err) {
      toast.error('Error', 'Failed to fetch candidates')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch available requirements for the add candidate form
  const fetchRequirements = async () => {
    try {
      const result = await getRequirements({})
      if (result.success && result.data) {
        setAvailableRequirements(
          result.data.map((r: { _id?: string; id?: string; title?: string; jobTitle?: string; company?: string; mmdId?: string }) => ({
            id: r.id || r._id || '',
            title: r.jobTitle || r.title || 'Unknown Role',
            company: r.company || '',
            mmdId: r.mmdId,
          }))
        )
      }
    } catch {
      // Silent fail for requirements - form will work without it
    }
  }

  useEffect(() => {
    fetchCandidates()
    fetchRequirements()
  }, [filterStatus])

  const closeModal = () => {
    setIsAddModalOpen(false)
    setIsEditing(false)
    setFormData(emptyForm)
    setSkillsInput('')
    setSelectedRequirementId('')
  }


  const sources = useMemo(() => {
    const uniqueSources = [...new Set(candidates.map((c) => c.source))]
    return uniqueSources.sort()
  }, [candidates])

  const statusOptions = useMemo(() => {
    if (isPrivileged) return allStatusOptions
    return recruiterStatusOptions.includes(formData.status)
      ? recruiterStatusOptions
      : [formData.status, ...recruiterStatusOptions]
  }, [allStatusOptions, formData.status, isPrivileged, recruiterStatusOptions])

  const statusSelectDisabled = !isPrivileged && !recruiterStatusOptions.includes(formData.status)

  const filteredCandidates = useMemo(() => {
    let result = [...candidates]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.role.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.skills.some((s) => s.name.toLowerCase().includes(query))
      )
    }

    if (filterStatus !== 'all') {
      result = result.filter((c) => c.status === filterStatus)
    }

    if (filterSource !== 'all') {
      result = result.filter((c) => c.source === filterSource)
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'rating':
          return b.rating - a.rating
        case 'experience':
          return b.experience - a.experience
        case 'starred':
          return (b.isStarred ? 1 : 0) - (a.isStarred ? 1 : 0)
        case 'recent':
        default:
          return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
      }
    })

    return result
  }, [searchQuery, filterStatus, filterSource, sortBy, candidates])

  const statusCounts = useMemo(
    () => ({
      total: candidates.length,
      Applied: candidates.filter((c) => c.status === 'Applied').length,
      Screening: candidates.filter((c) => c.status === 'Screening').length,
      Interview: candidates.filter((c) => c.status === 'Interview').length,
      Offer: candidates.filter((c) => c.status === 'Offer').length,
      Hired: candidates.filter((c) => c.status === 'Hired').length,
      Rejected: candidates.filter((c) => c.status === 'Rejected').length,
    }),
    [candidates]
  )

  const handleView = (candidate: Candidate) => {
    setSelectedCandidate(candidate)
    setIsViewDrawerOpen(true)
  }

  const handleEdit = (candidate: Candidate) => {
    if (!canEditCandidate) {
      toast.error('Access Denied', 'You do not have permission to edit candidates')
      return
    }
    setSelectedCandidate(candidate)
    setFormData({ ...candidate })
    setSkillsInput(candidate.skills.map((s) => s.name).join(', '))
    setIsEditing(true)
    setIsAddModalOpen(true)
  }

  const handleStartAdd = () => {
    if (!canCreateCandidate) {
      toast.error('Access Denied', 'You do not have permission to add candidates')
      return
    }
    setFormData({ ...emptyForm, appliedDate: new Date().toISOString().slice(0, 10) })
    setSkillsInput('')
    setIsEditing(false)
    setIsAddModalOpen(true)
  }

  const handleDelete = (candidate: Candidate) => {
    if (!canDeleteCandidate) {
      toast.error('Access Denied', 'Only admins can delete candidates')
      return
    }
    setSelectedCandidate(candidate)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!canDeleteCandidate) {
      toast.error('Access Denied', 'Only admins and coordinators can delete candidates')
      setIsDeleteDialogOpen(false)
      return
    }

    if (selectedCandidate) {
      setIsSaving(true)
      try {
        const result = await deleteCandidate({ id: selectedCandidate.id })
        if (result.success) {
          setCandidates((prev) => prev.filter((c) => c.id !== selectedCandidate.id))
          toast.success('Candidate Removed', `${selectedCandidate.name} has been removed`)
          fetchCandidates()
        } else {
          toast.error('Delete Failed', result.error || 'Unknown error')
        }
      } catch {
        toast.error('Error', 'Failed to delete candidate')
      } finally {
        setIsSaving(false)
        setSelectedCandidate(null)
        setIsDeleteDialogOpen(false)
      }
    }
  }


  const handleToggleStar = (candidateId: string) => {
    setCandidates((prev) => prev.map((c) => (c.id === candidateId ? { ...c, isStarred: !c.isStarred } : c)))
  }

  const handleConvertToPlacement = (candidate: Candidate) => {
    if (candidate.requirementId) {
      router.push(`/dashboard/placements/new?candidateId=${candidate.id}&requirementId=${candidate.requirementId}`)
    } else {
      // Fallback if no requirement linked (should cover legacy data)
      router.push(`/dashboard/placements/new?candidateId=${candidate.id}`)
    }
  }

  const handleSubmit = async () => {
    if (!isEditing && !canCreateCandidate) {
      toast.error('Access Denied', 'You do not have permission to add candidates')
      return
    }

    if (isEditing && !canEditCandidate) {
      toast.error('Access Denied', 'You do not have permission to update candidates')
      return
    }

    const statusChanged = isEditing && selectedCandidate ? formData.status !== selectedCandidate.status : false

    if (!isPrivileged) {
      if (statusChanged && !recruiterStatusOptions.includes(formData.status)) {
        toast.error('Restricted Status', 'Recruiters can only set status to Applied, Screening, or Interview')
        return
      }
    }

    if (!formData.name || !formData.email) {
      toast.error('Missing Information', 'Name and email are required')
      return
    }

    if (!formData.phone) {
      toast.error('Missing Information', 'Phone number is required')
      return
    }

    // For new candidates, require a requirement to be selected
    if (!isEditing && !selectedRequirementId) {
      toast.error('Missing Information', 'Please select a requirement/position')
      return
    }

    const normalizedSkills = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    setIsSaving(true)

    try {
      if (isEditing && formData.id) {
        // Update existing candidate
        const result = await updateCandidate({
          id: formData.id,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          skills: normalizedSkills,
          yearsExperience: formData.experience,
          resumeUrl: formData.resumeUrl,
        })

        if (result.success && result.data) {
          let updatedCandidate = transformCandidate(result.data as unknown as BackendCandidate)
          let partialUpdateMessage: string | null = null

          if (statusChanged) {
            const backendStatus = reverseStatusMap[formData.status]
            const transition = buildStatusTransitionPayload(formData.id, backendStatus)

            if (transition.cancelled) {
              partialUpdateMessage = transition.message
            } else {
              const statusResult = await updateCandidateStatusAction(transition.payload)
              if (statusResult.success && statusResult.data) {
                updatedCandidate = transformCandidate(statusResult.data as unknown as BackendCandidate)
                const transitionWarning = (statusResult.data as { warning?: string } | undefined)?.warning
                if (transitionWarning) {
                  toast.error('Transition Warning', transitionWarning)
                }
              } else {
                partialUpdateMessage = statusResult.error || 'Candidate details saved but status update failed'
              }
            }
          }

          setCandidates((prev) => prev.map((c) => (c.id === formData.id ? updatedCandidate : c)))
          if (partialUpdateMessage) {
            toast.error('Partial Update', partialUpdateMessage)
          } else {
            toast.success('Candidate Updated', `${formData.name} has been updated`)
          }
          fetchCandidates()
          closeModal()
        } else {
          toast.error('Update Failed', result.error || 'Unknown error')
        }
      } else {
        // Create new candidate - requires a requirement to be selected
        const result = await addCandidateAction({
          requirementId: selectedRequirementId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          skills: normalizedSkills,
          yearsExperience: formData.experience,
          resumeUrl: formData.resumeUrl,
        })

        if (result.success && result.data) {
          // Refetch candidates to get the new one with populated requirement data
          await fetchCandidates()
          toast.success('Candidate Added', `${formData.name} added to pipeline`)
          closeModal()
        } else {
          toast.error('Create Failed', result.error || 'Unknown error')
        }
      }
    } catch {
      toast.error('Error', 'Failed to save candidate')
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <div className="space-y-8 p-4 md:p-8 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-violet-600 rounded-2xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative p-3.5 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-xl shadow-violet-500/20 transform group-hover:scale-105 transition-transform duration-300">
              <Users className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Candidates</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your talent pipeline</p>
          </div>
        </div>
        <div className="flex gap-3">
          {canImportCandidates && (
            <Button variant="secondary" leftIcon={<Upload className="w-4 h-4" />} className="bg-white hover:bg-slate-50 border-slate-200">
              Import CSV
            </Button>
          )}
          {canCreateCandidate && (
            <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />} onClick={handleStartAdd} className="shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all">
              Add Candidate
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: statusCounts.total, color: 'text-slate-800 dark:text-white', bg: 'bg-white/60 dark:bg-slate-800/60' },
          { label: 'Applied', value: statusCounts.Applied, color: 'text-blue-600', bg: 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30' },
          { label: 'Screening', value: statusCounts.Screening, color: 'text-amber-600', bg: 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30' },
          { label: 'Interview', value: statusCounts.Interview, color: 'text-violet-600', bg: 'bg-violet-50/50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-800/30' },
          { label: 'Offer', value: statusCounts.Offer, color: 'text-emerald-600', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' },
          { label: 'Hired', value: statusCounts.Hired, color: 'text-green-600', bg: 'bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-800/30' }
        ].map((stat, i) => (
          <div key={i} className={cn(
            "p-4 rounded-2xl backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300",
            stat.bg || 'bg-white/60 dark:bg-slate-800/60'
          )}>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.label}</p>
            <p className={cn("text-3xl font-extrabold tracking-tight", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-5 rounded-2xl border border-white/20 dark:border-slate-700/50 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full md:w-auto">
          <div className="relative">
            <SearchInput
              id="candidate-search"
              placeholder="Search candidates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              className="sm:w-80 shadow-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 rounded-xl"
            />
          </div>
          <Select
            id="candidate-status-filter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'Applied', label: 'Applied' },
              { value: 'Screening', label: 'Screening' },
              { value: 'Interview', label: 'Interview' },
              { value: 'Offer', label: 'Offer' },
              { value: 'Hired', label: 'Hired' },
              { value: 'Rejected', label: 'Rejected' },
            ]}
            className="sm:w-48 shadow-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 rounded-xl"
          />
          <Select
            id="candidate-source-filter"
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            options={[
              { value: 'all', label: 'All Sources' },
              ...sources.map((s) => ({ value: s, label: s })),
            ]}
            className="sm:w-48 shadow-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
          <Select
            id="candidate-sort-by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'recent', label: 'Most Recent' },
              { value: 'name', label: 'By Name' },
              { value: 'rating', label: 'By Rating' },
              { value: 'experience', label: 'By Experience' },
              { value: 'starred', label: 'Starred First' },
            ]}
            className="sm:w-48 shadow-sm border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 rounded-xl"
          />
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-20">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
            <div className="absolute top-0 left-0 w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
          </div>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-16 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No candidates found</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
            We couldn't find any candidates matching your filters. Try adjusting criteria or add a new candidate.
          </p>
          {canCreateCandidate && (
            <Button variant="gradient" onClick={handleStartAdd}>
              Add Candidate
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {filteredCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onView={() => handleView(candidate)}
              onEdit={() => handleEdit(candidate)}
              onDelete={() => handleDelete(candidate)}
              onToggleStar={() => handleToggleStar(candidate.id)}
              onConvertToPlacement={() => handleConvertToPlacement(candidate)}
              canEdit={canEditCandidate}
              canDelete={canDeleteCandidate}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Candidate"
        message={`Are you sure you want to delete ${selectedCandidate?.name}? This action cannot be undone.`}
        confirmText={isSaving ? 'Deleting...' : 'Delete'}
        variant="danger"
      />

      {/* View Details Modal */}
      <Modal
        isOpen={isViewDrawerOpen}
        onClose={() => setIsViewDrawerOpen(false)}
        title="Candidate Profile Details"
        size="lg"
      >
        {selectedCandidate && (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-violet-500/30">
                  {selectedCandidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedCandidate.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedCandidate.status} />
                    {selectedCandidate.isStarred && <Star className="w-4 h-4 text-amber-500 fill-current" />}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{selectedCandidate.role}</p>
                <p className="text-xs text-slate-600 mt-1">Applied: {new Date(selectedCandidate.appliedDate).toLocaleDateString('en-US')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 border border-slate-100 dark:border-slate-700/50">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700/50">Contact Info</h4>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <a href={`mailto:${selectedCandidate.email}`} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{selectedCandidate.email}</a>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <a href={`tel:${selectedCandidate.phone}`} className="hover:text-violet-600 dark:hover:text-violet-400 transition-colors">{selectedCandidate.phone}</a>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{selectedCandidate.location}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3 border border-slate-100 dark:border-slate-700/50">
                <h4 className="font-semibold text-sm text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-slate-700/50">Professional Details</h4>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span>{selectedCandidate.experience} Years Experience</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span className="w-4 h-4 flex items-center justify-center text-slate-400 tracking-tighter text-[10px] font-bold border border-slate-300 dark:border-slate-600 rounded">SRC</span>
                  <span>Source: {selectedCandidate.source}</span>
                </div>
                {selectedCandidate.resumeUrl && (
                  <div className="flex items-center gap-2 text-sm pt-1">
                    <FileText className="w-4 h-4 text-violet-500" />
                    <a href={selectedCandidate.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline font-medium">View Resume Document</a>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-3">Skills & Attributes</h4>
              <div className="flex flex-wrap gap-2">
                {selectedCandidate.skills.map(skill => (
                  <span key={skill.name} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {skill.name}
                  </span>
                ))}
                {selectedCandidate.skills.length === 0 && (
                  <span className="text-sm text-slate-400 italic">No specific skills listed.</span>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeModal}
        title={isEditing ? 'Edit Candidate' : 'Add New Candidate'}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                Personal Information
              </h4>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-modern w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="input-modern w-full"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="input-modern w-full"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  className="input-modern w-full"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, Country"
                  readOnly // Location mostly comes from the requirement
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                Professional Details
              </h4>

              {!isEditing && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Requirement / Position <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={selectedRequirementId}
                    onChange={(e) => setSelectedRequirementId(e.target.value)}
                    options={[
                      { label: 'Select Requirement', value: '' },
                      ...availableRequirements.map(r => ({ label: `${r.mmdId ? `${r.mmdId} • ` : ''}${r.title} (${r.company})`, value: r.id }))
                    ]}
                    className="w-full"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="input-modern w-full"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  options={statusOptions.map((s) => ({ value: s, label: s }))}
                  disabled={statusSelectDisabled}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Resume URL (Optional)
                </label>
                <input
                  type="text"
                  className="input-modern w-full"
                  value={formData.resumeUrl || ''}
                  onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Skills (comma separated)
            </label>
            <input
              type="text"
              className="input-modern w-full"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              placeholder="e.g. React, TypeScript, Node.js, AWS"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="ghost" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSubmit} isLoading={isSaving} leftIcon={isSaving ? undefined : <CheckCircle2 className="w-4 h-4" />}>
              {isEditing ? 'Save Changes' : 'Add Candidate'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
