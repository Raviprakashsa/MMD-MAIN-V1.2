import { z } from 'zod'

// Strict RFC 5322-ish email regex
const strictEmailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const passwordSpecialChar = /[!@#$%^&*(),.?":{}|<>_-]/

// ============================================
// USER VALIDATION
// ============================================

export const UserRoleSchema = z.enum(['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER', 'SCRAPER'])

export const CreateUserSchema = z.object({
  email: z.string().regex(strictEmailRegex, 'Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(passwordSpecialChar, 'Password must contain at least one special character'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: UserRoleSchema,
})

export const UpdateUserSchema = CreateUserSchema.partial().extend({
  id: z.string().uuid(),
})

export const LoginSchema = z.object({
  email: z.string().regex(strictEmailRegex, 'Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

// ============================================
// MMD-ID VALIDATION
// ============================================

export const MmdIdSchema = z.string().regex(
  /^REQ-\d{2}-[A-Z]{2,3}-\d{3}$/,
  'Invalid requirement ID format. Expected: REQ-{YY}-{SECTOR}-{SEQUENCE}'
)

// ============================================
// COMMON SCHEMAS
// ============================================

export const UuidSchema = z.string().uuid('Invalid UUID format')

export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export const DateRangeSchema = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
})

// ============================================
// COMPANY VALIDATION (Module 3)
// ============================================

export const SectorSchema = z.enum(['IT', 'NON_IT', 'CORE', 'STARTUP', 'ENTERPRISE'])
export const HiringTypeSchema = z.enum(['PERMANENT', 'INTERNSHIP', 'CONTRACT'])
export const LeadSourceSchema = z.enum(['SCRAPING', 'LEAD', 'EVENT', 'REFERRAL'])
export const MouStatusSchema = z.enum(['NOT_STARTED', 'IN_PROGRESS', 'SIGNED'])

export const HRContactSchema = z.object({
  name: z.string().min(2, 'Contact name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  linkedIn: z.string().url().optional(),
  designation: z.string().optional(),
  isPrimary: z.boolean().default(false),
})

const companyBusinessRules = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((data: any, ctx) => {
    // For creates, hrContacts defaults to [], for updates hrContacts may be omitted. Only validate when provided.
    if (data.hrContacts !== undefined) {
      if (data.hrContacts.length < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'At least one HR contact is required', path: ['hrContacts'] })
      }

      const primary = data.hrContacts.find((c: any) => c.isPrimary)
      if (!primary) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mark one HR contact as Primary', path: ['hrContacts'] })
      }

      data.hrContacts.forEach((contact: any, index: number) => {
        if (!contact.phone && !contact.email) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Provide phone or email for each HR contact',
            path: ['hrContacts', index],
          })
        }
      })
    }

    // If MOU is signed, contract metadata must be present
    if (data.mouStatus === 'SIGNED') {
      if (!data.mouDocumentUrl) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MOU document URL is required when status is SIGNED', path: ['mouDocumentUrl'] })
      }
      if (!data.mouStartDate || !data.mouEndDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MOU start and end dates are required when status is SIGNED', path: ['mouStartDate'] })
      } else if (data.mouStartDate >= data.mouEndDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'MOU end date must be after start date', path: ['mouEndDate'] })
      }
      if (data.commercialPercent === undefined || data.commercialPercent === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Commercial percent is required when status is SIGNED', path: ['commercialPercent'] })
      }
    }
  })

export const CompanyCoreSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category: z.string().min(2, 'Category is required'),
  sector: SectorSchema,
  location: z.string().min(2, 'Location is required'),
  website: z.string().url().optional(),
  hiringType: HiringTypeSchema,
  source: LeadSourceSchema,
  mouStatus: MouStatusSchema.default('NOT_STARTED'),
  mouDocumentUrl: z.string().url().optional(),
  mouStartDate: z.date().optional(),
  mouEndDate: z.date().optional(),
  commercialPercent: z.number().nonnegative().max(100).optional(),
  paymentTerms: z.string().optional(),
  assignedCoordinatorId: z.string().min(1, 'Assigned coordinator is required'),
  hrContacts: z.array(HRContactSchema).default([]),
})

