"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import { AuditService, AuditLogFilterSchema } from "@/lib/services/audit.service"
import { z } from "zod"


export const getAuditLogs = createProtectedAction(
    AuditLogFilterSchema.optional(),
    async (payload, session) => {
        const logs = await AuditService.getLogs(
            { id: session.user.id, role: session.user.role },
            payload
        )
        return logs
    }
)

const GetEntityLogSchema = z.object({ entity: z.string(), entityId: z.string() })

export const getEntityAuditLog = createProtectedAction(
    GetEntityLogSchema,
    async (payload, session) => {
        const logs = await AuditService.getEntityAuditLog(
            { id: session.user.id, role: session.user.role },
            payload.entity,
            payload.entityId
        )
        return logs
    }
)

export const getAuditActions = createProtectedAction(
    z.object({}).optional(),
    async (_, session) => {
        const actions = await AuditService.getActions(
            { id: session.user.id, role: session.user.role }
        )
        return actions
    }
)

export const getAuditEntities = createProtectedAction(
    z.object({}).optional(),
    async (_, session) => {
        const entities = await AuditService.getEntities(
            { id: session.user.id, role: session.user.role }
        )
        return entities
    }
)

