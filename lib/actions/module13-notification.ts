"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import {
  NotificationService,
  CreateNotificationSchema
} from "@/lib/services/notification.service"
import { z } from "zod"


export const listNotificationsAction = createProtectedAction(
  z.object({}).optional(),
  async (_, session) => {
    const items = await NotificationService.list({ id: session.user.id, role: session.user.role })
    return items
  }
)

const NotificationIdSchema = z.string() // Usually explicit object, but keeping simple for single arg if possible, otherwise object

const IdSchema = z.object({ id: z.string().min(1) })

export const markNotificationReadAction = createProtectedAction(
  IdSchema, // Changed to object for standard pattern
  async (payload, session) => {
    await NotificationService.markRead({ id: session.user.id, role: session.user.role }, payload.id)
    return { success: true }
  }
)

export const markAllNotificationsReadAction = createProtectedAction(
  z.object({}).optional(),
  async (_, session) => {
    await NotificationService.markAllRead({ id: session.user.id, role: session.user.role })
    return { success: true }
  }
)

export const createNotification = createProtectedAction(
  CreateNotificationSchema,
  async (payload, session) => {
    const notification = await NotificationService.create(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return notification
  }
)

export const deleteNotification = createProtectedAction(
  IdSchema,
  async (payload, session) => {
    await NotificationService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)

export const getUnreadNotificationCount = createProtectedAction(
  z.object({}).optional(),
  async (_, session) => {
    const count = await NotificationService.getUnreadCount({ id: session.user.id, role: session.user.role })
    return count
  }
)


