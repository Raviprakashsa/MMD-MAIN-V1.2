
import connectDB from "@/lib/db/mongodb"
import AuditLog from "@/lib/db/models/AuditLog"
import User from "@/lib/db/models/User"
import { ForbiddenError } from "@/lib/core/app-error"
import { serializeDoc } from "@/lib/utils/serialize"
import { z } from "zod"

export const AuditLogFilterSchema = z.object({
    entity: z.string().optional(),
    entityId: z.string().optional(),
    userId: z.string().optional(),
    action: z.string().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    limit: z.number().min(1).max(100).default(50),
    offset: z.number().min(0).default(0),
})

export type AuditLogFilterInput = z.input<typeof AuditLogFilterSchema>

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR"] as const

export class AuditService {

    /**
     * Get Audit Logs
     */
    static async getLogs(user: UserContext, filters?: AuditLogFilterInput) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) throw new ForbiddenError("Forbidden")

        const parsed = AuditLogFilterSchema.parse(filters ?? {})

        await connectDB()

        const query: Record<string, unknown> = {}

        if (parsed.entity) query.entity = parsed.entity
        if (parsed.entityId) query.entityId = parsed.entityId
        if (parsed.userId) query.userId = parsed.userId
        if (parsed.action) query.action = parsed.action

        if (parsed.startDate || parsed.endDate) {
            query.createdAt = {}
            if (parsed.startDate) (query.createdAt as any).$gte = parsed.startDate
            if (parsed.endDate) (query.createdAt as any).$lte = parsed.endDate
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .sort({ createdAt: -1 })
                .skip(parsed.offset)
                .limit(parsed.limit)
                .lean(),
            AuditLog.countDocuments(query),
        ])

        // Get user names
        const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))]
        const users = await User.find({ _id: { $in: userIds } }).select('name email').lean()
        const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]))

        const logsWithUsers = logs.map(log => ({
            ...serializeDoc(log),
            user: log.userId ? userMap[log.userId.toString()] ? {
                _id: userMap[log.userId.toString()]._id.toString(),
                name: userMap[log.userId.toString()].name,
                email: userMap[log.userId.toString()].email
            } : null : null,
        }))

        return {
            logs: logsWithUsers,
            total,
            hasMore: parsed.offset + logs.length < total,
        }
    }

    /**
     * Get Entity Audit Log (Admin + Coordinator)
     */
    static async getEntityAuditLog(user: UserContext, entity: string, entityId: string) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const logs = await AuditLog.find({ entity, entityId })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean()

        const userIds = [...new Set(logs.map(l => l.userId).filter(Boolean))]
        const users = await User.find({ _id: { $in: userIds } }).select('name email').lean()
        const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]))

        const logsWithUsers = logs.map(log => ({
            ...serializeDoc(log),
            user: log.userId ? userMap[log.userId.toString()] ? {
                _id: userMap[log.userId.toString()]._id.toString(),
                name: userMap[log.userId.toString()].name,
                email: userMap[log.userId.toString()].email
            } : null : null,
        }))

        return logsWithUsers
    }

    /**
     * Get distinct actions
     */
    static async getActions(user: UserContext) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) throw new ForbiddenError("Forbidden")
        await connectDB()
        const actions = await AuditLog.distinct('action')
        return actions.sort()
    }

    /**
     * Get distinct entities
     */
    static async getEntities(user: UserContext) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) throw new ForbiddenError("Forbidden")
        await connectDB()
        const entities = await AuditLog.distinct('entity')
        return entities.sort()
    }
}
