import { subDays } from "date-fns"
import connectDB from "@/lib/db/mongodb"
import Company from "@/lib/db/models/Company"
import Requirement from "@/lib/db/models/Requirement"
import Activity from "@/lib/db/models/Activity"
import AuditLog from "@/lib/db/models/AuditLog"
import { AppError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { RequirementSchema, RequirementStatusSchema } from "@/lib/validators/common"
import { formatMmdId, getRequirementIdPrefix } from "@/lib/utils"
import { RequirementStateMachine, terminalStates } from "@/lib/workflow/state-machine"
import { AutomationService } from "@/lib/services/automation.service"
import { ensureSequenceFloor, getNextSequence } from "@/lib/services/sequence.service"
import { generateRequirementEmbedding } from "@/lib/automation/embeddings"
import { logDataAccess, logDataAccessMany, logDataMutation } from "@/lib/workflow/governance"
import { z } from "zod"

// Types
export type RequirementInput = z.infer<typeof RequirementSchema>
export type UpdateRequirementStatusInput = {
    requirementId: string
    status: z.infer<typeof RequirementStatusSchema>
    comment: string
}

const sm = new RequirementStateMachine()
const CREATOR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER', 'SCRAPER'] as const
const STALLED_DAYS = Number(process.env.DASHBOARD_STALLED_DAYS ?? 15)

function getMouValidationError(company: any) {
    if (company.mouStatus !== 'SIGNED') {
        return "Company MOU must be signed before requirements can be opened"
    }

    if (!company.mouStartDate || !company.mouEndDate) {
        return "Signed company MOU must include valid start and end dates"
    }

    const now = Date.now()
    const startDate = new Date(company.mouStartDate)
    const endDate = new Date(company.mouEndDate)

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return "Company MOU dates are invalid"
    }

    const startOfDayUtc = Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate()
    )
    const endOfDayUtc = Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        23,
        59,
        59,
        999
    )

    if (startOfDayUtc > now) {
        return "Company MOU is not active yet"
    }

    if (endOfDayUtc < now) {
        return "Company MOU has expired"
    }

    return null
}

// Helper types
interface UserContext {
    id: string
    role: string
}

