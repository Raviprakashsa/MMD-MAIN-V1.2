
import connectDB from "@/lib/db/mongodb"
import Placement, { PlacementStatus } from "@/lib/db/models/Placement"
import Requirement from "@/lib/db/models/Requirement"
import Candidate from "@/lib/db/models/Candidate"
import Company from "@/lib/db/models/Company"
import AuditLog from "@/lib/db/models/AuditLog"
import { AppError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/core/app-error"
import { serializeDoc } from "@/lib/utils/serialize"
import { z } from "zod"
import { PlacementSchema } from "@/lib/validators/common"

// Types
export type CreatePlacementInput = z.infer<typeof PlacementSchema>
export interface UpdatePlacementStatusInput {
    placementId: string
    status: PlacementStatus
    joiningDate?: Date
    backoutReason?: string
    paymentReceivedAt?: Date
}

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'] as const

export class PlacementService {
    /**
     * Create Placement
     */
    static async create(user: UserContext, data: CreatePlacementInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const requirement = await Requirement.findById(data.requirementId)
        if (!requirement) throw new NotFoundError("Requirement not found")

        // Role & Ownership Check
        // Account Owner or Admin/Coordinator can Add? 
        // Original logic: allow(session?.user?.role, requirement.accountOwnerId.toString(), userId)
        // Let's preserve strict ownership if not Admin/Coordinator? 
        // Actually, the original 'allow' function permitted ADMIN, COORDINATOR, RECRUITER (globally) OR Owner.
        // It seemed to imply that ANY Recruiter could add if they were in the ALLOWED list.
        // But the 'allow' function logic was: 
        // if (ALLOWED.includes(role)) return true
        // return !!accountOwnerId && !!userId && accountOwnerId === userId
        // Since ALLOWED included RECRUITER, any recruiter could add. 
        // We will stick to the ALLOWED_ROLES check at the top.

        const candidate = await Candidate.findById(data.candidateId)
        if (!candidate) throw new NotFoundError("Candidate not found")

        if (candidate.requirementId.toString() !== requirement._id.toString()) {
            throw new AppError("Candidate is not linked to this requirement")
        }

        const company = await Company.findById(data.companyId)
        if (!company || company.deletedAt) throw new NotFoundError("Company not found")

        if (company._id.toString() !== requirement.companyId.toString()) {
            throw new AppError("Company does not match requirement")
        }

        // Duplicate Check handled by DB unique index, but good to catch explicitly or let it throw
        const existing = await Placement.findOne({
            requirementId: data.requirementId,
            candidateId: data.candidateId
        })
        if (existing) throw new ConflictError("Placement already exists for this candidate and requirement")

        const placement = await Placement.create({
            ...data,
        })

        await AuditLog.create({
            userId: user.id,
            action: "PLACEMENT_CREATED",
            entity: "Placement",
            entityId: placement._id.toString(),
            newValue: data,
        })

        return serializeDoc(placement.toObject())
    }

    /**
     * Update Placement Status
     */
    static async updateStatus(user: UserContext, payload: UpdatePlacementStatusInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const placement = await Placement.findById(payload.placementId)
        if (!placement) throw new NotFoundError("Placement not found")

        const oldStatus = placement.status
        placement.status = payload.status

        if (payload.status === 'JOINED' && payload.joiningDate) {
            placement.joiningDate = payload.joiningDate
        }
        if (payload.status === 'BACKED_OUT' && payload.backoutReason) {
            placement.backoutReason = payload.backoutReason
        }
        if (payload.status === 'PAID') {
            placement.paymentReceivedAt = payload.paymentReceivedAt ?? new Date()
        }

        await placement.save()

        await AuditLog.create({
            userId: user.id,
            action: "PLACEMENT_STATUS_UPDATED",
            entity: "Placement",
            entityId: placement._id.toString(),
            oldValue: { status: oldStatus },
            newValue: { status: placement.status },
        })

        return serializeDoc(placement.toObject())
    }

    /**
     * Update Placement Details (Generic)
     */
    static async update(user: UserContext, id: string, data: Partial<CreatePlacementInput>) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const placement = await Placement.findById(id)
        if (!placement) throw new NotFoundError("Placement not found")

        const oldValue = placement.toObject()

        // Update fields
        if (data.status) placement.status = data.status
        if (data.joiningDate) placement.joiningDate = data.joiningDate
        if (data.feeAmount !== undefined) placement.feeAmount = data.feeAmount
        if (data.currency) placement.currency = data.currency
        if (data.invoiceNumber) placement.invoiceNumber = data.invoiceNumber
        if (data.invoiceUrl) placement.invoiceUrl = data.invoiceUrl
        if (data.paymentReceivedAt) placement.paymentReceivedAt = data.paymentReceivedAt
        if (data.backoutReason) placement.backoutReason = data.backoutReason
        if (data.notes) placement.notes = data.notes

        await placement.save()

        await AuditLog.create({
            userId: user.id,
            action: "PLACEMENT_UPDATED",
            entity: "Placement",
            entityId: placement._id.toString(),
            oldValue,
            newValue: data,
        })

        return serializeDoc(placement.toObject())
    }

    /**
     * Get All Placements
     */
    static async getAll(user: UserContext, filters?: { status?: string; companyId?: string; requirementId?: string }) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const query: Record<string, unknown> = {}
        if (filters?.status) query.status = filters.status
        if (filters?.companyId) query.companyId = filters.companyId
        if (filters?.requirementId) query.requirementId = filters.requirementId

        const placements = await Placement.find(query).sort({ createdAt: -1 }).lean()

        // Populate details manually for performance/control or use Mongoose populate
        // Original used manual aggregation. Let's replicate for consistency.
        const requirementIds = [...new Set(placements.map(p => p.requirementId.toString()))]
        const candidateIds = [...new Set(placements.map(p => p.candidateId.toString()))]
        const companyIds = [...new Set(placements.map(p => p.companyId.toString()))]

        const [requirements, candidates, companies] = await Promise.all([
            Requirement.find({ _id: { $in: requirementIds } }).lean(),
            Candidate.find({ _id: { $in: candidateIds } }).lean(),
            Company.find({ _id: { $in: companyIds } }).lean(),
        ])

        const reqMap = Object.fromEntries(requirements.map(r => [r._id.toString(), serializeDoc(r)]))
        const candMap = Object.fromEntries(candidates.map(c => [c._id.toString(), serializeDoc(c)]))
        const compMap = Object.fromEntries(companies.map(c => [c._id.toString(), serializeDoc(c)]))

        return placements.map(p => ({
            ...serializeDoc(p),
            requirement: reqMap[p.requirementId.toString()] || null,
            candidate: candMap[p.candidateId.toString()] || null,
            company: compMap[p.companyId.toString()] || null,
        }))
    }

    /**
     * Get Placement By ID
     */
    static async getById(user: UserContext, placementId: string) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const placement = await Placement.findById(placementId).lean()
        if (!placement) throw new NotFoundError("Placement not found")

        const [requirement, candidate, company] = await Promise.all([
            Requirement.findById(placement.requirementId).lean(),
            Candidate.findById(placement.candidateId).lean(),
            Company.findById(placement.companyId).lean(),
        ])

        return {
            ...serializeDoc(placement),
            requirement: requirement ? serializeDoc(requirement) : null,
            candidate: candidate ? serializeDoc(candidate) : null,
            company: company ? serializeDoc(company) : null,
        }
    }

    /**
     * Delete Placement (Hard Delete)
     */
    static async delete(user: UserContext, placementId: string) {
        // Only Admin or Coordinator
        if (!['SUPER_ADMIN', 'ADMIN', 'COORDINATOR'].includes(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const placement = await Placement.findById(placementId)
        if (!placement) throw new NotFoundError("Placement not found")

        const oldValue = placement.toObject()
        await Placement.deleteOne({ _id: placementId })

        await AuditLog.create({
            userId: user.id,
            action: "PLACEMENT_DELETED",
            entity: "Placement",
            entityId: placementId,
            oldValue,
        })

        return { success: true }
    }
}
