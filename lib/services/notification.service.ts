
import connectDB from "@/lib/db/mongodb"
import Notification from "@/lib/db/models/Notification"
import { AppError, ForbiddenError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"

// Schemas
export const NotificationTypeSchema = z.enum(['STALLED_REQ', 'MISSING_JD', 'FOLLOW_UP'])
export const CreateNotificationSchema = z.object({
    userId: z.string().min(1),
    type: NotificationTypeSchema,
    message: z.string().min(1),
    link: z.string().optional(),
})

// Types
export type CreateNotificationInput = z.infer<typeof CreateNotificationSchema>

interface UserContext {
    id: string
    role: string
}

export class NotificationService {
    /**
     * List user notifications
     */
    static async list(user: UserContext) {
        await connectDB()
        const items = await Notification.find({ userId: user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()

        return serializeDocs(items)
    }

    /**
     * Mark as read
     */
    static async markRead(user: UserContext, notificationId: string) {
        await connectDB()
        await Notification.findOneAndUpdate(
            { _id: notificationId, userId: user.id },
            { isRead: true }
        )
        return { success: true }
    }

    /**
     * Mark ALL as read
     */
    static async markAllRead(user: UserContext) {
        await connectDB()
        await Notification.updateMany(
            { userId: user.id, isRead: false },
            { isRead: true }
        )
        return { success: true }
    }

    /**
     * Create Notification (Admin Only)
     */
    static async create(user: UserContext, data: CreateNotificationInput) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) throw new ForbiddenError("Forbidden")

        await connectDB()

        const notification = await Notification.create({
            userId: data.userId,
            type: data.type,
            message: data.message,
            link: data.link,
            isRead: false,
        })

        return serializeDoc(notification.toObject())
    }

    /**
     * Delete Notification
     */
    static async delete(user: UserContext, notificationId: string) {
        await connectDB()

        const result = await Notification.deleteOne({
            _id: notificationId,
            userId: user.id,
        })

        if (result.deletedCount === 0) {
            throw new AppError('Notification not found or not owned by user')
        }

        return { success: true }
    }

    /**
     * Get Unread Count
     */
    static async getUnreadCount(user: UserContext) {
        await connectDB()
        const count = await Notification.countDocuments({
            userId: user.id,
            isRead: false,
        })
        return count
    }
}
