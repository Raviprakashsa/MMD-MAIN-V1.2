
import connectDB from "@/lib/db/mongodb"
import ExportJob from "@/lib/db/models/ExportJob"
import AuditLog from "@/lib/db/models/AuditLog"
import Company from "@/lib/db/models/Company"
import Requirement from "@/lib/db/models/Requirement"
import Candidate from "@/lib/db/models/Candidate"
import User from "@/lib/db/models/User"
import { AppError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { serializeDoc } from "@/lib/utils/serialize"
import { z } from "zod"
import { ExportJobSchema, ExportStatusSchema } from "@/lib/validators/common"
import { logDataAccess } from "@/lib/workflow/governance"

export const CompleteExportJobSchema = z.object({
    jobId: z.string().min(1),
    status: ExportStatusSchema.optional(),
    fileUrl: z.string().url().optional(),
    errorMessage: z.string().optional(),
})

export const ListExportJobsSchema = z.object({
    entityType: z.string().min(1).optional(),
    status: ExportStatusSchema.optional(),
    requestedById: z.string().min(1).optional(),
    limit: z.number().int().min(1).max(50).default(15),
})

export const ProcessPendingExportJobsSchema = z.object({
    limit: z.number().int().min(1).max(25).default(10),
})

export type CreateExportJobInput = z.infer<typeof ExportJobSchema>
export type CompleteExportJobInput = z.infer<typeof CompleteExportJobSchema>
export type ListExportJobsInput = z.infer<typeof ListExportJobsSchema>
export type ProcessPendingExportJobsInput = z.infer<typeof ProcessPendingExportJobsSchema>

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER"] as const
const OPERATOR_ROLES = ["SUPER_ADMIN", "ADMIN"] as const
const DEFAULT_EXPORT_MAX_ATTEMPTS = 3

interface ExportableJob {
    _id: string
    entityType: string
    format: 'CSV' | 'JSON' | 'XLSX'
    filter?: Record<string, unknown>
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'
    requestedBy: string
}

function hasRole(role: string, roles: readonly string[]): boolean {
    return roles.includes(role)
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
}

function asString(value: unknown): string {
    return typeof value === 'string' ? value : ''
}

function computeRetryDelayMs(attempts: number): number {
    const minutes = Math.min(60, 2 ** Math.max(0, attempts - 1))
    return minutes * 60 * 1000
}

async function resolveAuditUserId(userId: string): Promise<string | null> {
    if (z.string().min(1).safeParse(userId).success && /^[a-fA-F0-9]{24}$/.test(userId)) {
        return userId
    }

    const fallbackUser = await User.findOne({ role: { $in: OPERATOR_ROLES }, deletedAt: null })
        .sort({ createdAt: 1 })
        .select('_id')
        .lean()

    return fallbackUser?._id ? fallbackUser._id.toString() : null
}

export class ExportService {
    private static getDownloadUrl(jobId: string): string {
        return `/api/exports/jobs/${jobId}/download`
    }

    private static canAccessJob(user: UserContext, requestedBy: string): boolean {
        if (hasRole(user.role, OPERATOR_ROLES)) return true
        return requestedBy === user.id
    }

    private static isOperator(user: UserContext): boolean {
        return user.role === 'SYSTEM' || hasRole(user.role, OPERATOR_ROLES)
    }

    private static normalizeFilter(filter: unknown): Record<string, unknown> {
        const parsed = asRecord(filter)
        return parsed || {}
    }

    private static mapJobForProcessing(job: Record<string, unknown>): ExportableJob {
        const id = asString(job._id)
        const entityType = asString(job.entityType)
        const format = asString(job.format) as ExportableJob['format']
        const status = asString(job.status) as ExportableJob['status']
        const requestedBy = asString(job.requestedBy)

        if (!id || !entityType || !format || !status || !requestedBy) {
            throw new AppError('Malformed export job payload')
        }

        return {
            _id: id,
            entityType,
            format,
            status,
            requestedBy,
            filter: ExportService.normalizeFilter(job.filter),
        }
    }

    private static async getCompanyRows(filter: Record<string, unknown>): Promise<Record<string, unknown>[]> {
        const query: Record<string, unknown> = { deletedAt: null }
        const status = asString(filter.status)
        const sector = asString(filter.sector)

        if (status) query.mouStatus = status
        if (sector) query.sector = sector

        const companies = await Company.find(query)
            .sort({ createdAt: -1 })
            .select('name category sector location hiringType source mouStatus mouStartDate mouEndDate createdAt')
            .lean()

        return companies.map((company) => ({
            id: company._id.toString(),
            name: company.name,
            category: company.category,
            sector: company.sector,
            location: company.location,
            hiringType: company.hiringType,
            source: company.source,
            mouStatus: company.mouStatus,
            mouStartDate: company.mouStartDate ? new Date(company.mouStartDate).toISOString() : '',
            mouEndDate: company.mouEndDate ? new Date(company.mouEndDate).toISOString() : '',
            createdAt: company.createdAt ? new Date(company.createdAt).toISOString() : '',
        }))
    }

    private static async getRequirementRows(filter: Record<string, unknown>): Promise<Record<string, unknown>[]> {
        const query: Record<string, unknown> = { deletedAt: null }
        const status = asString(filter.status)
        const companyId = asString(filter.companyId)

        if (status) query.status = status
        if (companyId) query.companyId = companyId

        const requirements = await Requirement.find(query)
            .sort({ createdAt: -1 })
            .populate('companyId', 'name')
            .populate('accountOwnerId', 'name email')
            .select('mmdId jobTitle status group location workMode openings experienceMin experienceMax createdAt companyId accountOwnerId')
            .lean()

        return requirements.map((requirement) => {
            const company = asRecord(requirement.companyId)
            const owner = asRecord(requirement.accountOwnerId)

            return {
                id: requirement._id.toString(),
                mmdId: requirement.mmdId,
                jobTitle: requirement.jobTitle,
                status: requirement.status,
                group: requirement.group,
                location: requirement.location,
                workMode: requirement.workMode,
                openings: requirement.openings,
                experienceMin: requirement.experienceMin,
                experienceMax: requirement.experienceMax,
                companyName: asString(company?.name),
                ownerName: asString(owner?.name),
                ownerEmail: asString(owner?.email),
                createdAt: requirement.createdAt ? new Date(requirement.createdAt).toISOString() : '',
            }
        })
    }

    private static async getGdprRows(): Promise<Record<string, unknown>[]> {
        const candidates = await Candidate.find({ deletedAt: null })
            .sort({ createdAt: -1 })
            .populate('requirementId', 'mmdId jobTitle companyId')
            .select('name email phone status skills yearsExperience createdAt requirementId')
            .lean()

        const companyIdSet = new Set<string>()
        for (const candidate of candidates) {
            const requirement = asRecord(candidate.requirementId)
            const companyId = asString(requirement?.companyId)
            if (companyId) companyIdSet.add(companyId)
        }

        const companyIds = Array.from(companyIdSet)
        const companies = companyIds.length
            ? await Company.find({ _id: { $in: companyIds } }).select('name').lean()
            : []

        const companyMap = new Map<string, string>()
        for (const company of companies) {
            companyMap.set(company._id.toString(), company.name)
        }

        return candidates.map((candidate) => {
            const requirement = asRecord(candidate.requirementId)
            const companyId = asString(requirement?.companyId)

            return {
                candidateId: candidate._id.toString(),
                name: candidate.name,
                email: candidate.email,
                phone: candidate.phone,
                status: candidate.status,
                skills: candidate.skills.join(', '),
                yearsExperience: candidate.yearsExperience ?? '',
                requirementId: asString(requirement?._id),
                requirementRef: asString(requirement?.mmdId),
                requirementTitle: asString(requirement?.jobTitle),
                companyName: companyMap.get(companyId) || '',
                createdAt: candidate.createdAt ? new Date(candidate.createdAt).toISOString() : '',
            }
        })
    }

    private static async generateRows(job: ExportableJob): Promise<Record<string, unknown>[]> {
        if (job.entityType === 'COMPANY') {
            return ExportService.getCompanyRows(job.filter || {})
        }

        if (job.entityType === 'REQUIREMENT') {
            return ExportService.getRequirementRows(job.filter || {})
        }

        if (job.entityType === 'GDPR_PORTABILITY') {
            return ExportService.getGdprRows()
        }

        throw new AppError(`Unsupported entity type for export job: ${job.entityType}`)
    }

    /**
     * Create Export Job
     */
    static async createJob(user: UserContext, data: CreateExportJobInput) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const job = await ExportJob.create({
            entityType: data.entityType,
            format: data.format,
            status: 'PENDING',
            requestedBy: user.id,
            filter: data.filter,
            fileUrl: null,
            errorMessage: null,
            attempts: 0,
            maxAttempts: DEFAULT_EXPORT_MAX_ATTEMPTS,
            nextAttemptAt: new Date(),
            lastAttemptAt: null,
            startedAt: null,
            completedAt: null,
        })

        await AuditLog.create({
            userId: user.id,
            action: "EXPORT_JOB_CREATED",
            entity: "ExportJob",
            entityId: job._id.toString(),
            newValue: data,
        })

        return serializeDoc(job.toObject())
    }

    /**
     * Complete Export Job (System Action usually or Polling update)
     */
    static async markComplete(user: UserContext, data: CompleteExportJobInput) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const job = await ExportJob.findById(data.jobId)
        if (!job) throw new NotFoundError("Export job not found")

        job.status = data.status ?? 'COMPLETED'
        job.fileUrl = data.fileUrl ?? job.fileUrl
        job.errorMessage = data.errorMessage
        job.completedAt = new Date()
        job.startedAt ??= new Date()

        await job.save()

        await AuditLog.create({
            userId: user.id,
            action: "EXPORT_JOB_COMPLETED",
            entity: "ExportJob",
            entityId: job._id.toString(),
            newValue: { status: job.status, fileUrl: job.fileUrl, errorMessage: job.errorMessage },
        })

        return serializeDoc(job.toObject())
    }

    /**
     * List export jobs with optional filters.
     */
    static async listJobs(user: UserContext, filters: ListExportJobsInput) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const query: Record<string, unknown> = {}
        if (filters.entityType) query.entityType = filters.entityType
        if (filters.status) query.status = filters.status

        if (hasRole(user.role, OPERATOR_ROLES) && filters.requestedById) {
            query.requestedBy = filters.requestedById
        }

        if (!hasRole(user.role, OPERATOR_ROLES)) {
            query.requestedBy = user.id
        }

        const jobs = await ExportJob.find(query)
            .sort({ createdAt: -1 })
            .limit(filters.limit)
            .lean()

        return jobs.map((job) => serializeDoc(job))
    }

    /**
     * Process pending jobs into terminal states and assign download URLs.
     */
    static async processPendingJobs(user: UserContext, data: ProcessPendingExportJobsInput) {
        if (!ExportService.isOperator(user)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const auditUserId = await resolveAuditUserId(user.id)

        const summary = {
            processed: 0,
            completed: 0,
            failed: 0,
            deadLetter: 0,
        }

        const now = new Date()

        const candidates = await ExportJob.find({
            status: { $in: ['PENDING', 'FAILED'] },
            $or: [
                { nextAttemptAt: { $lte: now } },
                { nextAttemptAt: null },
            ],
            $expr: {
                $lt: [
                    { $ifNull: ['$attempts', 0] },
                    { $ifNull: ['$maxAttempts', DEFAULT_EXPORT_MAX_ATTEMPTS] },
                ],
            },
        })
            .sort({ nextAttemptAt: 1, createdAt: 1 })
            .limit(data.limit)
            .select('_id')
            .lean()

        for (const candidate of candidates) {
            const claimed = await ExportJob.findOneAndUpdate(
                {
                    _id: candidate._id,
                    status: { $in: ['PENDING', 'FAILED'] },
                    $or: [
                        { nextAttemptAt: { $lte: new Date() } },
                        { nextAttemptAt: null },
                    ],
                    $expr: {
                        $lt: [
                            { $ifNull: ['$attempts', 0] },
                            { $ifNull: ['$maxAttempts', DEFAULT_EXPORT_MAX_ATTEMPTS] },
                        ],
                    },
                },
                {
                    $set: {
                        status: 'PROCESSING',
                        startedAt: new Date(),
                        lastAttemptAt: new Date(),
                        errorMessage: null,
                        completedAt: null,
                    },
                    $inc: {
                        attempts: 1,
                    },
                },
                { new: true }
            )

            if (!claimed) {
                continue
            }

            summary.processed += 1

            try {
                const mapped = ExportService.mapJobForProcessing({
                    ...claimed.toObject(),
                    _id: claimed._id.toString(),
                    requestedBy: claimed.requestedBy.toString(),
                })

                // Validate data extraction before exposing download URL.
                await ExportService.generateRows(mapped)

                claimed.status = 'COMPLETED'
                claimed.fileUrl = ExportService.getDownloadUrl(claimed._id.toString())
                claimed.completedAt = new Date()
                claimed.errorMessage = null
                claimed.nextAttemptAt = new Date()
                await claimed.save()

                summary.completed += 1

                if (auditUserId) {
                    await AuditLog.create({
                        userId: auditUserId,
                        action: "EXPORT_JOB_COMPLETED",
                        entity: "ExportJob",
                        entityId: claimed._id.toString(),
                        newValue: {
                            status: claimed.status,
                            fileUrl: claimed.fileUrl,
                            attempts: claimed.attempts,
                        },
                    })
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Export generation failed'
                const attempts = claimed.attempts || 1
                const maxAttempts = claimed.maxAttempts || DEFAULT_EXPORT_MAX_ATTEMPTS
                const shouldDeadLetter = attempts >= maxAttempts

                claimed.status = shouldDeadLetter ? 'DEAD_LETTER' : 'FAILED'
                claimed.errorMessage = message
                claimed.completedAt = shouldDeadLetter ? new Date() : null
                claimed.nextAttemptAt = shouldDeadLetter
                    ? new Date()
                    : new Date(Date.now() + computeRetryDelayMs(attempts))

                await claimed.save()

                if (shouldDeadLetter) {
                    summary.deadLetter += 1
                } else {
                    summary.failed += 1
                }

                if (auditUserId) {
                    await AuditLog.create({
                        userId: auditUserId,
                        action: shouldDeadLetter ? "EXPORT_JOB_DEAD_LETTERED" : "EXPORT_JOB_FAILED",
                        entity: "ExportJob",
                        entityId: claimed._id.toString(),
                        newValue: {
                            status: claimed.status,
                            errorMessage: message,
                            attempts,
                            maxAttempts,
                            nextAttemptAt: claimed.nextAttemptAt,
                        },
                    })
                }
            }
        }

        return summary
    }

    /**
     * Resolve a completed export job and its rows for secure downloads.
     */
    static async getDownloadPayload(user: UserContext, jobId: string) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const job = await ExportJob.findById(jobId).lean()
        if (!job) throw new NotFoundError("Export job not found")

        const requestedBy = job.requestedBy.toString()
        if (!ExportService.canAccessJob(user, requestedBy)) {
            throw new ForbiddenError("Forbidden")
        }

        if (job.status !== 'COMPLETED') {
            throw new AppError("Export job is not ready for download")
        }

        await logDataAccess(user.id, {
            entity: 'ExportJob',
            entityId: jobId,
            action: 'EXPORT',
        })

        const mappedJob = ExportService.mapJobForProcessing({
            ...job,
            _id: job._id.toString(),
            requestedBy,
        })

        const rows = await ExportService.generateRows(mappedJob)
        return {
            job: serializeDoc(job),
            rows,
        }
    }
}
