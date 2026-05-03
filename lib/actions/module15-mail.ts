"use server"

import { revalidatePath } from "next/cache"
import connectDB from "@/lib/db/mongodb"
import Message, { IMessage } from "@/lib/db/models/Message"
import { getCurrentUser } from "@/lib/auth"
import { z } from "zod"

// Initialize DB
connectDB()

const SendMessageSchema = z.object({
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Message is required"),
    type: z.enum(['REQUEST', 'MESSAGE']).default('REQUEST'),
})

export async function getAdminInbox() {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'SUPER_ADMIN' && (!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)))) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const messages = await Message.find({
            $or: [
                { recipientRole: 'ADMIN' },
                { recipientRole: 'SUPER_ADMIN' },
                { recipientId: user.id }
            ]
        })
            .sort({ createdAt: -1 })
            .lean()

        return { success: true, data: JSON.parse(JSON.stringify(messages)) }
    } catch (error) {
        return { success: false, error: "Failed to fetch messages" }
    }
}

export async function getUserRequests() {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }

    try {
        const messages = await Message.find({ senderId: user.id })
            .sort({ createdAt: -1 })
            .lean()

        return { success: true, data: JSON.parse(JSON.stringify(messages)) }
    } catch (error) {
        return { success: false, error: "Failed to fetch requests" }
    }
}

export async function sendAdminRequest(data: z.infer<typeof SendMessageSchema>) {
    const user = await getCurrentUser()
    if (!user) return { success: false, error: "Unauthorized" }

    const validated = SendMessageSchema.safeParse(data)
    if (!validated.success) return { success: false, error: validated.error.message }

    try {
        const newMessage = await Message.create({
            senderId: user.id,
            senderName: user.name,
            senderRole: user.role,
            recipientRole: 'ADMIN', // Targets both Admin and Super Admin
            subject: validated.data.subject,
            body: validated.data.body,
            type: validated.data.type,
            status: 'UNREAD'
        })

        revalidatePath('/dashboard/mail')
        return { success: true, data: JSON.parse(JSON.stringify(newMessage)) }
    } catch (error) {
        return { success: false, error: "Failed to send request" }
    }
}

export async function markAsRead(messageId: string) {
    const user = await getCurrentUser()
    if (!user || (user.role !== 'SUPER_ADMIN' && (!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)))) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        await Message.findByIdAndUpdate(messageId, { status: 'READ' })
        revalidatePath('/dashboard/mail')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to update status" }
    }
}

export async function deleteMessage(messageId: string) {
    const user = await getCurrentUser()
    if (!user || user.role !== 'SUPER_ADMIN') {
        return { success: false, error: "Unauthorized: only Super Admin can delete" }
    }

    try {
        await Message.findByIdAndDelete(messageId)
        revalidatePath('/dashboard/mail')
        return { success: true }
    } catch (error) {
        return { success: false, error: "Failed to delete message" }
    }
}
