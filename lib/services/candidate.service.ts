
import connectDB from "@/lib/db/mongodb"
import Candidate, { CandidateStatus } from "@/lib/db/models/Candidate"
import CandidateActivity from "@/lib/db/models/CandidateActivity"
import Requirement, { RequirementStatus } from "@/lib/db/models/Requirement"
import Company from "@/lib/db/models/Company"
import AuditLog from "@/lib/db/models/AuditLog"
import mongoose from "mongoose"
import { AppError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/core/app-error"
import { serializeDocs } from "@/lib/utils/serialize"
import { terminalStates } from "@/lib/workflow/state-machine"
import { InvoiceService } from "@/lib/services/invoice.service"
import { generateCandidateEmbedding } from "@/lib/automation/embeddings"
import { logDataAccess, logDataAccessMany, logDataMutation } from "@/lib/workflow/governance"
import { z } from "zod"

// Zod Schemas for Input Validation
export const CandidateSchema = z.object({
    requirementId: z.string().min(1),
    applicationFormId: z.string().optional(),
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email(),
    resumeUrl: z.string().min(1).optional(),
    skills: z.array(z.string().min(1)).default([]),
    college: z.string().optional(),
    yearsExperience: z.number().nonnegative().optional(),
})

export const UpdateCandidateStatusSchema = z.object({
    candidateId: z.string().min(1),
    status: z.enum(['APPLIED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'JOINED', 'REJECTED']),
    // Optional payloads used for validation when transitioning
    phoneLog: z.string().optional(),
    interview: z.object({ datetime: z.string().min(1), interviewerEmail: z.string().email() }).optional(),
    rejectionReasonCode: z.string().optional(),
    offeredCtc: z.number().nonnegative().optional(),
})

export const UpdateCandidateProfileSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(2).optional(),
    phone: z.string().min(8).optional(),
    email: z.string().email().optional(),
    resumeUrl: z.string().min(1).optional(),
    skills: z.array(z.string().min(1)).optional(),
    college: z.string().optional(),
    yearsExperience: z.number().nonnegative().optional(),
})

export const GetCandidateActivitiesSchema = z.object({
    candidateId: z.string().min(1),
    limit: z.number().int().min(1).max(100).optional().default(30),
})

// Types
export type CreateCandidateInput = z.infer<typeof CandidateSchema>
export type UpdateCandidateStatusInput = z.infer<typeof UpdateCandidateStatusSchema>
export type UpdateCandidateProfileInput = z.infer<typeof UpdateCandidateProfileSchema>
export type GetCandidateActivitiesInput = z.infer<typeof GetCandidateActivitiesSchema>

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'] as const

function isTransactionUnsupportedError(error: unknown) {
    return error instanceof Error && /Transaction numbers are only allowed on a replica set member or mongos/i.test(error.message)
}

function toStatusActivityNote(previousStatus: string, payload: UpdateCandidateStatusInput): string {
    const details: string[] = []

    if (payload.phoneLog) {
        details.push(`Phone log: ${payload.phoneLog}`)
    }

    if (payload.interview?.datetime) {
        details.push(`Interview: ${payload.interview.datetime}`)
    }

    if (payload.interview?.interviewerEmail) {
        details.push(`Interviewer: ${payload.interview.interviewerEmail}`)
    }

    if (payload.offeredCtc !== undefined) {
        details.push(`Offered CTC: ${payload.offeredCtc}`)
    }

    if (payload.rejectionReasonCode) {
        details.push(`Rejection reason: ${payload.rejectionReasonCode}`)
    }

    const baseNote = `Status updated from ${previousStatus} to ${payload.status}`
    return details.length > 0 ? `${baseNote}. ${details.join(' | ')}` : baseNote
}

async function appendCandidateActivity(
    userId: string,
    candidateId: string,
    type: string,
    notes: string,
    session?: mongoose.ClientSession
) {
    const payload = {
        userId,
        candidateId,
        type,
        notes,
    }

    if (session) {
        await CandidateActivity.create([payload], { session })
    } else {
        await CandidateActivity.create(payload)
    }
}

export class CandidateService {
    /**
     * Create Candidate
     */
    static async create(user: UserContext, data: CreateCandidateInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const requirement = await Requirement.findById(data.requirementId)
        if (!requirement) throw new NotFoundError("Requirement not found")

        if (terminalStates.includes(requirement.status as RequirementStatus)) {
            throw new AppError("Requirement is closed")
        }

        // Duplicate Check (Email + Requirement)
        const existing = await Candidate.findOne({
            email: data.email.toLowerCase(),
            requirementId: data.requirementId,
            deletedAt: null
        })

        if (existing) {
            throw new ConflictError("Candidate already exists for this requirement")
        }

        const embedding = generateCandidateEmbedding({
            name: data.name,
            skills: data.skills,
            college: data.college,
            yearsExperience: data.yearsExperience,
        })

        const candidate = await Candidate.create({
            ...data,
            email: data.email.toLowerCase(),
            embedding,
        })

        await AuditLog.create({
            userId: user.id,
            action: "CANDIDATE_CREATED",
            entity: "Candidate",
            entityId: candidate._id.toString(),
            newValue: { requirementId: requirement._id.toString(), email: candidate.email },
        })

        await appendCandidateActivity(
            user.id,
            candidate._id.toString(),
            'CREATED',
            `Candidate profile created for requirement ${requirement._id.toString()}`
        )

        await logDataMutation(user.id, {
            entity: 'Candidate',
            entityId: candidate._id.toString(),
            action: 'CREATE',
        })

        return candidate.toObject()
    }

    /**
     * Update Candidate Status
     */
    static async updateStatus(user: UserContext, payload: UpdateCandidateStatusInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()
        let warning: string | undefined
        let updatedCandidate: any = null

        const runStatusUpdate = async (session?: mongoose.ClientSession) => {
            const candidateQuery = Candidate.findById(payload.candidateId)
            if (session) candidateQuery.session(session)

            const candidate = await candidateQuery
            if (!candidate) throw new NotFoundError("Candidate not found")

            const requirementQuery = Requirement.findById(candidate.requirementId)
            if (session) requirementQuery.session(session)

            const requirement = await requirementQuery
            if (!requirement) throw new NotFoundError("Requirement not found")

            const previousStatus = candidate.status
            const to = payload.status
            const now = new Date()

            // State Machine & Validations
            if (to === 'SHORTLISTED') {
                if (!payload.phoneLog) throw new AppError("Phone log is required to shortlist")
                candidate.shortlistedAt = now
            }

            if (to === 'INTERVIEWED') {
                const interview = payload.interview
                if (!interview?.datetime || !interview?.interviewerEmail) {
                    throw new AppError("Interview datetime and interviewer email are required")
                }
                candidate.interviewedAt = now
            }

            if (to === 'OFFERED') {
                if (payload.offeredCtc === undefined) {
                    throw new AppError("Offered CTC is required")
                }
                candidate.offeredAt = now

                if (requirement.salaryMax && payload.offeredCtc > requirement.salaryMax) {
                    warning = 'Offered CTC exceeds requirement budget (margin warning)'
                }

                if (requirement.status === 'INTERVIEWING' || requirement.status === 'SOURCING') {
                    requirement.status = 'OFFER'
                }
            }

            if (to === 'JOINED') {
                if (payload.offeredCtc === undefined) {
                    throw new AppError("Offered CTC is required before marking candidate as joined")
                }

                candidate.joinedAt = now
                requirement.status = 'CLOSED_HIRED'
            }

            if (to === 'REJECTED') {
                if (!payload.rejectionReasonCode) {
                    throw new AppError("Rejection reason code is required")
                }
                candidate.rejectedAt = now
            }

            candidate.status = to as CandidateStatus
            await candidate.save(session ? { session } : undefined)
            await requirement.save(session ? { session } : undefined)

            const auditPayload = {
                userId: user.id,
                action: "CANDIDATE_STATUS_UPDATED",
                entity: "Candidate",
                entityId: candidate._id.toString(),
                newValue: { status: to },
            }

            if (session) {
                await AuditLog.create([auditPayload], { session })
            } else {
                await AuditLog.create(auditPayload)
            }

            await appendCandidateActivity(
                user.id,
                candidate._id.toString(),
                'STATUS_CHANGE',
                toStatusActivityNote(previousStatus, payload),
                session
            )

            // Create invoice exactly once for first JOINED transition.
            if (to === 'JOINED' && previousStatus !== 'JOINED') {
                await InvoiceService.create(
                    { id: user.id, role: user.role },
                    {
                        companyId: requirement.companyId.toString(),
                        requirementId: requirement._id.toString(),
                        amount: payload.offeredCtc as number,
                        currency: 'INR',
                    },
                    { session: session ?? null, skipPermissionCheck: true }
                )
            }

            updatedCandidate = candidate.toObject()
        }

        const session = await mongoose.startSession()

        try {
            try {
                await session.withTransaction(async () => {
                    await runStatusUpdate(session)
                })
            } catch (error) {
                if (!isTransactionUnsupportedError(error)) {
                    throw error
                }

                await runStatusUpdate()
            }
        } finally {
            await session.endSession()
        }

        await logDataMutation(user.id, {
            entity: 'Candidate',
            entityId: payload.candidateId,
            action: 'UPDATE',
        })

        return { candidate: updatedCandidate, warning }
    }

    /**
     * Get All Candidates (with Filter)
     */
    static async getAll(user: UserContext, filters?: { requirementId?: string; status?: string }) {
        if (!ALLOWED_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const query: Record<string, any> = { deletedAt: null }
        if (filters?.requirementId) query.requirementId = filters.requirementId
        if (filters?.status) query.status = filters.status

        const candidates = await Candidate.find(query).sort({ createdAt: -1 }).lean()

        // Populate Requirement & Company
        const requirementIds = [...new Set(candidates.map(c => c.requirementId.toString()))]
        const requirements = await Requirement.find({ _id: { $in: requirementIds } }).lean()
        const requirementMap = Object.fromEntries(requirements.map(r => [r._id.toString(), r]))

        const companyIds = [...new Set(requirements.map(r => r.companyId.toString()))]
        const companies = await Company.find({ _id: { $in: companyIds } }).lean()
        const companyMap = Object.fromEntries(companies.map(c => [c._id.toString(), c]))

        const enrichedCandidates = candidates.map(candidate => {
            const req = requirementMap[candidate.requirementId.toString()]
            const company = req ? companyMap[req.companyId.toString()] : null

            return {
                ...candidate,
                _id: candidate._id.toString(),
                requirementId: candidate.requirementId.toString(),
                requirement: req ? {
                    ...req,
                    _id: req._id.toString(),
                    companyId: req.companyId.toString(),
                    company: company ? company.name : 'Unknown Company',
                    companyDetails: company
                } : null
            }
        })

        await logDataAccessMany(
            user.id,
            enrichedCandidates.map((candidate) => ({
                entity: 'Candidate',
                entityId: candidate._id,
                action: 'VIEW' as const,
            }))
        )

        return enrichedCandidates
    }

    /**
     * Get Candidate By ID
     */
    static async getById(user: UserContext, id: string) {
        if (!ALLOWED_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const candidate = await Candidate.findOne({ _id: id, deletedAt: null }).lean()
        if (!candidate) throw new NotFoundError("Candidate not found")

        const requirement = await Requirement.findById(candidate.requirementId).lean()
        const company = requirement ? await Company.findById(requirement.companyId).lean() : null

        await logDataAccess(user.id, {
            entity: 'Candidate',
            entityId: id,
            action: 'VIEW',
        })

        return {
            ...candidate,
            _id: candidate._id.toString(),
            requirementId: candidate.requirementId.toString(),
            requirement: requirement ? {
                ...requirement,
                _id: requirement._id.toString(),
                companyId: requirement.companyId.toString(),
                company: company ? company.name : 'Unknown Company',
                companyDetails: company
            } : null
        }
    }

    /**
     * Update Candidate Profile
     */
    static async update(user: UserContext, payload: UpdateCandidateProfileInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const candidate = await Candidate.findOne({ _id: payload.id, deletedAt: null })
        if (!candidate) throw new NotFoundError("Candidate not found")

        const oldValue = candidate.toObject()

        if (payload.name !== undefined) candidate.name = payload.name
        if (payload.phone !== undefined) candidate.phone = payload.phone
        if (payload.email !== undefined) candidate.email = payload.email.toLowerCase()
        if (payload.resumeUrl !== undefined) candidate.resumeUrl = payload.resumeUrl
        if (payload.skills !== undefined) candidate.skills = payload.skills
        if (payload.college !== undefined) candidate.college = payload.college
        if (payload.yearsExperience !== undefined) candidate.yearsExperience = payload.yearsExperience

        candidate.embedding = generateCandidateEmbedding({
            name: candidate.name,
            skills: candidate.skills,
            college: candidate.college,
            yearsExperience: candidate.yearsExperience,
            resumeFileName: candidate.resumeFileName,
        })

        await candidate.save()

        await AuditLog.create({
            userId: user.id,
            action: "CANDIDATE_UPDATED",
            entity: "Candidate",
            entityId: candidate._id.toString(),
            oldValue,
            newValue: candidate.toObject(),
        })

        await appendCandidateActivity(
            user.id,
            candidate._id.toString(),
            'PROFILE_UPDATED',
            'Candidate profile details were updated'
        )

        await logDataMutation(user.id, {
            entity: 'Candidate',
            entityId: candidate._id.toString(),
            action: 'UPDATE',
        })

        return candidate.toObject()
    }

    /**
     * Delete Candidate (Soft Delete)
     */
    static async delete(user: UserContext, id: string) {
        if (!ALLOWED_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const candidate = await Candidate.findOne({ _id: id, deletedAt: null })
        if (!candidate) throw new NotFoundError("Candidate not found")

        candidate.deletedAt = new Date()
        await candidate.save()

        await AuditLog.create({
            userId: user.id,
            action: "CANDIDATE_DELETED",
            entity: "Candidate",
            entityId: candidate._id.toString(),
            oldValue: { name: candidate.name, email: candidate.email },
        })

        await appendCandidateActivity(
            user.id,
            candidate._id.toString(),
            'ARCHIVED',
            'Candidate profile was archived'
        )

        await logDataMutation(user.id, {
            entity: 'Candidate',
            entityId: candidate._id.toString(),
            action: 'DELETE',
        })

        return { success: true }
    }

    /**
     * Restore Candidate
     */
    static async restore(user: UserContext, id: string) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) throw new ForbiddenError("Forbidden")

        await connectDB()

        const candidate = await Candidate.findById(id)
        if (!candidate) throw new NotFoundError("Candidate not found")
        if (!candidate.deletedAt) throw new AppError("Candidate is not archived")

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        if (candidate.deletedAt < thirtyDaysAgo) {
            throw new AppError("Restore window expired (30 days)")
        }

        const oldDeletedAt = candidate.deletedAt
        candidate.deletedAt = null
        await candidate.save()

        await AuditLog.create({
            userId: user.id,
            action: "CANDIDATE_RESTORED",
            entity: "Candidate",
            entityId: id,
            oldValue: { deletedAt: oldDeletedAt },
            newValue: { deletedAt: null },
        })

        await appendCandidateActivity(
            user.id,
            candidate._id.toString(),
            'RESTORED',
            'Candidate profile was restored from archive'
        )

        await logDataMutation(user.id, {
            entity: 'Candidate',
            entityId: candidate._id.toString(),
            action: 'RESTORE',
        })

        return { success: true }
    }

    /**
     * Get Candidate Activity Timeline
     */
    static async getActivities(user: UserContext, payload: GetCandidateActivitiesInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const candidate = await Candidate.findById(payload.candidateId).select('_id').lean()
        if (!candidate) throw new NotFoundError("Candidate not found")

        const activities = await CandidateActivity.find({ candidateId: payload.candidateId })
            .sort({ createdAt: -1 })
            .limit(payload.limit)
            .populate('userId', 'name email role')
            .lean()

        await logDataAccess(user.id, {
            entity: 'Candidate',
            entityId: payload.candidateId,
            action: 'VIEW',
        })

        return serializeDocs(activities)
    }

    /**
     * Get Pipeline Metrics
     */
    static async getPipeline(user: UserContext, requirementId: string) {
        if (!user.id) throw new ForbiddenError("Unauthorized")

        await connectDB()

        const pipeline = await Candidate.aggregate([
            { $match: { requirementId: new mongoose.Types.ObjectId(requirementId) } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ])

        const candidates = await Candidate.find({ requirementId }).sort({ createdAt: -1 })

        await Promise.all([
            logDataAccess(user.id, {
                entity: 'Requirement',
                entityId: requirementId,
                action: 'VIEW',
            }),
            logDataAccessMany(
                user.id,
                candidates.map((candidate) => ({
                    entity: 'Candidate',
                    entityId: candidate._id.toString(),
                    action: 'VIEW' as const,
                }))
            ),
        ])

        return {
            pipeline,
            candidates: serializeDocs(candidates)
        }
    }
}
