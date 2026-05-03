// Lead Types for MMDSS Leads Management Module
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'FOLLOW_UP' | 'CONVERTED' | 'REJECTED' | 'STALLED'
export type ActivityType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'note'
export type LeadSector = 'IT' | 'NON_IT' | 'CORE' | 'STARTUP' | 'ENTERPRISE'

export interface LeadActivity {
  _id: string
  type: ActivityType
  summary: string
  outcome: string
  date: string
  time: string
  createdBy: string
  createdByName?: string
  nextFollowUp?: string
}

export interface Lead {
  _id: string
  sourcePlatform: string
  companyName: string
  sector: LeadSector
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  contactLinkedIn?: string
  confidenceScore: number
  notes?: string
  status: LeadStatus
  convertedToCompanyId?: string
  convertedAt?: string
  convertedBy?: string
  assignedTo?: string
  assignedToName?: string
  followUpDate?: string
  lastActivityDate?: string
  activities: LeadActivity[]
  isOverdue?: boolean
  daysSinceCreated?: number
  createdBy?: string
  createdByName?: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

export interface LeadMetrics {
  total: number
  converted: number
  conversionRate: number
  followUpsDue: number
  overdue: number
  avgConfidence: number
  byStatus: Record<LeadStatus, number>
  bySource: { name: string; value: number }[]
  avgDaysToContact: number
  avgDaysToConvert: number
}

export interface LeadFilters {
  search: string
  status: LeadStatus | 'all'
  sector: LeadSector | 'all'
  source: string
  showOverdueOnly: boolean
}

export const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  NEW: { label: 'New', color: 'text-blue-800', bgColor: 'bg-blue-600' },
  CONTACTED: { label: 'Contacted', color: 'text-purple-800', bgColor: 'bg-purple-600' },
  QUALIFIED: { label: 'Qualified', color: 'text-indigo-800', bgColor: 'bg-indigo-600' },
  FOLLOW_UP: { label: 'Follow-up', color: 'text-orange-900', bgColor: 'bg-orange-600' },
  CONVERTED: { label: 'Converted', color: 'text-green-800', bgColor: 'bg-green-600' },
  REJECTED: { label: 'Rejected', color: 'text-red-800', bgColor: 'bg-red-600' },
  STALLED: { label: 'Stalled', color: 'text-amber-900', bgColor: 'bg-amber-600' },
}

export const CONFIDENCE_CONFIG = {
  high: { min: 80, label: 'High', color: 'text-green-800', bgColor: 'bg-green-600' },
  medium: { min: 60, label: 'Medium', color: 'text-amber-900', bgColor: 'bg-amber-600' },
  low: { min: 0, label: 'Low', color: 'text-red-800', bgColor: 'bg-red-600' },
}

export const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
]

export const SOURCE_PLATFORMS = [
  'LinkedIn',
  'Company Website',
  'Job Portal Scraping',
  'Referral',
  'Event',
  'Cold Outreach',
  'Naukri',
  'Indeed',
  'Instagram',
]

export const SECTORS: { value: LeadSector; label: string }[] = [
  { value: 'IT', label: 'IT' },
  { value: 'NON_IT', label: 'Non-IT' },
  { value: 'CORE', label: 'Core' },
  { value: 'STARTUP', label: 'Startup' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
]