export class RequirementService {
    /**
     * Create Requirement
     */
    static async create(user: UserContext, data: RequirementInput) {
        if (!CREATOR_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const company = await Company.findById(data.companyId)
        if (!company || company.deletedAt) {
            throw new NotFoundError("Company not found")
        }

        // MOU Contract Enforcement
        const mouError = getMouValidationError(company)
        if (mouError) {
            throw new AppError(mouError)
        }

        // Generate requirement reference code using the company sector.
        const today = new Date()
        const prefix = getRequirementIdPrefix(company.sector, today)
        const sequenceKey = `requirement:${prefix}`
        const latestForPrefix = await Requirement.findOne({ mmdId: { $regex: `^${prefix}-\\d+$` } })
            .sort({ mmdId: -1 })
            .select('mmdId')
            .lean()

        if (latestForPrefix?.mmdId) {
            const lastToken = latestForPrefix.mmdId.split('-').pop() || '0'
            const lastSequence = Number.parseInt(lastToken, 10)
            await ensureSequenceFloor(sequenceKey, Number.isFinite(lastSequence) ? lastSequence : 0)
        }

        const sequence = await getNextSequence(sequenceKey)
        const mmdId = formatMmdId(company.sector, today, sequence)
        const jdEmbedding = generateRequirementEmbedding({
            jobTitle: data.jobTitle,
            fullDescription: data.fullDescription,
            skills: data.skills,
            location: data.location,
            workMode: data.workMode,
        })

        const requirement = await Requirement.create({
            mmdId,
            companyId: data.companyId,
            jobTitle: data.jobTitle,
            fullDescription: data.fullDescription,
            skills: data.skills,
            experienceMin: data.experienceMin,
            experienceMax: data.experienceMax,
            salaryMin: data.salaryMin,
            salaryMax: data.salaryMax,
            openings: data.openings ?? 1,
            workMode: data.workMode,
            location: data.location,
            interviewClosingDate: data.interviewClosingDate,
            priority: data.priority ?? 'Medium',
            group: data.group,
            accountOwnerId: data.accountOwnerId,
            status: data.status ?? 'PENDING_INTAKE', // Explicit default
            applicationFormId: data.applicationFormId,
            whatsAppMessage: data.whatsAppMessage,
            emailMessage: data.emailMessage,
            linkedInPost: data.linkedInPost,
            automationStatus: 'NOT_STARTED',
            automationLastError: null,
            automationLastAttemptAt: null,
            automationLastSuccessAt: null,
            automationAttempts: 0,
            jdEmbedding,
        })

        // Automation Hook (Best Effort)
        try {
            await AutomationService.generateAutomation(
                { id: user.id, role: user.role },
                { requirementId: requirement._id.toString() }
            )
        } catch {
            // Keep requirement creation successful even if automation generation fails.
        }

        await AuditLog.create({
            userId: user.id,
            action: "REQUIREMENT_CREATED",
            entity: "Requirement",
            entityId: requirement._id.toString(),
            newValue: data,
        })

        await logDataMutation(user.id, {
            entity: 'Requirement',
            entityId: requirement._id.toString(),
            action: 'CREATE',
        })

        const latestRequirement = await Requirement.findById(requirement._id).lean()
        return latestRequirement ?? requirement.toObject()
    }

    /**
     * Update Requirement Status
     */
    static async updateStatus(user: UserContext, payload: UpdateRequirementStatusInput) {
        await connectDB()

        const requirement = await Requirement.findById(payload.requirementId)
        if (!requirement) throw new NotFoundError("Requirement not found")

        // RBAC: Admin or Owner
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && requirement.accountOwnerId.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        // State Machine Check
        if (!sm.canTransition(requirement.status, payload.status)) {
            const allowedNext = sm.getNextStates(requirement.status)
            throw new AppError(`Invalid transition from ${requirement.status} to ${payload.status}. Allowed: ${allowedNext.join(', ')}`)
        }

        const oldStatus = requirement.status
        requirement.status = payload.status
        await requirement.save()

        await Activity.create({
            requirementId: requirement._id,
            userId: user.id,
            type: 'STATUS_CHANGE',
            summary: payload.comment,
            outcome: 'PENDING',
            metadata: { from: oldStatus, to: payload.status },
            nextFollowUpDate: terminalStates.includes(payload.status) ? null : undefined,
        })

        await AuditLog.create({
            userId: user.id,
            action: "REQUIREMENT_STATUS_UPDATED",
            entity: "Requirement",
            entityId: requirement._id.toString(),
            oldValue: { status: oldStatus },
            newValue: { status: payload.status },
        })

        await logDataMutation(user.id, {
            entity: 'Requirement',
            entityId: requirement._id.toString(),
            action: 'UPDATE',
        })

        return requirement.toObject()
    }

    /**
     * Get All Requirements with Filters & Stalled logic
     */
    static async getAll(user: UserContext, filters?: { status?: string; companyId?: string; group?: string; stalled?: boolean }) {
        if (!CREATOR_ROLES.includes(user.role as any)) { // Reuse creator check as generic read access? Action said "allowRole"
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const query: Record<string, any> = { deletedAt: null }

        // Filters
        if (filters?.status) query.status = filters.status
        if (filters?.companyId) query.companyId = filters.companyId
        if (filters?.group) query.group = filters.group

        // RBAC: Non-admin sees only owned
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) {
            query.accountOwnerId = user.id
        }

        const requirements = await Requirement.find(query)
            .sort({ createdAt: -1 })
            .lean()

        // Stalled Logic Calculation
        const activeRequirementIds = requirements
            .filter(r => ['ACTIVE', 'SOURCING', 'INTERVIEWING'].includes(r.status))
            .map(r => r._id)

        const activityAgg = await Activity.aggregate([
            { $match: { requirementId: { $in: activeRequirementIds } } },
            { $group: { _id: '$requirementId', lastActivity: { $max: '$createdAt' } } },
        ])

        const lastActivityMap = new Map<string, Date>(
            activityAgg.map((a: any) => [a._id.toString(), a.lastActivity ? new Date(a.lastActivity) : new Date()])
        )

        const stalledCutoff = subDays(new Date(), STALLED_DAYS)

        // Fetch Companies & Users
        const companyIds = [...new Set(requirements.map(r => r.companyId.toString()))]
        const ownerIds = [...new Set(requirements.map(r => r.accountOwnerId.toString()))]

        const [companies, users] = await Promise.all([
            Company.find({ _id: { $in: companyIds } }).lean(),
            connectDB().then(() => import("@/lib/db/models/User").then(m => m.default.find({ _id: { $in: ownerIds } }).lean()))
        ])

        const companyMap = Object.fromEntries(companies.map(c => [c._id.toString(), c]))
        const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]))

        const enriched = requirements.map(req => {
            const lastActivity = lastActivityMap.get(req._id.toString()) ?? req.updatedAt ?? req.createdAt ?? new Date()
            const isStalled =
                ['ACTIVE', 'SOURCING', 'INTERVIEWING'].includes(req.status) &&
                lastActivity <= stalledCutoff

            const company = companyMap[req.companyId.toString()]
            const owner = userMap[req.accountOwnerId.toString()]

            return {
                ...req,
                _id: req._id.toString(),
                companyId: req.companyId.toString(),
                accountOwnerId: req.accountOwnerId.toString(),
                company: company ? company.name : 'Unknown Company',
                owner: owner ? owner.name : 'Unknown Owner',
                companyDetails: company, // Keep object in separate field if needed
                lastActivityAt: lastActivity,
                stalled: isStalled,
            }
        })

        const scoped = filters?.stalled ? enriched.filter(req => req.stalled) : enriched

        await logDataAccessMany(
            user.id,
            scoped.map((requirement) => ({
                entity: 'Requirement',
                entityId: requirement._id,
                action: 'VIEW' as const,
            }))
        )

        return scoped
    }

    /**
     * Get By ID
     */
    static async getById(user: UserContext, id: string) {
        if (!CREATOR_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const requirement = await Requirement.findOne({ _id: id, deletedAt: null }).lean()
        if (!requirement) throw new NotFoundError("Requirement not found")

        // RBAC
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && requirement.accountOwnerId.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        const company = await Company.findById(requirement.companyId).lean()
        const activities = await Activity.find({ requirementId: requirement._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean()

        await logDataAccess(user.id, {
            entity: 'Requirement',
            entityId: id,
            action: 'VIEW',
        })

        return {
            ...requirement,
            _id: requirement._id.toString(),
            companyId: requirement.companyId.toString(),
            accountOwnerId: requirement.accountOwnerId.toString(),
            company: company ? { ...company, _id: company._id.toString() } : null,
            activities: activities.map(a => ({
                ...a,
                _id: a._id.toString(),
                requirementId: a.requirementId.toString(),
                userId: a.userId?.toString()
            })),
        }
    }

    /**
     * Update Requirement (Fields)
     */
    static async update(user: UserContext, id: string, data: any) {
        if (!CREATOR_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const requirement = await Requirement.findOne({ _id: id, deletedAt: null })
        if (!requirement) throw new NotFoundError("Requirement not found")

        // RBAC
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && requirement.accountOwnerId.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        const oldValue = requirement.toObject()

        if (data.companyId && data.companyId !== requirement.companyId.toString()) {
            const company = await Company.findById(data.companyId)
            if (!company || company.deletedAt) {
                throw new NotFoundError("Company not found")
            }

            const mouError = getMouValidationError(company)
            if (mouError) {
                throw new AppError(mouError)
            }

            requirement.companyId = data.companyId
        }

        // Apply Updates
        const fieldsToUpdate = [
            'jobTitle',
            'fullDescription',
            'skills',
            'workMode',
            'location',
            'priority',
            'group',
            'accountOwnerId',
            'applicationFormId',
            'whatsAppMessage',
            'emailMessage',
            'linkedInPost',
        ]
        fieldsToUpdate.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(data, field)) {
                (requirement as any)[field] = data[field]
            }
        })

        if (data.experienceMin !== undefined) requirement.experienceMin = data.experienceMin
        if (data.experienceMax !== undefined) requirement.experienceMax = data.experienceMax
        if (data.salaryMin !== undefined) requirement.salaryMin = data.salaryMin
        if (data.salaryMax !== undefined) requirement.salaryMax = data.salaryMax
        if (data.openings !== undefined) requirement.openings = data.openings
        if (data.interviewClosingDate !== undefined) requirement.interviewClosingDate = data.interviewClosingDate

        requirement.jdEmbedding = generateRequirementEmbedding({
            jobTitle: requirement.jobTitle,
            fullDescription: requirement.fullDescription,
            skills: requirement.skills,
            location: requirement.location,
            workMode: requirement.workMode,
        })

        await requirement.save()

        await AuditLog.create({
            userId: user.id,
            action: "REQUIREMENT_UPDATED",
            entity: "Requirement",
            entityId: requirement._id.toString(),
            oldValue,
            newValue: requirement.toObject(),
        })

        await logDataMutation(user.id, {
            entity: 'Requirement',
            entityId: requirement._id.toString(),
            action: 'UPDATE',
        })

        return requirement.toObject()
    }

    /**
     * Freeze Requirement
     */
    static async freeze(user: UserContext, id: string, comment?: string) {
        if (!['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'].includes(user.role)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const requirement = await Requirement.findOne({ _id: id, deletedAt: null })
        if (!requirement) throw new NotFoundError("Requirement not found")

        if (terminalStates.includes(requirement.status)) {
            throw new AppError("Cannot freeze a closed requirement")
        }

        requirement.status = 'ON_HOLD'
        await requirement.save()

        await Activity.create({
            requirementId: requirement._id,
            userId: user.id,
            type: 'STATUS_CHANGE',
            summary: `Requirement frozen` + (comment ? `: ${comment}` : ''),
            outcome: 'PENDING',
            nextFollowUpDate: null, // Should null be passed? Mongoose handles explicit null
        })

        await AuditLog.create({
            userId: user.id,
            action: "REQUIREMENT_FROZEN",
            entity: "Requirement",
            entityId: requirement._id.toString(),
            newValue: { status: 'ON_HOLD', comment },
        })

        await logDataMutation(user.id, {
            entity: 'Requirement',
            entityId: requirement._id.toString(),
            action: 'UPDATE',
        })

        return requirement.toObject()
    }

    /**
     * Reassign Requirement
     */
    static async reassign(user: UserContext, id: string, newOwnerId: string, comment?: string) {
        if (!['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'].includes(user.role)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const requirement = await Requirement.findOne({ _id: id, deletedAt: null })
        if (!requirement) throw new NotFoundError("Requirement not found")

        const oldOwner = requirement.accountOwnerId?.toString()
        requirement.accountOwnerId = newOwnerId as any
        await requirement.save()

        await Activity.create({
            requirementId: requirement._id,
            userId: user.id,
            type: 'STATUS_CHANGE',
            summary: `Requirement reassigned to ${newOwnerId}` + (comment ? `: ${comment}` : ''),
            outcome: 'PENDING',
            metadata: { fromOwner: oldOwner, toOwner: newOwnerId },
        })

        await AuditLog.create({
            userId: user.id,
            action: "REQUIREMENT_REASSIGNED",
            entity: "Requirement",
            entityId: requirement._id.toString(),
            oldValue: { accountOwnerId: oldOwner },
            newValue: { accountOwnerId: newOwnerId, comment },
        })

        await logDataMutation(user.id, {
            entity: 'Requirement',
            entityId: requirement._id.toString(),
            action: 'UPDATE',
        })

        return requirement.toObject()
    }

    /**
     * Archive Requirement
     */
    static async delete(user: UserContext, id: string) {
        if (!['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'].includes(user.role)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const requirement = await Requirement.findById(id)
        if (!requirement) throw new NotFoundError("Requirement not found")
        if (requirement.deletedAt) throw new AppError("Requirement is already archived")

        requirement.deletedAt = new Date()
        await requirement.save()

        await AuditLog.create({
            userId: user.id,
            action: "REQUIREMENT_ARCHIVED",
            entity: "Requirement",
            entityId: id,
            oldValue: { deletedAt: null },
            newValue: { deletedAt: requirement.deletedAt },
        })

        await logDataMutation(user.id, {
            entity: 'Requirement',
            entityId: id,
            action: 'DELETE',
        })

        return { success: true }
    }

    /**
     * Restore Requirement
     */
    static async restore(user: UserContext, id: string) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) throw new ForbiddenError("Forbidden")

        await connectDB()

        const requirement = await Requirement.findById(id)
        if (!requirement) throw new NotFoundError("Requirement not found")
        if (!requirement.deletedAt) throw new AppError("Requirement is not archived")

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        if (requirement.deletedAt < thirtyDaysAgo) {
            throw new AppError("Restore window expired (30 days)")
        }

        const oldDeletedAt = requirement.deletedAt
        requirement.deletedAt = null
        await requirement.save()

        await AuditLog.create({
            userId: user.id,
            action: "REQUIREMENT_RESTORED",
            entity: "Requirement",
            entityId: id,
            oldValue: { deletedAt: oldDeletedAt },
            newValue: { deletedAt: null },
        })

        await logDataMutation(user.id, {
            entity: 'Requirement',
            entityId: id,
            action: 'RESTORE',
        })

        return { success: true }
    }
}