export const CompanySchema = companyBusinessRules(CompanyCoreSchema)
export const CompanyUpdateSchema = companyBusinessRules(CompanyCoreSchema.partial())
export const CompanyUpdateWithIdSchema = companyBusinessRules(CompanyCoreSchema.partial().extend({ id: z.string().min(1) }))

// ============================================
// REQUIREMENT VALIDATION (Module 4)
// ============================================

export const GroupSchema = z.enum(['RASHMI', 'MANJUNATH', 'SCRAPING', 'LEADS'])

export const WorkModeSchema = z.enum(['REMOTE', 'HYBRID', 'ONSITE'])

export const RequirementStatusSchema = z.enum([
  'PENDING_INTAKE',
  'AWAITING_JD',
  'ACTIVE',
  'SOURCING',
  'INTERVIEWING',
  'OFFER',
  'CLOSED_HIRED',
  'CLOSED_NOT_HIRED',
  'ON_HOLD',
])

export const RequirementPrioritySchema = z.enum(['High', 'Medium', 'Low'])

export const RequirementSchema = z
  .object({
    companyId: z.string().min(1, 'Company is required'),
    jobTitle: z.string().min(3, 'Job title must be at least 3 characters'),
    fullDescription: z.string().min(50, 'Full description must be at least 50 characters'),
    skills: z.array(z.string().min(1)).min(1, 'At least one skill is required'),
    experienceMin: z.number().int().nonnegative(),
    experienceMax: z.number().int().positive(),
    salaryMin: z.number().nonnegative().optional(),
    salaryMax: z.number().nonnegative().optional(),
    openings: z.number().int().positive().default(1),
    workMode: WorkModeSchema,
    location: z.string().min(2, 'Location is required'),
    interviewClosingDate: z.date().optional(),
    priority: RequirementPrioritySchema.default('Medium'),
    group: GroupSchema,
    accountOwnerId: z.string().min(1, 'Account owner is required'),
    status: RequirementStatusSchema.default('PENDING_INTAKE'),
    applicationFormId: z.string().optional(),
    whatsAppMessage: z.string().optional(),
    emailMessage: z.string().optional(),
    linkedInPost: z.string().optional(),
    comment: z.string().optional(),
  })
  .refine((data) => data.experienceMin < data.experienceMax, {
    message: 'Minimum experience must be less than maximum experience',
    path: ['experienceMin'],
  })
  .refine(
    (data) => !data.interviewClosingDate || data.interviewClosingDate > new Date(),
    {
      message: 'Interview closing date must be in the future',
      path: ['interviewClosingDate'],
    }
  )

// ============================================
// PLACEMENT VALIDATION (Module 8)
// ============================================

export const PlacementStatusSchema = z.enum([
  'OFFERED',
  'ACCEPTED',
  'JOINED',
  'BACKED_OUT',
  'INVOICE_SENT',
  'PAID',
])

export const PlacementSchema = z.object({
  requirementId: z.string().min(1),
  candidateId: z.string().min(1),
  companyId: z.string().min(1),
  status: PlacementStatusSchema.default('OFFERED'),
  offerDate: z.date().optional(),
  joiningDate: z.date().optional(),
  feeAmount: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  invoiceNumber: z.string().optional(),
  invoiceUrl: z.string().url().optional(),
  paymentReceivedAt: z.date().optional(),
  backoutReason: z.string().optional(),
  notes: z.string().optional(),
})

// ============================================
// DOCUMENT MANAGEMENT (Module 9)
// ============================================

export const DocumentEntitySchema = z.enum(['Company', 'Requirement', 'Candidate', 'Placement', 'CommunicationThread'])

export const DocumentSchema = z.object({
  entityType: DocumentEntitySchema,
  entityId: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  category: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().nonnegative().optional(),
  tags: z.array(z.string().min(1)).optional(),
})

// ============================================
// COMMUNICATION HUB (Module 10)
// ============================================

