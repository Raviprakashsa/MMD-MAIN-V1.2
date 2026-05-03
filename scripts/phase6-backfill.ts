#!/usr/bin/env node

/**
 * Phase 6.1 data migration/backfill utility.
 *
 * Default mode is dry-run (no writes).
 * Use --apply to persist fixes.
 *
 * Usage:
 *   npx tsx scripts/phase6-backfill.ts
 *   npx tsx scripts/phase6-backfill.ts --scope=invoices
 *   npx tsx scripts/phase6-backfill.ts --scope=requirements --apply
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import connectDB from '../lib/db/mongodb'
import Company from '../lib/db/models/Company'
import Invoice, { type InvoiceStatus } from '../lib/db/models/Invoice'
import Requirement, { type Group, type RequirementStatus, type WorkMode } from '../lib/db/models/Requirement'
import { formatMmdId, getRequirementIdPrefix } from '../lib/utils'

type Scope = 'all' | 'invoices' | 'requirements'

interface MutationPreview {
  id: string
  notes: string[]
  set: Record<string, unknown>
  unset: string[]
}

interface BackfillSummary {
  name: string
  scanned: number
  mutated: number
  manualReview: number
  previews: MutationPreview[]
}

const REQUIREMENT_ID_REGEX = /^REQ-\d{2}-[A-Z]{2,3}-\d{3}$/
const LEGACY_MMD_ID_REGEX = /^MMD-(?:[A-Z]+-\d{8}-\d{3}|\d{6,})$/
const INVOICE_NUMBER_REGEX = /^INV-(\d{4})-(\d{5})$/
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/

const CANONICAL_REQUIREMENT_STATUSES: RequirementStatus[] = [
  'PENDING_INTAKE',
  'AWAITING_JD',
  'ACTIVE',
  'SOURCING',
  'INTERVIEWING',
  'OFFER',
  'CLOSED_HIRED',
  'CLOSED_NOT_HIRED',
  'ON_HOLD',
]

const CANONICAL_GROUPS: Group[] = ['RASHMI', 'MANJUNATH', 'SCRAPING', 'LEADS']
const CANONICAL_WORK_MODES: WorkMode[] = ['REMOTE', 'HYBRID', 'ONSITE']

function loadLocalEnv(): void {
  const envPath = join(process.cwd(), '.env')
  const envRegex = /^([^=:#]+)=(.*)$/

  try {
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return

      const match = envRegex.exec(trimmed)
      if (!match) return

      const key = match[1].trim()
      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (!process.env[key]) {
        process.env[key] = value
      }
    })
  } catch {
    // Local .env is optional when env vars are already exported.
  }
}

function parseScope(args: string[]): Scope {
  const scopeArg = args.find((arg) => arg.startsWith('--scope='))
  const raw = scopeArg ? scopeArg.split('=')[1] : 'all'
  if (raw === 'all' || raw === 'invoices' || raw === 'requirements') {
    return raw
  }
  throw new Error(`Invalid scope "${raw}". Allowed: all | invoices | requirements`)
}

function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_REGEX.test(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toIdString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const converted = String(value)
    if (converted && converted !== '[object Object]') {
      return converted
    }
  }
  return ''
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  return null
}

function toNonNegativeInt(value: unknown, fallback: number): number {
  const num = asNumber(value)
  if (num === null) return fallback
  if (num < 0) return fallback
  return Math.floor(num)
}

function toPositiveInt(value: unknown, fallback: number): number {
  const num = asNumber(value)
  if (num === null) return fallback
  const normalized = Math.floor(num)
  return normalized > 0 ? normalized : fallback
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeInvoiceStatus(value: unknown): InvoiceStatus {
  const status = asString(value).toUpperCase()
  if (status === 'DRAFT' || status === 'SENT' || status === 'PAID' || status === 'VOID') {
    return status as InvoiceStatus
  }
  if (status === 'OVERDUE') return 'SENT'
  if (status === 'CANCELLED') return 'VOID'
  return 'DRAFT'
}

function normalizeRequirementStatus(value: unknown): RequirementStatus {
  const status = asString(value).toUpperCase()
  if (CANONICAL_REQUIREMENT_STATUSES.includes(status as RequirementStatus)) {
    return status as RequirementStatus
  }

  if (status === 'FILLED') return 'CLOSED_HIRED'
  if (status === 'CANCELLED' || status === 'CLOSED') return 'CLOSED_NOT_HIRED'
  if (status === 'HOLD' || status === 'ONHOLD') return 'ON_HOLD'
  if (status === 'OPEN') return 'ACTIVE'

  return 'ACTIVE'
}

function normalizeGroup(value: unknown): Group {
  const group = asString(value).toUpperCase()
  if (CANONICAL_GROUPS.includes(group as Group)) {
    return group as Group
  }
  return 'LEADS'
}

function normalizeWorkMode(workMode: unknown, locationType: unknown): WorkMode {
  const normalizedWorkMode = asString(workMode).toUpperCase()
  if (CANONICAL_WORK_MODES.includes(normalizedWorkMode as WorkMode)) {
    return normalizedWorkMode as WorkMode
  }

  const normalizedLocationType = asString(locationType).trim().toLowerCase()
  if (normalizedLocationType === 'hybrid') return 'HYBRID'
  if (normalizedLocationType === 'onsite' || normalizedLocationType === 'on-site') return 'ONSITE'
  return 'REMOTE'
}

function normalizeInvoiceNumber(value: unknown): string {
  return asString(value).trim().toUpperCase()
}

function buildRequirementDescription(input: {
  title: string
  companyName: string
  location: string
  existingDescription: string
}): string {
  const trimmedExisting = input.existingDescription.trim()
  if (trimmedExisting.length >= 50) {
    return trimmedExisting
  }

  const fallback = [
    `Requirement for ${input.title} at ${input.companyName || 'the selected company'}.`,
    `Location: ${input.location || 'To be confirmed'}.`,
    trimmedExisting,
    'Core hiring details were backfilled during Phase 6 migration.',
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (fallback.length >= 50) {
    return fallback
  }

  return `${fallback} Additional hiring notes will be completed by the operations team.`.trim()
}

function nextInvoiceNumber(year: number, used: Set<string>, yearCounters: Map<number, number>): string {
  let cursor = yearCounters.get(year) ?? 0
  let invoiceNumber = ''

  do {
    cursor += 1
    invoiceNumber = `INV-${year}-${String(cursor).padStart(5, '0')}`
  } while (used.has(invoiceNumber))

  used.add(invoiceNumber)
  yearCounters.set(year, cursor)
  return invoiceNumber
}

function nextRequirementId(
  sector: string,
  date: Date,
  usedIds: Set<string>,
  prefixCounters: Map<string, number>
): string {
  const prefix = getRequirementIdPrefix(sector, date)
  let cursor = prefixCounters.get(prefix) ?? 0
  let mmdId = ''

  do {
    cursor += 1
    mmdId = formatMmdId(sector, date, cursor)
  } while (usedIds.has(mmdId))

  prefixCounters.set(prefix, cursor)
  usedIds.add(mmdId)
  return mmdId
}

async function backfillInvoices(apply: boolean): Promise<BackfillSummary> {
  const docs = await Invoice.find({})
    .sort({ createdAt: 1, _id: 1 })
    .select('_id invoiceNumber issueDate dueDate status createdAt updatedAt')
    .lean()

  const usedNumbers = new Set<string>()
  const keptDocIds = new Set<string>()
  const yearCounters = new Map<number, number>()

  for (const doc of docs) {
    const id = doc._id.toString()
    const number = normalizeInvoiceNumber(doc.invoiceNumber)
    const match = INVOICE_NUMBER_REGEX.exec(number)
    if (!match) continue
    if (usedNumbers.has(number)) continue

    keptDocIds.add(id)
    usedNumbers.add(number)

    const year = Number.parseInt(match[1], 10)
    const sequence = Number.parseInt(match[2], 10)
    const currentMax = yearCounters.get(year) ?? 0
    yearCounters.set(year, Math.max(currentMax, sequence))
  }

  const summary: BackfillSummary = {
    name: 'invoices',
    scanned: docs.length,
    mutated: 0,
    manualReview: 0,
    previews: [],
  }

  for (const doc of docs) {
    const id = doc._id.toString()
    const set: Record<string, unknown> = {}
    const unset: string[] = []
    const notes: string[] = []

    const rawStatus = asString(doc.status)
    const normalizedStatus = normalizeInvoiceStatus(rawStatus)
    if (rawStatus !== normalizedStatus) {
      set.status = normalizedStatus
      notes.push(`status: ${rawStatus || 'missing'} -> ${normalizedStatus}`)
    }

    const issueDate = asDate(doc.issueDate) || asDate(doc.createdAt) || asDate(doc.updatedAt) || new Date()
    if (!asDate(doc.issueDate) || issueDate.getTime() !== asDate(doc.issueDate)?.getTime()) {
      set.issueDate = issueDate
      notes.push('issueDate backfilled')
    }

    let dueDate = asDate(doc.dueDate)
    if (!dueDate || dueDate < issueDate) {
      dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      set.dueDate = dueDate
      notes.push('dueDate normalized to issueDate + 30 days')
    }

    const normalizedNumber = normalizeInvoiceNumber(doc.invoiceNumber)
    const hasReusableNumber =
      Boolean(INVOICE_NUMBER_REGEX.exec(normalizedNumber)) &&
      keptDocIds.has(id)

    if (!hasReusableNumber) {
      const year = issueDate.getUTCFullYear()
      const generatedNumber = nextInvoiceNumber(year, usedNumbers, yearCounters)
      set.invoiceNumber = generatedNumber
      notes.push(`invoiceNumber generated: ${generatedNumber}`)
    } else if (normalizedNumber !== asString(doc.invoiceNumber)) {
      set.invoiceNumber = normalizedNumber
      notes.push('invoiceNumber normalized to canonical format')
    }

    if (Object.keys(set).length === 0 && unset.length === 0) {
      continue
    }

    summary.mutated += 1

    if (summary.previews.length < 12) {
      summary.previews.push({ id, notes, set, unset })
    }

    if (apply) {
      const updatePayload: { $set?: Record<string, unknown>; $unset?: Record<string, 1> } = {}
      if (Object.keys(set).length > 0) updatePayload.$set = set
      if (unset.length > 0) {
        updatePayload.$unset = Object.fromEntries(unset.map((field) => [field, 1]))
      }
      await Invoice.updateOne({ _id: doc._id }, updatePayload)
    }
  }

  return summary
}

async function backfillRequirements(apply: boolean): Promise<BackfillSummary> {
  const docs = await Requirement.find({})
    .sort({ createdAt: 1, _id: 1 })
    .select([
      '_id',
      'mmdId',
      'companyId',
      'jobTitle',
      'title',
      'fullDescription',
      'description',
      'skills',
      'experienceMin',
      'experienceMax',
      'openings',
      'workMode',
      'locationType',
      'location',
      'group',
      'status',
      'accountOwnerId',
      'interviewClosingDate',
      'createdAt',
    ].join(' '))
    .lean()

  const companyIds = Array.from(
    new Set(
      docs
        .map((doc) => toIdString(doc.companyId))
        .filter((value) => isObjectId(value))
    )
  )

  const companies = companyIds.length
    ? await Company.find({ _id: { $in: companyIds } }).select('_id name sector').lean()
    : []
  const companyMap = new Map(companies.map((company) => [company._id.toString(), company]))

  const usedIds = new Set<string>()
  const keptDocIds = new Set<string>()
  const prefixCounters = new Map<string, number>()

  for (const doc of docs) {
    const id = doc._id.toString()
    const raw = asString(doc.mmdId).trim().toUpperCase()
    if (!REQUIREMENT_ID_REGEX.test(raw)) continue
    if (usedIds.has(raw)) continue

    keptDocIds.add(id)
    usedIds.add(raw)

    const [prefix, sequenceToken] = raw.split(/-(?=[^-]+$)/)
    const sequence = Number.parseInt(sequenceToken, 10)
    const currentMax = prefixCounters.get(prefix) ?? 0
    prefixCounters.set(prefix, Math.max(currentMax, sequence))
  }

  const summary: BackfillSummary = {
    name: 'requirements',
    scanned: docs.length,
    mutated: 0,
    manualReview: 0,
    previews: [],
  }

  for (const doc of docs) {
    const id = doc._id.toString()
    const set: Record<string, unknown> = {}
    const unset: string[] = []
    const notes: string[] = []
    let requiresManualReview = false

    const companyId = toIdString(doc.companyId)
    const company = isObjectId(companyId) ? companyMap.get(companyId) : undefined
    if (!company) {
      requiresManualReview = true
      notes.push('manual-review: companyId is missing/invalid or company record does not exist')
    }

    const ownerId = toIdString(doc.accountOwnerId)
    if (!isObjectId(ownerId)) {
      requiresManualReview = true
      notes.push('manual-review: accountOwnerId is missing/invalid')
    }

    const currentJobTitle = asString(doc.jobTitle)
    const fallbackJobTitle = asString((doc as Record<string, unknown>).title)
    const normalizedJobTitle = currentJobTitle || fallbackJobTitle || 'Untitled Requirement'
    if (normalizedJobTitle !== currentJobTitle) {
      set.jobTitle = normalizedJobTitle
      notes.push('jobTitle backfilled from legacy title or fallback')
    }

    const location = asString(doc.location) || 'Remote'
    if (location !== asString(doc.location)) {
      set.location = location
      notes.push('location backfilled')
    }

    const normalizedGroup = normalizeGroup(doc.group)
    if (normalizedGroup !== asString(doc.group)) {
      set.group = normalizedGroup
      notes.push(`group normalized to ${normalizedGroup}`)
    }

    const normalizedStatus = normalizeRequirementStatus(doc.status)
    if (normalizedStatus !== asString(doc.status)) {
      set.status = normalizedStatus
      notes.push(`status normalized to ${normalizedStatus}`)
    }

    const normalizedWorkMode = normalizeWorkMode(doc.workMode, (doc as Record<string, unknown>).locationType)
    if (normalizedWorkMode !== asString(doc.workMode)) {
      set.workMode = normalizedWorkMode
      notes.push(`workMode normalized to ${normalizedWorkMode}`)
    }

    const experienceMin = toNonNegativeInt(doc.experienceMin, 0)
    const rawExperienceMin = asNumber(doc.experienceMin)
    let experienceMax = toPositiveInt(doc.experienceMax, Math.max(experienceMin + 1, 1))
    const rawExperienceMax = asNumber(doc.experienceMax)
    const rawExperienceMaxInt = rawExperienceMax === null ? null : Math.floor(rawExperienceMax)
    if (experienceMax <= experienceMin) {
      experienceMax = experienceMin + 1
    }

    if (
      rawExperienceMin === null ||
      rawExperienceMin < 0 ||
      Math.floor(rawExperienceMin) !== experienceMin
    ) {
      set.experienceMin = experienceMin
      notes.push('experienceMin normalized')
    }

    if (
      rawExperienceMax === null ||
      rawExperienceMax <= 0 ||
      rawExperienceMaxInt !== experienceMax ||
      experienceMax <= experienceMin
    ) {
      set.experienceMax = experienceMax
      notes.push('experienceMax normalized')
    }

    const openings = toPositiveInt(doc.openings, 1)
    if (openings !== asNumber(doc.openings)) {
      set.openings = openings
      notes.push('openings normalized to positive integer')
    }

    const normalizedSkills = toStringArray(doc.skills)
    const skills = normalizedSkills.length > 0 ? normalizedSkills : ['General Hiring']
    const existingSkills = toStringArray(doc.skills)
    if (existingSkills.length === 0 || skills.join('|') !== existingSkills.join('|')) {
      set.skills = skills
      notes.push('skills normalized')
    }

    const fullDescription = buildRequirementDescription({
      title: normalizedJobTitle,
      companyName: company?.name || 'the selected company',
      location,
      existingDescription:
        asString(doc.fullDescription) ||
        asString((doc as Record<string, unknown>).description),
    })

    if (fullDescription !== asString(doc.fullDescription)) {
      set.fullDescription = fullDescription
      notes.push('fullDescription backfilled/normalized')
    }

    const rawMmdId = asString(doc.mmdId).trim().toUpperCase()
    const hasReusableId =
      REQUIREMENT_ID_REGEX.test(rawMmdId) &&
      keptDocIds.has(id)

    if (!hasReusableId) {
      if (company?.sector) {
        const createdAt = asDate(doc.createdAt) || new Date()
        const generatedId = nextRequirementId(company.sector, createdAt, usedIds, prefixCounters)
        set.mmdId = generatedId

        if (rawMmdId && LEGACY_MMD_ID_REGEX.test(rawMmdId)) {
          notes.push(`legacy mmdId migrated: ${rawMmdId} -> ${generatedId}`)
        } else {
          notes.push(`mmdId regenerated: ${generatedId}`)
        }
      } else {
        requiresManualReview = true
        notes.push('manual-review: mmdId invalid and sector unavailable for regeneration')
      }
    } else if (rawMmdId !== asString(doc.mmdId)) {
      set.mmdId = rawMmdId
      notes.push('mmdId normalized to uppercase canonical format')
    }

    const rawClosingDate = (doc as Record<string, unknown>).interviewClosingDate
    if (rawClosingDate !== undefined && rawClosingDate !== null && !asDate(rawClosingDate)) {
      unset.push('interviewClosingDate')
      notes.push('invalid interviewClosingDate removed')
    }

    if (requiresManualReview) {
      summary.manualReview += 1
    }

    if (Object.keys(set).length === 0 && unset.length === 0) {
      continue
    }

    summary.mutated += 1

    if (summary.previews.length < 12) {
      summary.previews.push({ id, notes, set, unset })
    }

    if (apply) {
      const updatePayload: { $set?: Record<string, unknown>; $unset?: Record<string, 1> } = {}
      if (Object.keys(set).length > 0) updatePayload.$set = set
      if (unset.length > 0) {
        updatePayload.$unset = Object.fromEntries(unset.map((field) => [field, 1]))
      }
      await Requirement.updateOne({ _id: doc._id }, updatePayload)
    }
  }

  return summary
}

function printSummary(summary: BackfillSummary, apply: boolean): void {
  console.log(`\n[${summary.name}]`)
  console.log(`  scanned:       ${summary.scanned}`)
  console.log(`  ${apply ? 'updated' : 'would update'}:  ${summary.mutated}`)
  console.log(`  manual-review: ${summary.manualReview}`)

  if (summary.previews.length > 0) {
    console.log('  sample changes:')
    summary.previews.forEach((preview) => {
      console.log(`    - ${preview.id}`)
      preview.notes.forEach((note) => console.log(`      * ${note}`))
    })
  }
}

async function main(): Promise<void> {
  loadLocalEnv()

  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const scope = parseScope(args)

  await connectDB()

  console.log('Phase 6.1 Backfill Runner')
  console.log(`mode:  ${apply ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}`)
  console.log(`scope: ${scope}`)

  const summaries: BackfillSummary[] = []

  if (scope === 'all' || scope === 'invoices') {
    summaries.push(await backfillInvoices(apply))
  }

  if (scope === 'all' || scope === 'requirements') {
    summaries.push(await backfillRequirements(apply))
  }

  summaries.forEach((summary) => printSummary(summary, apply))

  const totalManualReview = summaries.reduce((sum, item) => sum + item.manualReview, 0)
  if (!apply) {
    console.log('\nDry-run complete. Re-run with --apply to persist these changes.')
  }
  if (totalManualReview > 0) {
    console.log('Some records still require manual review. Check the preview notes above.')
  }
}

main().catch((error) => {
  console.error('Phase 6.1 backfill failed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
