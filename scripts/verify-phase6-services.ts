#!/usr/bin/env node

/**
 * Phase 6.2 service-level verification suite.
 *
 * This script creates isolated test fixtures in MongoDB, verifies critical
 * service transitions/lifecycle behavior, and cleans up created records.
 *
 * Usage:
 *   npx tsx scripts/verify-phase6-services.ts
 */

import mongoose from 'mongoose'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import connectDB from '../lib/db/mongodb'
import User from '../lib/db/models/User'
import Company from '../lib/db/models/Company'
import Lead from '../lib/db/models/Lead'
import HRContact from '../lib/db/models/HRContact'
import Requirement from '../lib/db/models/Requirement'
import Candidate from '../lib/db/models/Candidate'
import ApplicationForm from '../lib/db/models/ApplicationForm'
import CandidateActivity from '../lib/db/models/CandidateActivity'
import DataAccessLog from '../lib/db/models/DataAccessLog'
import Invoice from '../lib/db/models/Invoice'
import ExportJob from '../lib/db/models/ExportJob'
import ReportSchedule from '../lib/db/models/ReportSchedule'
import AuditLog from '../lib/db/models/AuditLog'
import AnalyticsEvent from '../lib/db/models/AnalyticsEvent'
import { rankCandidatesForRequirement } from '../lib/automation/matching'
import { authorizeCronRequest, type CronAuthorizationResult } from '../lib/automation/cron/auth'
import { AutomationService } from '../lib/services/automation.service'
import { RequirementService } from '../lib/services/requirement.service'
import { CandidateService } from '../lib/services/candidate.service'
import { InvoiceService } from '../lib/services/invoice.service'
import { ExportService } from '../lib/services/export.service'
import { ReportingService } from '../lib/services/reporting.service'
import { LeadsService } from '../lib/services/leads.service'

interface ContextIds {
  userIds: string[]
  companyIds: string[]
  leadIds: string[]
  requirementIds: string[]
  candidateIds: string[]
  applicationFormIds: string[]
  invoiceIds: string[]
  exportJobIds: string[]
  reportScheduleIds: string[]
}

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
    // .env is optional if env vars are already injected.
  }
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const converted = String(value)
    if (converted && converted !== '[object Object]') {
      return converted
    }
  }
  return ''
}

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function assertCronAuthFailure(result: CronAuthorizationResult, expectedStatus: number, expectedError: string): void {
  assert(!result.ok, `Expected cron auth failure (${expectedStatus})`)
  if (result.ok) {
    return
  }

  assert(result.status === expectedStatus, `Expected cron auth status ${expectedStatus}, got ${result.status}`)
  assert(result.error === expectedError, `Expected cron auth error "${expectedError}", got "${result.error}"`)
}