export const CommunicationEntitySchema = z.enum(['Company', 'Requirement', 'Candidate', 'Placement'])
export const CommunicationChannelSchema = z.enum(['EMAIL', 'WHATSAPP', 'CALL', 'NOTE'])
export const MessageDirectionSchema = z.enum(['INBOUND', 'OUTBOUND'])

export const CommunicationThreadSchema = z.object({
  entityType: CommunicationEntitySchema,
  entityId: z.string().min(1),
  subject: z.string().min(3),
  participantIds: z.array(z.string().min(1)).default([]),
})

export const CommunicationMessageSchema = z.object({
  threadId: z.string().min(1),
  channel: CommunicationChannelSchema,
  direction: MessageDirectionSchema,
  body: z.string().min(1),
  metadata: z.record(z.any()).optional(),
})

// ============================================
// ANALYTICS & REPORTING (Modules 11-12)
// ============================================

export const AnalyticsEventSchema = z.object({
  metric: z.string().min(1),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  value: z.number().optional(),
  occurredAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
})

export const ReportFrequencySchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY'])

export const ReportScheduleSchema = z.object({
  name: z.string().min(2),
  reportType: z.string().min(2),
  frequency: ReportFrequencySchema,
  recipients: z.array(z.string().email()).min(1),
  filters: z.record(z.any()).optional(),
  isActive: z.boolean().default(true),
})

// ============================================
// LEADS & SCRAPING (Module 9)
// ============================================

export const LeadStatusSchema = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'REJECTED', 'STALLED'])
export const ActivityTypeSchema = z.enum(['call', 'whatsapp', 'email', 'meeting', 'note'])

export const LeadActivitySchema = z.object({
  type: ActivityTypeSchema,
  summary: z.string().min(2, 'Summary is required'),
  outcome: z.string().min(2, 'Outcome is required'),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  nextFollowUp: z.string().optional(),
})

export const LeadSchema = z.object({
  sourcePlatform: z.string().min(2, 'Source platform is required'),
  companyName: z.string().min(2, 'Company name is required'),
  sector: SectorSchema,
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email('Invalid email address').or(z.literal('')).optional(),
  contactLinkedIn: z.string().optional(),
  confidenceScore: z.number().int().min(1).max(100),
  notes: z.string().optional(),
  status: LeadStatusSchema.default('NEW'),
  followUpDate: z.string().optional(),
  assignedTo: z.string().optional(),
})

export const AddLeadActivitySchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  activity: LeadActivitySchema,
})

// ============================================
// TIMESHEETS (Module 10)
// ============================================

export const WorkTypeSchema = z.enum([
  'JD Creation',
  'Sourcing',
  'Screening',
  'Interview Coordination',
  'Client Follow-up',
  'Database Update',
  'Administrative',
])

export const TimesheetSchema = z.object({
  date: z.date(),
  requirementId: z.string().optional(),
  workType: WorkTypeSchema,
  description: z.string().min(5),
  hours: z.number().positive().max(12),
})

export const TimesheetRangeSchema = z.object({
  userId: z.string().optional(),
  weekStart: z.date(),
})

export const TimesheetAdminReportSchema = z.object({
  start: z.date(),
  end: z.date(),
  groupBy: z.enum(['user', 'requirement']),
})

// ============================================
// EMAIL TEMPLATE LIBRARY (Module 11)
// ============================================

export const TemplateSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  subject: z.string().optional(),
  body: z.string().min(1),
  isPublic: z.boolean().default(true),
})

// ============================================
// INTEGRATIONS & EXPORT (Modules 13 & 15)
// ============================================

export const IntegrationProviderSchema = z.enum(['JOB_BOARD', 'ATS', 'WEBHOOK', 'EXPORT'])

export const IntegrationConfigSchema = z.object({
  name: z.string().min(2),
  provider: IntegrationProviderSchema,
  isActive: z.boolean().default(true),
  config: z.record(z.any()),
})

export const ExportFormatSchema = z.enum(['CSV', 'JSON', 'XLSX'])
export const ExportStatusSchema = z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER'])

export const ExportJobSchema = z.object({
  entityType: z.string().min(1),
  format: ExportFormatSchema,
  filter: z.record(z.any()).optional(),
})
