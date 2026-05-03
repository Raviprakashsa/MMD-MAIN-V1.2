
import connectDB from "@/lib/db/mongodb"
import Activity, { ActivityType, OutcomeType } from "@/lib/db/models/Activity"
import Requirement from "@/lib/db/models/Requirement"
import { AppError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { serializeDoc } from "@/lib/utils/serialize"
import { z } from "zod"
import { terminalStates } from "@/lib/workflow/state-machine"

// Schemas
export const AddActivitySchema = z.object({
    requirementId: z.string().min(1),
    type: z.enum(['CALL', 'WHATSAPP', 'EMAIL', 'INTERVIEW', 'MEETING', 'STATUS_CHANGE', 'FOLLOW_UP']),
    summary: z.string().min(3),
    outcome: z.enum(['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'PENDING']).default('PENDING'),
    nextFollowUpDate: z.date().optional(),
    metadata: z.record(z.any()).optional(),
})

export const StalledSchema = z.object({ daysStale: z.number().int().positive().default(3) })
export const FollowUpsSchema = z.object({ userId: z.string().optional() })

// Types
export type AddActivityInput = z.infer<typeof AddActivitySchema>
export type StalledInput = z.infer<typeof StalledSchema>
export type FollowUpsInput = z.infer<typeof FollowUpsSchema>

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'] as const

export class ActivityService {
    /**
     * Add Activity
     */
    static async create(user: UserContext, data: AddActivityInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const requirement = await Requirement.findById(data.requirementId)
        if (!requirement) throw new NotFoundError("Requirement not found")

        if (terminalStates.includes(requirement.status)) {
            throw new AppError("Cannot add activity to closed requirement")
        }

        if (data.nextFollowUpDate && data.nextFollowUpDate < new Date()) {
            throw new AppError("Follow-up date cannot be in the past")
        }

        const activity = await Activity.create({
            requirementId: requirement._id,
            userId: user.id,
            type: data.type,
            summary: data.summary,
            outcome: data.outcome,
            nextFollowUpDate: data.nextFollowUpDate ?? null,
            metadata: data.metadata,
        })

        return serializeDoc(activity.toObject())
    }

    /**
     * Get Stalled Requirements
     */
    static async getStalledRequirements(user: UserContext, data?: StalledInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const days = data?.daysStale ?? 3
        const since = new Date()
        since.setDate(since.getDate() - days)

        const stalled = await Requirement.aggregate([
            {
                $match: {
                    status: { $nin: ['CLOSED_HIRED', 'CLOSED_NOT_HIRED'] },
                },
            },
            {
                $lookup: {
                    from: 'activities',
                    localField: '_id',
                    foreignField: 'requirementId',
                    as: 'activities',
                },
            },
            {
                $addFields: {
                    lastActivityDate: { $max: '$activities.createdAt' },
                    nextFollowUpDate: { $max: '$activities.nextFollowUpDate' },
                },
            },
            {
                $match: {
                    $or: [
                        { lastActivityDate: { $exists: false } },
                        { lastActivityDate: { $lt: since } },
                    ],
                },
            },
            { $project: { activities: 0 } },
        ])

        // Serialize manually since aggregate returns plain objects but with ObjectIds
        return stalled.map(item => ({
            ...item,
            _id: item._id.toString(),
            companyId: item.companyId.toString(),
            accountOwnerId: item.accountOwnerId.toString(),
            // Ensure dates are strings if needed, or keeping Date objects is fine for server actions usually, 
            // but serializeDoc helps for client safety.
            lastActivityDate: item.lastActivityDate,
            nextFollowUpDate: item.nextFollowUpDate
        }))
    }

    /**
     * Get Upcoming Follow-ups
     */
    static async getUpcomingFollowUps(user: UserContext, data?: FollowUpsInput) {
        await connectDB()

        const today = new Date()
        const tomorrow = new Date()
        tomorrow.setDate(today.getDate() + 1)

        const query: any = {
            nextFollowUpDate: { $gte: today, $lte: tomorrow },
            isCompleted: false,
        }

        // Filter by user if provided, otherwise show own? Or all if admin?
        // Original logic: if (parsed.data.userId) query.userId = parsed.data.userId
        // It didn't enforce "own only". But it did check session existence.
        // Let's assume if userId passed, filtering by that user. 
        if (data?.userId) {
            query.userId = data.userId
        }

        const activities = await Activity.find(query)
            .sort({ nextFollowUpDate: 1 })
            .populate('requirementId')
            .lean()

        // Serialize populated requirement
        return activities.map((activity: any) => ({
            ...serializeDoc(activity),
            requirementId: serializeDoc(activity.requirementId)
        }))
    }
}
