
import connectDB from "@/lib/db/mongodb"
import CommunicationThread from "@/lib/db/models/CommunicationThread"
import CommunicationMessage from "@/lib/db/models/CommunicationMessage"
import AuditLog from "@/lib/db/models/AuditLog"
import { AppError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"
import { CommunicationEntitySchema, CommunicationMessageSchema, CommunicationThreadSchema } from "@/lib/validators/common"
import { logDataAccess, logDataAccessMany, logDataMutation } from "@/lib/workflow/governance"

export const CloseThreadSchema = z.object({ threadId: z.string().min(1) })
export const ListThreadsSchema = z.object({
    entityType: CommunicationEntitySchema.optional(),
    entityId: z.string().min(1).optional(),
    includeClosed: z.boolean().optional().default(false),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(50).optional().default(10),
}).refine(
    (data) => (Boolean(data.entityType) && Boolean(data.entityId)) || (!data.entityType && !data.entityId),
    {
        message: "entityType and entityId must be provided together",
        path: ["entityId"],
    }
)

export const ListMessagesSchema = z.object({
    threadId: z.string().min(1),
    page: z.number().int().min(1).optional().default(1),
    limit: z.number().int().min(1).max(100).optional().default(20),
})

export type CreateThreadInput = z.infer<typeof CommunicationThreadSchema>
export type PostMessageInput = z.infer<typeof CommunicationMessageSchema>
export type ListThreadsInput = z.infer<typeof ListThreadsSchema>
export type ListMessagesInput = z.infer<typeof ListMessagesSchema>

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER"] as const
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"] as const

function hasRole(role: string, roles: readonly string[]): boolean {
    return roles.includes(role)
}

function canAccessThread(user: UserContext, thread: { participants?: Array<{ toString(): string } | string> | null }) {
    if (hasRole(user.role, ADMIN_ROLES)) return true

    const participants = (thread.participants || []).map((participant) => participant.toString())
    return participants.includes(user.id)
}

export class CommunicationService {

    /**
     * List Threads (optionally scoped by entity)
     */
    static async listThreads(user: UserContext, data: ListThreadsInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const query: Record<string, unknown> = {}
        if (data.entityType && data.entityId) {
            query.entityType = data.entityType
            query.entityId = data.entityId
        }
        if (!data.includeClosed) {
            query.isClosed = false
        }

        if (!hasRole(user.role, ADMIN_ROLES)) {
            query.participants = user.id
        }

        const skip = (data.page - 1) * data.limit

        const [threads, total] = await Promise.all([
            CommunicationThread.find(query)
                .sort({ lastMessageAt: -1, updatedAt: -1, createdAt: -1 })
                .skip(skip)
                .limit(data.limit)
                .lean(),
            CommunicationThread.countDocuments(query),
        ])

        await logDataAccessMany(
            user.id,
            threads.map((thread) => ({
                entity: 'CommunicationThread',
                entityId: thread._id.toString(),
                action: 'VIEW' as const,
            }))
        )

        const items = serializeDocs(threads)
        return {
            items,
            page: data.page,
            limit: data.limit,
            total,
            hasMore: skip + threads.length < total,
        }
    }

    /**
     * Create Thread
     */
    static async createThread(user: UserContext, data: CreateThreadInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const participantIds = Array.from(new Set([user.id, ...(data.participantIds || [])]))

        const thread = await CommunicationThread.create({
            entityType: data.entityType,
            entityId: data.entityId,
            subject: data.subject,
            createdBy: user.id,
            participants: participantIds,
        })

        await AuditLog.create({
            userId: user.id,
            action: "COMM_THREAD_CREATED",
            entity: data.entityType,
            entityId: data.entityId,
            newValue: { threadId: thread._id.toString(), subject: thread.subject },
        })

        await logDataMutation(user.id, {
            entity: 'CommunicationThread',
            entityId: thread._id.toString(),
            action: 'CREATE',
        })

        return serializeDoc(thread.toObject())
    }

    /**
     * Post Message
     */
    static async postMessage(user: UserContext, data: PostMessageInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const thread = await CommunicationThread.findById(data.threadId)
        if (!thread) throw new NotFoundError("Thread not found")
        if (thread.isClosed) throw new AppError("Thread is closed")
        if (!canAccessThread(user, thread)) throw new ForbiddenError("Forbidden")

        const message = await CommunicationMessage.create({
            threadId: thread._id,
            senderId: user.id,
            channel: data.channel,
            direction: data.direction,
            body: data.body,
            metadata: data.metadata,
        })

        thread.lastMessageAt = new Date()
        await thread.save()

        await AuditLog.create({
            userId: user.id,
            action: "COMM_MESSAGE_POSTED",
            entity: "CommunicationThread",
            entityId: thread._id.toString(),
            newValue: { messageId: message._id.toString(), channel: message.channel },
        })

        await Promise.all([
            logDataMutation(user.id, {
                entity: 'CommunicationMessage',
                entityId: message._id.toString(),
                action: 'CREATE',
            }),
            logDataMutation(user.id, {
                entity: 'CommunicationThread',
                entityId: thread._id.toString(),
                action: 'UPDATE',
            }),
        ])

        return serializeDoc(message.toObject())
    }

    /**
     * Close Thread
     */
    static async closeThread(user: UserContext, threadId: string) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const thread = await CommunicationThread.findById(threadId)
        if (!thread) throw new NotFoundError("Thread not found")
        if (!canAccessThread(user, thread)) throw new ForbiddenError("Forbidden")

        thread.isClosed = true
        await thread.save()

        await AuditLog.create({
            userId: user.id,
            action: "COMM_THREAD_CLOSED",
            entity: "CommunicationThread",
            entityId: thread._id.toString(),
            newValue: { isClosed: true }
        })

        await logDataMutation(user.id, {
            entity: 'CommunicationThread',
            entityId: thread._id.toString(),
            action: 'UPDATE',
        })

        return serializeDoc(thread.toObject())
    }

    /**
     * Get Thread with Messages
     */
    static async getThreadWithMessages(user: UserContext, data: ListMessagesInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const thread = await CommunicationThread.findById(data.threadId).lean()
        if (!thread) throw new NotFoundError("Thread not found")
        if (!canAccessThread(user, thread)) throw new ForbiddenError("Forbidden")

        const skip = (data.page - 1) * data.limit
        const [messages, total] = await Promise.all([
            CommunicationMessage.find({ threadId: data.threadId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(data.limit)
                .lean(),
            CommunicationMessage.countDocuments({ threadId: data.threadId }),
        ])

        await logDataAccess(user.id, {
            entity: 'CommunicationThread',
            entityId: data.threadId,
            action: 'VIEW',
        })

        return {
            thread: serializeDoc(thread),
            messages: serializeDocs(messages),
            page: data.page,
            limit: data.limit,
            total,
            hasMore: skip + messages.length < total,
        }
    }
}