async function expectThrows(action: () => Promise<unknown>, contains: string): Promise<void> {
  try {
    await action()
    throw new Error(`Expected an error containing: ${contains}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes(contains)) {
      throw new Error(`Expected error containing "${contains}", got: ${message}`)
    }
  }
}

async function runTest(name: string, testFn: () => Promise<void>, counters: { passed: number; failed: number }): Promise<void> {
  try {
    await testFn()
    counters.passed += 1
    console.log(`PASS ${name}`)
  } catch (error) {
    counters.failed += 1
    const message = error instanceof Error ? error.message : String(error)
    console.error(`FAIL ${name}`)
    console.error(`  ${message}`)
  }
}

async function cleanup(ids: ContextIds): Promise<void> {
  const objectIds = ids.userIds
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const requirementObjectIds = ids.requirementIds
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const companyObjectIds = ids.companyIds
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const candidateObjectIds = ids.candidateIds
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  const scheduleObjectIds = ids.reportScheduleIds
    .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
    .map((id) => new mongoose.Types.ObjectId(id))

  await CandidateActivity.deleteMany({
    $or: [
      { candidateId: { $in: candidateObjectIds } },
      { userId: { $in: objectIds } },
    ],
  })

  await DataAccessLog.deleteMany({
    $or: [
      { entityId: { $in: [...ids.requirementIds, ...ids.candidateIds] } },
      { userId: { $in: objectIds } },
    ],
  })

  await ApplicationForm.deleteMany({
    $or: [
      { _id: { $in: ids.applicationFormIds } },
      { requirementId: { $in: ids.requirementIds } },
    ],
  })

  await Lead.deleteMany({ _id: { $in: ids.leadIds } })
  await HRContact.deleteMany({ companyId: { $in: companyObjectIds } })

  await ReportSchedule.deleteMany({ _id: { $in: ids.reportScheduleIds } })
  await ExportJob.deleteMany({ _id: { $in: ids.exportJobIds } })
  await Invoice.deleteMany({
    $or: [
      { _id: { $in: ids.invoiceIds } },
      { requirementId: { $in: requirementObjectIds } },
    ],
  })
  await Candidate.deleteMany({ _id: { $in: ids.candidateIds } })
  await Requirement.deleteMany({ _id: { $in: ids.requirementIds } })
  await Company.deleteMany({ _id: { $in: ids.companyIds } })
  await User.deleteMany({ _id: { $in: ids.userIds } })

  if (scheduleObjectIds.length > 0) {
    await AnalyticsEvent.deleteMany({
      entityType: 'ReportSchedule',
      $or: [
        { entityId: { $in: ids.reportScheduleIds } },
        { entityId: { $in: scheduleObjectIds } },
      ],
    })
  }

  if (ids.userIds.length > 0) {
    await AuditLog.deleteMany({
      $or: [
        { entityId: { $in: [...ids.requirementIds, ...ids.candidateIds, ...ids.invoiceIds, ...ids.exportJobIds, ...ids.reportScheduleIds] } },
        { userId: { $in: objectIds } },
      ],
    })
  }
}

async function main(): Promise<void> {
  loadLocalEnv()
  await connectDB()

  const counters = { passed: 0, failed: 0 }
  const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`
  const ids: ContextIds = {
    userIds: [],
    companyIds: [],
    leadIds: [],
    requirementIds: [],
    candidateIds: [],
    applicationFormIds: [],
    invoiceIds: [],
    exportJobIds: [],
    reportScheduleIds: [],
  }

  let coordinatorId = ''
  let adminId = ''
  let companyId = ''
  let requirementId = ''
  let candidateId = ''
  let invoicePaidId = ''
  let invoiceOverdueId = ''
  let exportJobId = ''
  let reportScheduleId = ''

  try {
    const coordinator = await User.create({
      email: `phase6-coordinator-${runId}@example.com`,
      password: 'Phase6Test123!',
      name: `Phase6 Coordinator ${runId}`,
      role: 'COORDINATOR',
      isActive: true,
    })
    coordinatorId = coordinator._id.toString()
    ids.userIds.push(coordinatorId)

    const admin = await User.create({
      email: `phase6-admin-${runId}@example.com`,
      password: 'Phase6Test123!',
      name: `Phase6 Admin ${runId}`,
      role: 'ADMIN',
      isActive: true,
    })
    adminId = admin._id.toString()
    ids.userIds.push(adminId)

    await runTest(
      'Cron auth enforces secret and bearer token validation',
      async () => {
        const previousSecret = process.env.CRON_SECRET

        try {
          delete process.env.CRON_SECRET

          const missingSecret = authorizeCronRequest(new Request('http://localhost/api/cron/export-jobs'))
          assertCronAuthFailure(missingSecret, 500, 'CRON_SECRET is not configured')

          process.env.CRON_SECRET = 'phase6-cron-secret'

          const missingHeader = authorizeCronRequest(new Request('http://localhost/api/cron/export-jobs'))
          assertCronAuthFailure(missingHeader, 401, 'Unauthorized')

          const malformedHeader = authorizeCronRequest(
            new Request('http://localhost/api/cron/export-jobs', {
              headers: { authorization: 'Token phase6-cron-secret' },
            })
          )
          assertCronAuthFailure(malformedHeader, 401, 'Unauthorized')

          const wrongToken = authorizeCronRequest(
            new Request('http://localhost/api/cron/export-jobs', {
              headers: { authorization: 'Bearer wrong-secret' },
            })
          )
          assertCronAuthFailure(wrongToken, 401, 'Unauthorized')

          const validToken = authorizeCronRequest(
            new Request('http://localhost/api/cron/export-jobs', {
              headers: { authorization: 'Bearer phase6-cron-secret' },
            })
          )
          assert(validToken.ok, 'Expected cron auth success for valid bearer token')
        } finally {
          if (previousSecret === undefined) {
            delete process.env.CRON_SECRET
          } else {
            process.env.CRON_SECRET = previousSecret
          }
        }
      },
      counters
    )

    const now = Date.now()
    const company = await Company.create({
      name: `Phase6 Company ${runId}`,
      category: 'Technology',
      sector: 'IT',
      location: `Bengaluru-${runId}`,
      hiringType: 'PERMANENT',
      source: 'LEAD',
      mouStatus: 'SIGNED',
      mouDocumentUrl: 'https://example.com/mou.pdf',
      mouStartDate: new Date(now - 5 * 24 * 60 * 60 * 1000),
      mouEndDate: new Date(now + 365 * 24 * 60 * 60 * 1000),
      commercialPercent: 8,
      paymentTerms: 'Net 30',
      assignedCoordinatorId: coordinator._id,
    })
    companyId = company._id.toString()
    ids.companyIds.push(companyId)

    const createdRequirement = await RequirementService.create(
      { id: coordinatorId, role: 'COORDINATOR' },
      {
        companyId,
        jobTitle: 'Phase6 QA Engineer',
        fullDescription:
          'This requirement validates Phase 6 service-level transitions and data integrity checks across modules.',
        skills: ['TypeScript', 'Automation'],
        experienceMin: 2,
        experienceMax: 6,
        salaryMin: 500000,
        salaryMax: 700000,
        openings: 2,
        workMode: 'HYBRID',
        location: 'Bengaluru',
        priority: 'Medium',
        group: 'LEADS',
        accountOwnerId: coordinatorId,
        status: 'ACTIVE',
      }
    )
    requirementId = asString((createdRequirement as { _id?: unknown })._id)
    ids.requirementIds.push(requirementId)

    const createdCandidate = await CandidateService.create(
      { id: coordinatorId, role: 'COORDINATOR' },
      {
        requirementId,
        name: `Phase6 Candidate ${runId}`,
        phone: '9999999999',
        email: `phase6-candidate-${runId}@example.com`,
        skills: ['TypeScript'],
        yearsExperience: 4,
      }
    )
    candidateId = asString((createdCandidate as { _id?: unknown })._id)
    ids.candidateIds.push(candidateId)

    await runTest(
      'Governance mutation logs persist for create events',
      async () => {
        const requirementLog = await DataAccessLog.findOne({
          entity: 'Requirement',
          entityId: requirementId,
          action: 'CREATE',
        }).lean()

        assert(Boolean(requirementLog), 'Requirement create log should be present')

        const candidateLog = await DataAccessLog.findOne({
          entity: 'Candidate',
          entityId: candidateId,
          action: 'CREATE',
        }).lean()

        assert(Boolean(candidateLog), 'Candidate create log should be present')
      },
      counters
    )

    await runTest(
      'Embeddings are generated and ranked matching returns seeded candidate',
      async () => {
        const requirementSnapshot = await Requirement.findById(requirementId)
          .select('jdEmbedding')
          .lean()
        assert(
          Array.isArray(requirementSnapshot?.jdEmbedding) && requirementSnapshot.jdEmbedding.length > 0,
          'Requirement embedding should be generated during create'
        )

        const candidateSnapshot = await Candidate.findById(candidateId)
          .select('embedding')
          .lean()
        assert(
          Array.isArray(candidateSnapshot?.embedding) && candidateSnapshot.embedding.length > 0,
          'Candidate embedding should be generated during create'
        )

        const ranked = await rankCandidatesForRequirement(requirementId, { limit: 5, minScore: -1 })
        assert(ranked.length >= 1, 'Ranked matching should return at least one candidate')
        assert(
          ranked.some((item) => item.candidateId === candidateId),
          'Ranked matching should include the created candidate'
        )
      },
      counters
    )

    await runTest(
      'Public application submission writes candidate timeline activity',
      async () => {
        const fallbackSlug = `phase6-public-${runId}`
        const existingForm = await ApplicationForm.findOne({ requirementId }).select('_id shareableUrl').lean()

        let shareableUrl = existingForm?.shareableUrl
        if (!shareableUrl) {
          const form = await ApplicationForm.create({
            requirementId,
            formFields: {
              fields: ['name', 'email', 'phone', 'skills'],
            },
            shareableUrl: `/apply/${fallbackSlug}`,
            isActive: true,
          })
          ids.applicationFormIds.push(form._id.toString())
          shareableUrl = form.shareableUrl
        }

        const slug = shareableUrl.replace('/apply/', '')
        const resumeStorageKey = `application-${slug}/phase6-resume-${runId}.pdf`

        const submission = await AutomationService.submitApplication({
          slug,
          name: `Phase6 Public Candidate ${runId}`,
          phone: '9888888888',
          email: `phase6-public-candidate-${runId}@example.com`,
          resumeStorageKey,
          resumeMimeType: 'application/pdf',
          resumeFileName: `phase6-resume-${runId}.pdf`,
          resumeSizeBytes: 1024,
          skills: ['TypeScript', 'Node.js'],
          college: 'Phase6 Institute',
          yearsExperience: 3,
        })

        const submittedCandidateId = asString((submission as { id?: unknown }).id)
        assert(Boolean(submittedCandidateId), 'Submission should return candidate id')
        ids.candidateIds.push(submittedCandidateId)

        const submittedCandidate = await Candidate.findById(submittedCandidateId)
          .select('applicationFormId embedding resumeStorageKey resumeUrl')
          .lean()
        assert(Boolean(submittedCandidate?.applicationFormId), 'Submitted candidate should be linked to the application form')
        assert(
          Array.isArray(submittedCandidate?.embedding) && submittedCandidate.embedding.length > 0,
          'Submitted candidate should include an embedding'
        )
        assert(submittedCandidate?.resumeStorageKey === resumeStorageKey, 'Submitted candidate should persist resume storage metadata')
        assert(
          typeof submittedCandidate?.resumeUrl === 'string' && submittedCandidate.resumeUrl.includes('/api/candidates/') && submittedCandidate.resumeUrl.endsWith('/resume'),
          'Submitted candidate should expose managed resume download route'
        )

        const candidateActivity = await CandidateActivity.findOne({
          candidateId: submittedCandidateId,
          type: 'CREATED',
        })
          .sort({ createdAt: -1 })
          .lean()

        assert(Boolean(candidateActivity), 'Candidate activity should be written for public submission')
        assert(
          typeof candidateActivity?.notes === 'string' && candidateActivity.notes.includes(`/apply/${slug}`),
          'Candidate activity notes should reference the public form slug'
        )
      },
      counters
    )

    await runTest(
      'Requirement valid transition persists',
      async () => {
        const updated = await RequirementService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { requirementId, status: 'SOURCING', comment: 'Started sourcing' }
        )
        assert(asString((updated as { status?: unknown }).status) === 'SOURCING', 'Requirement status should become SOURCING')

        const reloaded = await RequirementService.getById(
          { id: coordinatorId, role: 'COORDINATOR' },
          requirementId
        )
        assert(asString((reloaded as { status?: unknown }).status) === 'SOURCING', 'Requirement status should persist after reload')
      },
      counters
    )

    await runTest(
      'Requirement invalid transition is blocked',
      async () => {
        await expectThrows(
          () =>
            RequirementService.updateStatus(
              { id: coordinatorId, role: 'COORDINATOR' },
              { requirementId, status: 'CLOSED_HIRED', comment: 'Invalid direct close' }
            ),
          'Invalid transition'
        )
      },
      counters
    )

    await runTest(
      'Candidate transition validations enforce payload rules',
      async () => {
        await expectThrows(
          () =>
            CandidateService.updateStatus(
              { id: coordinatorId, role: 'COORDINATOR' },
              { candidateId, status: 'SHORTLISTED' }
            ),
          'Phone log is required'
        )

        const shortlisted = await CandidateService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { candidateId, status: 'SHORTLISTED', phoneLog: 'Reached candidate and validated fit' }
        )
        assert(asString((shortlisted.candidate as { status?: unknown }).status) === 'SHORTLISTED', 'Candidate should be SHORTLISTED')

        await expectThrows(
          () =>
            CandidateService.updateStatus(
              { id: coordinatorId, role: 'COORDINATOR' },
              { candidateId, status: 'OFFERED' }
            ),
          'Offered CTC is required'
        )

        const offered = await CandidateService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { candidateId, status: 'OFFERED', offeredCtc: 800000 }
        )
        assert(asString((offered.candidate as { status?: unknown }).status) === 'OFFERED', 'Candidate should be OFFERED')
        assert(Boolean(offered.warning), 'Expected a budget warning when offered CTC exceeds requirement salary max')

        await expectThrows(
          () =>
            CandidateService.updateStatus(
              { id: coordinatorId, role: 'COORDINATOR' },
              { candidateId, status: 'REJECTED' }
            ),
          'Rejection reason code is required'
        )

        const rejected = await CandidateService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { candidateId, status: 'REJECTED', rejectionReasonCode: 'ROLE_MISMATCH' }
        )
        assert(asString((rejected.candidate as { status?: unknown }).status) === 'REJECTED', 'Candidate should be REJECTED')
      },
      counters
    )

    await runTest(
      'Invoice transitions and metrics stay consistent',
      async () => {
        const nowDate = new Date()

        await expectThrows(
          () =>
            InvoiceService.create(
              { id: coordinatorId, role: 'COORDINATOR' },
              {
                companyId,
                requirementId,
                amount: 100000,
                currency: 'INR',
                issueDate: nowDate,
                dueDate: new Date(nowDate.getTime() - 24 * 60 * 60 * 1000),
              }
            ),
          'Due date cannot be before issue date'
        )

        const paidInvoice = await InvoiceService.create(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            companyId,
            requirementId,
            amount: 120000,
            currency: 'INR',
            issueDate: nowDate,
            dueDate: new Date(nowDate.getTime() + 10 * 24 * 60 * 60 * 1000),
          }
        )
        invoicePaidId = asString((paidInvoice as { _id?: unknown })._id)
        ids.invoiceIds.push(invoicePaidId)

        await InvoiceService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { invoiceId: invoicePaidId, status: 'SENT' }
        )
        await InvoiceService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { invoiceId: invoicePaidId, status: 'PAID' }
        )

        await expectThrows(
          () =>
            InvoiceService.updateStatus(
              { id: coordinatorId, role: 'COORDINATOR' },
              { invoiceId: invoicePaidId, status: 'SENT' }
            ),
          'Cannot transition from PAID to SENT'
        )

        const oldIssueDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)
        const overdueInvoice = await InvoiceService.create(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            companyId,
            requirementId,
            amount: 90000,
            currency: 'INR',
            issueDate: oldIssueDate,
            dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          }
        )
        invoiceOverdueId = asString((overdueInvoice as { _id?: unknown })._id)
        ids.invoiceIds.push(invoiceOverdueId)

        await InvoiceService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { invoiceId: invoiceOverdueId, status: 'SENT' }
        )

        const metrics = await InvoiceService.getMetrics({ id: coordinatorId, role: 'COORDINATOR' })
        assert(metrics.countPaid >= 1, 'Metrics should report at least one paid invoice')
        assert(metrics.countOverdue >= 1, 'Metrics should report at least one overdue invoice')
      },
      counters
    )

    await runTest(
      'Candidate JOINED transition creates invoice exactly once',
      async () => {
        const joinedRequirement = await RequirementService.create(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            companyId,
            jobTitle: 'Phase6 Joined Invoice Guard',
            fullDescription: 'Validate that JOINED transition triggers single invoice creation under repeated requests.',
            skills: ['TypeScript', 'Finance'],
            experienceMin: 3,
            experienceMax: 8,
            salaryMin: 700000,
            salaryMax: 1000000,
            openings: 1,
            workMode: 'HYBRID',
            location: 'Bengaluru',
            priority: 'High',
            group: 'LEADS',
            accountOwnerId: coordinatorId,
            status: 'SOURCING',
          }
        )

        const joinedRequirementId = asString((joinedRequirement as { _id?: unknown })._id)
        assert(Boolean(joinedRequirementId), 'Joined guard requirement should be created')
        ids.requirementIds.push(joinedRequirementId)

        const joinedCandidate = await CandidateService.create(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            requirementId: joinedRequirementId,
            name: `Phase6 Joined Candidate ${runId}`,
            phone: '9777777777',
            email: `phase6-joined-candidate-${runId}@example.com`,
            skills: ['TypeScript', 'Finance'],
            yearsExperience: 5,
          }
        )

        const joinedCandidateId = asString((joinedCandidate as { _id?: unknown })._id)
        assert(Boolean(joinedCandidateId), 'Joined guard candidate should be created')
        ids.candidateIds.push(joinedCandidateId)

        await CandidateService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { candidateId: joinedCandidateId, status: 'OFFERED', offeredCtc: 900000 }
        )

        const beforeJoinedInvoices = await Invoice.countDocuments({ requirementId: joinedRequirementId })

        await CandidateService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { candidateId: joinedCandidateId, status: 'JOINED', offeredCtc: 900000 }
        )

        const afterFirstJoinInvoices = await Invoice.countDocuments({ requirementId: joinedRequirementId })
        assert(afterFirstJoinInvoices === beforeJoinedInvoices + 1, 'First JOINED transition should create one invoice')

        await CandidateService.updateStatus(
          { id: coordinatorId, role: 'COORDINATOR' },
          { candidateId: joinedCandidateId, status: 'JOINED', offeredCtc: 900000 }
        )

        const afterSecondJoinInvoices = await Invoice.countDocuments({ requirementId: joinedRequirementId })
        assert(afterSecondJoinInvoices === afterFirstJoinInvoices, 'Repeated JOINED transition must not create duplicate invoices')

        const joinedCandidateSnapshot = await Candidate.findById(joinedCandidateId)
          .select('status joinedAt')
          .lean()
        assert(joinedCandidateSnapshot?.status === 'JOINED', 'Joined guard candidate should remain in JOINED status')
        assert(Boolean(joinedCandidateSnapshot?.joinedAt), 'Joined guard candidate should have joinedAt timestamp')

        const joinedRequirementSnapshot = await Requirement.findById(joinedRequirementId)
          .select('status')
          .lean()
        assert(joinedRequirementSnapshot?.status === 'CLOSED_HIRED', 'Joined guard requirement should close as hired')
      },
      counters
    )

    await runTest(
      'Export jobs process to completed with download payload',
      async () => {
        const createdJob = await ExportService.createJob(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            entityType: 'REQUIREMENT',
            format: 'CSV',
            filter: { companyId },
          }
        )
        exportJobId = asString((createdJob as { _id?: unknown })._id)
        ids.exportJobIds.push(exportJobId)

        const processSummary = await ExportService.processPendingJobs(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 10 }
        )
        assert(processSummary.completed >= 1, 'At least one export job should complete during processing')

        const jobs = await ExportService.listJobs(
          { id: coordinatorId, role: 'COORDINATOR' },
          { entityType: 'REQUIREMENT', limit: 10 }
        )

        const completedJob = (jobs as Array<Record<string, unknown>>).find(
          (job) => asString(job._id) === exportJobId
        )
        assert(Boolean(completedJob), 'Created export job should be present in list')
        assert(asString(completedJob?.status) === 'COMPLETED', 'Export job should be COMPLETED')

        const download = await ExportService.getDownloadPayload(
          { id: coordinatorId, role: 'COORDINATOR' },
          exportJobId
        )
        assert(Array.isArray(download.rows), 'Download payload should include rows array')
      },
      counters
    )

    await runTest(
      'GDPR portability export completes and exposes auditable download payload',
      async () => {
        const gdprJob = await ExportService.createJob(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            entityType: 'GDPR_PORTABILITY',
            format: 'CSV',
            filter: {},
          }
        )

        const gdprJobId = asString((gdprJob as { _id?: unknown })._id)
        assert(Boolean(gdprJobId), 'GDPR portability export job should be created')
        ids.exportJobIds.push(gdprJobId)

        await ExportService.processPendingJobs(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const gdprJobSnapshot = await ExportJob.findById(gdprJobId)
          .select('status fileUrl')
          .lean()

        assert(gdprJobSnapshot?.status === 'COMPLETED', 'GDPR portability export job should complete successfully')
        assert(typeof gdprJobSnapshot?.fileUrl === 'string' && gdprJobSnapshot.fileUrl.length > 0, 'GDPR portability export should expose file URL')

        const gdprDownload = await ExportService.getDownloadPayload(
          { id: coordinatorId, role: 'COORDINATOR' },
          gdprJobId
        )

        assert(Array.isArray(gdprDownload.rows), 'GDPR download payload should include rows')
        assert(gdprDownload.rows.length >= 1, 'GDPR download payload should include at least one candidate row')

        const includesPrimaryCandidate = gdprDownload.rows.some((row) => {
          if (!row || typeof row !== 'object') return false
          return (row as { candidateId?: unknown }).candidateId === candidateId
        })

        assert(includesPrimaryCandidate, 'GDPR download payload should include seeded candidate record')

        const gdprAccessLog = await DataAccessLog.findOne({
          entity: 'ExportJob',
          entityId: gdprJobId,
          action: 'EXPORT',
        }).lean()

        assert(Boolean(gdprAccessLog), 'GDPR download should create export access log entry')
      },
      counters
    )

    await runTest(
      'Export job retry window and dead-letter path remain durable',
      async () => {
        const failingJob = await ExportService.createJob(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            entityType: '__UNSUPPORTED_EXPORT_TYPE__',
            format: 'CSV',
            filter: { reason: 'phase6 durability test' },
          }
        )

        const failingJobId = asString((failingJob as { _id?: unknown })._id)
        assert(Boolean(failingJobId), 'Failed to create export job for retry/dead-letter test')
        ids.exportJobIds.push(failingJobId)

        await ExportJob.findByIdAndUpdate(failingJobId, {
          status: 'PENDING',
          attempts: 0,
          maxAttempts: 2,
          nextAttemptAt: new Date(Date.now() - 10_000),
        })

        await ExportService.processPendingJobs(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const afterFirstAttempt = await ExportJob.findById(failingJobId)
          .select('status attempts nextAttemptAt errorMessage')
          .lean()

        assert(afterFirstAttempt?.status === 'FAILED', 'Failing export job should transition to FAILED on first attempt')
        assert((afterFirstAttempt?.attempts ?? 0) === 1, 'Failing export job attempt counter should be 1 after first failure')
        assert(
          Boolean(afterFirstAttempt?.nextAttemptAt) && new Date(afterFirstAttempt?.nextAttemptAt as Date).getTime() > Date.now() - 1_000,
          'Failing export job should be scheduled for a future retry'
        )
        assert(
          typeof afterFirstAttempt?.errorMessage === 'string' && afterFirstAttempt.errorMessage.includes('Unsupported entity type'),
          'Failing export job should capture an operator-visible error'
        )

        await ExportService.processPendingJobs(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const afterImmediateSecondRun = await ExportJob.findById(failingJobId)
          .select('status attempts')
          .lean()

        assert(afterImmediateSecondRun?.status === 'FAILED', 'Export job should remain FAILED until retry window opens')
        assert((afterImmediateSecondRun?.attempts ?? 0) === 1, 'Export job should not be retried before nextAttemptAt')

        await ExportJob.findByIdAndUpdate(failingJobId, {
          nextAttemptAt: new Date(Date.now() - 10_000),
        })

        await ExportService.processPendingJobs(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const afterDeadLetter = await ExportJob.findById(failingJobId)
          .select('status attempts completedAt')
          .lean()

        assert(afterDeadLetter?.status === 'DEAD_LETTER', 'Export job should dead-letter after max attempts')
        assert((afterDeadLetter?.attempts ?? 0) === 2, 'Dead-lettered export job should stop at max attempt count')
        assert(Boolean(afterDeadLetter?.completedAt), 'Dead-lettered export job should stamp completion time')

        await ExportService.processPendingJobs(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const afterDeadLetterRecheck = await ExportJob.findById(failingJobId)
          .select('status attempts')
          .lean()

        assert(afterDeadLetterRecheck?.status === 'DEAD_LETTER', 'Dead-lettered export job should remain terminal')
        assert((afterDeadLetterRecheck?.attempts ?? 0) === 2, 'Dead-lettered export job should not be claimed again')

        const failedAudit = await AuditLog.findOne({
          entity: 'ExportJob',
          entityId: failingJobId,
          action: 'EXPORT_JOB_FAILED',
        }).lean()

        const deadLetterAudit = await AuditLog.findOne({
          entity: 'ExportJob',
          entityId: failingJobId,
          action: 'EXPORT_JOB_DEAD_LETTERED',
        }).lean()

        assert(Boolean(failedAudit), 'Expected EXPORT_JOB_FAILED audit log entry for failed retry')
        assert(Boolean(deadLetterAudit), 'Expected EXPORT_JOB_DEAD_LETTERED audit log entry for terminal failure')
      },
      counters
    )

    await runTest(
      'Scheduled report runner executes active schedule',
      async () => {
        const createdSchedule = await ReportingService.createSchedule(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            name: `Phase6 Schedule ${runId}`,
            reportType: 'requirementStatus',
            frequency: 'DAILY',
            recipients: ['ops@example.com'],
            filters: {},
            isActive: true,
          }
        )
        reportScheduleId = asString((createdSchedule as { _id?: unknown })._id)
        ids.reportScheduleIds.push(reportScheduleId)

        const summary = await ReportingService.runScheduledReports(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 25 }
        )

        assert(summary.executed >= 1, 'Expected at least one schedule execution')

        const schedule = await ReportSchedule.findById(reportScheduleId).select('lastRunAt').lean()
        assert(Boolean(schedule?.lastRunAt), 'Executed schedule should have lastRunAt set')
      },
      counters
    )

    await runTest(
      'Report schedule retry window and dead-letter path remain durable',
      async () => {
        const failingSchedule = await ReportingService.createSchedule(
          { id: coordinatorId, role: 'COORDINATOR' },
          {
            name: `Phase6 Unsupported Schedule ${runId}`,
            reportType: '__UNSUPPORTED_REPORT_TYPE__',
            frequency: 'DAILY',
            recipients: ['ops@example.com'],
            filters: {},
            isActive: true,
          }
        )

        const failingScheduleId = asString((failingSchedule as { _id?: unknown })._id)
        assert(Boolean(failingScheduleId), 'Failed to create schedule for retry/dead-letter test')
        ids.reportScheduleIds.push(failingScheduleId)

        await ReportSchedule.findByIdAndUpdate(failingScheduleId, {
          consecutiveFailures: 0,
          maxConsecutiveFailures: 2,
          deadLetteredAt: null,
          isActive: true,
          lastError: null,
          nextRunAt: new Date(Date.now() - 10_000),
          processingStartedAt: null,
        })

        await ReportingService.runScheduledReports(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const afterFirstFailure = await ReportSchedule.findById(failingScheduleId)
          .select('consecutiveFailures isActive deadLetteredAt nextRunAt lastError')
          .lean()

        assert((afterFirstFailure?.consecutiveFailures ?? 0) === 1, 'Failed schedule should increment consecutiveFailures to 1')
        assert(afterFirstFailure?.isActive === true, 'Schedule should remain active before max failures')
        assert(!afterFirstFailure?.deadLetteredAt, 'Schedule should not dead-letter on first failure')
        assert(
          typeof afterFirstFailure?.lastError === 'string' && afterFirstFailure.lastError.includes('Unsupported report type'),
          'Failed schedule should capture an operator-visible error'
        )
        assert(
          Boolean(afterFirstFailure?.nextRunAt) && new Date(afterFirstFailure?.nextRunAt as Date).getTime() > Date.now() - 1_000,
          'Failed schedule should be deferred for retry'
        )

        await ReportingService.runScheduledReports(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const afterImmediateSecondRun = await ReportSchedule.findById(failingScheduleId)
          .select('consecutiveFailures deadLetteredAt isActive')
          .lean()

        assert((afterImmediateSecondRun?.consecutiveFailures ?? 0) === 1, 'Schedule should not retry before nextRunAt')
        assert(!afterImmediateSecondRun?.deadLetteredAt, 'Schedule should still be out of dead-letter after skipped retry window')
        assert(afterImmediateSecondRun?.isActive === true, 'Schedule should remain active before terminal failure')

        await ReportSchedule.findByIdAndUpdate(failingScheduleId, {
          nextRunAt: new Date(Date.now() - 10_000),
        })

        await ReportingService.runScheduledReports(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const afterDeadLetter = await ReportSchedule.findById(failingScheduleId)
          .select('consecutiveFailures deadLetteredAt isActive')
          .lean()

        assert((afterDeadLetter?.consecutiveFailures ?? 0) === 2, 'Dead-lettered schedule should stop at max failure threshold')
        assert(Boolean(afterDeadLetter?.deadLetteredAt), 'Schedule should set deadLetteredAt after terminal failure')
        assert(afterDeadLetter?.isActive === false, 'Dead-lettered schedule should be disabled')

        await ReportingService.runScheduledReports(
          { id: 'system-phase6', role: 'SYSTEM' },
          { limit: 100 }
        )

        const afterDeadLetterRecheck = await ReportSchedule.findById(failingScheduleId)
          .select('consecutiveFailures deadLetteredAt isActive')
          .lean()

        assert((afterDeadLetterRecheck?.consecutiveFailures ?? 0) === 2, 'Dead-lettered schedule should not be retried again')
        assert(Boolean(afterDeadLetterRecheck?.deadLetteredAt), 'Dead-letter marker should remain persisted')
        assert(afterDeadLetterRecheck?.isActive === false, 'Dead-lettered schedule should remain inactive')

        const failedAudit = await AuditLog.findOne({
          entity: 'ReportSchedule',
          entityId: failingScheduleId,
          action: 'REPORT_SCHEDULE_FAILED',
        }).lean()

        const deadLetterAudit = await AuditLog.findOne({
          entity: 'ReportSchedule',
          entityId: failingScheduleId,
          action: 'REPORT_SCHEDULE_DEAD_LETTERED',
        }).lean()

        assert(Boolean(failedAudit), 'Expected REPORT_SCHEDULE_FAILED audit log entry for failed retry')
        assert(Boolean(deadLetterAudit), 'Expected REPORT_SCHEDULE_DEAD_LETTERED audit log entry for terminal failure')
      },
      counters
    )

    await runTest(
      'Lead conversion creates one company and remains idempotent',
      async () => {
        const invalidLead = await LeadsService.create(
          { id: coordinatorId, role: 'COORDINATOR', name: 'Phase6 Coordinator' },
          {
            sourcePlatform: 'LinkedIn',
            companyName: `Phase6 Invalid Convert ${runId}`,
            sector: 'IT',
            confidenceScore: 65,
            status: 'NEW',
            notes: 'Missing contact details should block conversion',
          }
        )

        const invalidLeadId = asString((invalidLead as { _id?: unknown })._id)
        assert(Boolean(invalidLeadId), 'Invalid conversion lead should be created')
        ids.leadIds.push(invalidLeadId)

        await expectThrows(
          () => LeadsService.convertToCompany(
            { id: coordinatorId, role: 'COORDINATOR', name: 'Phase6 Coordinator' },
            invalidLeadId
          ),
          'Add contact email or phone before converting this lead'
        )

        const invalidLeadCompany = await Company.findOne({ name: `Phase6 Invalid Convert ${runId}` }).lean()
        assert(!invalidLeadCompany, 'Invalid lead conversion should not create partial company records')

        const validLead = await LeadsService.create(
          { id: coordinatorId, role: 'COORDINATOR', name: 'Phase6 Coordinator' },
          {
            sourcePlatform: 'LinkedIn',
            companyName: `Phase6 Converted Co ${runId}`,
            sector: 'IT',
            contactName: 'Phase6 Contact',
            contactEmail: `phase6-convert-${runId}@example.com`,
            contactPhone: '9666666666',
            confidenceScore: 88,
            status: 'NEW',
            notes: 'Valid lead conversion path',
          }
        )

        const validLeadId = asString((validLead as { _id?: unknown })._id)
        assert(Boolean(validLeadId), 'Valid conversion lead should be created')
        ids.leadIds.push(validLeadId)

        const firstConversion = await LeadsService.convertToCompany(
          { id: coordinatorId, role: 'COORDINATOR', name: 'Phase6 Coordinator' },
          validLeadId
        )

        const convertedCompanyId = asString((firstConversion?.company as { _id?: unknown })?._id)
        assert(Boolean(convertedCompanyId), 'Valid lead conversion should return company id')
        ids.companyIds.push(convertedCompanyId)

        const secondConversion = await LeadsService.convertToCompany(
          { id: coordinatorId, role: 'COORDINATOR', name: 'Phase6 Coordinator' },
          validLeadId
        )

        assert(
          Boolean((secondConversion as { alreadyConverted?: unknown }).alreadyConverted),
          'Repeated conversion should return already-converted marker'
        )

        const secondCompanyId = asString((secondConversion?.company as { _id?: unknown })?._id)
        assert(secondCompanyId === convertedCompanyId, 'Repeated conversion should return same company id')

        const normalizedNameRegex = new RegExp(`^Phase6 Converted Co ${runId}$`, 'i')
        const convertedCompanyCount = await Company.countDocuments({ name: normalizedNameRegex, deletedAt: null })
        assert(convertedCompanyCount === 1, 'Lead conversion should not duplicate companies')

        const convertedLead = await Lead.findById(validLeadId)
          .select('status convertedToCompanyId convertedAt')
          .lean()
        assert(convertedLead?.status === 'CONVERTED', 'Lead should persist converted status')
        assert(convertedLead?.convertedToCompanyId === convertedCompanyId, 'Lead should persist converted company link')
        assert(Boolean(convertedLead?.convertedAt), 'Lead should persist conversion timestamp')

        const hrContactCount = await HRContact.countDocuments({ companyId: convertedCompanyId })
        assert(hrContactCount >= 1, 'Lead conversion should create at least one HR contact for new company')
      },
      counters
    )

    console.log('\nPhase 6.2 Verification Summary')
    console.log(`  passed: ${counters.passed}`)
    console.log(`  failed: ${counters.failed}`)

    if (counters.failed > 0) {
      process.exitCode = 1
    }
  } finally {
    await cleanup(ids)
    await mongoose.disconnect()
  }
}

main().catch((error) => {
  console.error('Phase 6.2 verification crashed:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
