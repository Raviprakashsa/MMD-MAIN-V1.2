
import connectDB from "@/lib/db/mongodb"
import IntegrationConfig from "@/lib/db/models/IntegrationConfig"
import AuditLog from "@/lib/db/models/AuditLog"
import { ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"
import { IntegrationConfigSchema } from "@/lib/validators/common"

export const UpsertIntegrationSchema = IntegrationConfigSchema.extend({ id: z.string().optional() })
export const ToggleIntegrationSchema = z.object({
    id: z.string().min(1),
    isActive: z.boolean(),
})
export const DeleteIntegrationSchema = z.object({
    id: z.string().min(1),
})
export const TestIntegrationConnectionSchema = z.object({
    id: z.string().min(1),
    timeoutMs: z.number().int().min(1000).max(15000).optional().default(5000),
})

export type UpsertIntegrationInput = z.infer<typeof UpsertIntegrationSchema>
export type ToggleIntegrationInput = z.infer<typeof ToggleIntegrationSchema>
export type DeleteIntegrationInput = z.infer<typeof DeleteIntegrationSchema>
export type TestIntegrationConnectionInput = z.infer<typeof TestIntegrationConnectionSchema>

export type IntegrationHealthStatus = 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN' | 'INACTIVE'

export interface IntegrationHealth {
    status: IntegrationHealthStatus
    checkedAt?: string
    message?: string
    httpStatus?: number | null
}

interface UserContext {
    id: string
    role: string
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const
const HEALTH_STATUSES: IntegrationHealthStatus[] = ['HEALTHY', 'UNHEALTHY', 'UNKNOWN', 'INACTIVE']

function hasAdminAccess(role: string) {
    return (ADMIN_ROLES as readonly string[]).includes(role)
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null
}

function asNullableNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function resolveEndpoint(config: Record<string, unknown>): string | null {
    const endpointCandidates = [
        config.url,
        config.endpoint,
        config.baseUrl,
        config.webhookUrl,
    ]

    for (const candidate of endpointCandidates) {
        const value = asString(candidate)?.trim()
        if (value) return value
    }

    return null
}

function readStoredHealth(config: Record<string, unknown>, isActive: boolean): IntegrationHealth {
    if (!isActive) {
        return {
            status: 'INACTIVE',
            message: 'Integration is disabled',
        }
    }

    const rawHealth = asRecord(config.health)
    if (!rawHealth) {
        return {
            status: 'UNKNOWN',
            message: 'Connection has not been tested',
        }
    }

    const rawStatus = asString(rawHealth.status)
    const status = rawStatus && HEALTH_STATUSES.includes(rawStatus as IntegrationHealthStatus)
        ? (rawStatus as IntegrationHealthStatus)
        : 'UNKNOWN'

    return {
        status,
        checkedAt: asString(rawHealth.checkedAt) || undefined,
        message: asString(rawHealth.message) || undefined,
        httpStatus: asNullableNumber(rawHealth.httpStatus),
    }
}

function withHealth<T extends { config?: unknown; isActive: boolean }>(integration: T) {
    const configRecord = asRecord(integration.config) || {}
    const health = readStoredHealth(configRecord, integration.isActive)
    return { ...integration, health }
}

function updateConfigHealth(config: Record<string, unknown>, health: IntegrationHealth): Record<string, unknown> {
    return {
        ...config,
        health: {
            status: health.status,
            checkedAt: health.checkedAt,
            message: health.message,
            httpStatus: health.httpStatus ?? null,
        },
    }
}

async function probeConnection(
    provider: string,
    isActive: boolean,
    config: Record<string, unknown>,
    timeoutMs: number
): Promise<IntegrationHealth> {
    if (!isActive) {
        return {
            status: 'INACTIVE',
            checkedAt: new Date().toISOString(),
            message: 'Integration is disabled',
        }
    }

    if (provider === 'EXPORT') {
        return {
            status: 'HEALTHY',
            checkedAt: new Date().toISOString(),
            message: 'Export integrations are processed internally',
        }
    }

    const endpoint = resolveEndpoint(config)
    if (!endpoint) {
        return {
            status: 'UNKNOWN',
            checkedAt: new Date().toISOString(),
            message: 'No endpoint URL found in integration config',
        }
    }

    let parsedUrl: URL
    try {
        parsedUrl = new URL(endpoint)
    } catch {
        return {
            status: 'UNKNOWN',
            checkedAt: new Date().toISOString(),
            message: 'Configured endpoint URL is invalid',
        }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
        let response = await fetch(parsedUrl.toString(), {
            method: 'HEAD',
            signal: controller.signal,
        })

        if (response.status === 405) {
            response = await fetch(parsedUrl.toString(), {
                method: 'GET',
                signal: controller.signal,
            })
        }

        const status: IntegrationHealthStatus = response.ok ? 'HEALTHY' : 'UNHEALTHY'
        return {
            status,
            checkedAt: new Date().toISOString(),
            message: response.ok
                ? `Connection test passed (${response.status})`
                : `Connection test failed (${response.status})`,
            httpStatus: response.status,
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Connection test failed'
        return {
            status: 'UNHEALTHY',
            checkedAt: new Date().toISOString(),
            message,
        }
    } finally {
        clearTimeout(timeout)
    }
}

export class IntegrationService {
    /**
     * Upsert Integration
     */
    static async upsert(user: UserContext, data: UpsertIntegrationInput) {
        if (!hasAdminAccess(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()

        if (data.id) {
            const existing = await IntegrationConfig.findById(data.id)
            if (!existing) throw new NotFoundError("Integration not found")

            const oldValue = existing.toObject()
            const existingConfig = asRecord(existing.config) || {}
            const nextConfig = asRecord(data.config) || {}
            if (existingConfig.health !== undefined && nextConfig.health === undefined) {
                nextConfig.health = existingConfig.health
            }

            existing.name = data.name
            existing.provider = data.provider
            existing.isActive = data.isActive
            existing.config = nextConfig
            await existing.save()

            await AuditLog.create({
                userId: user.id,
                action: "INTEGRATION_UPDATED",
                entity: "IntegrationConfig",
                entityId: existing._id.toString(),
                oldValue,
                newValue: { name: data.name, provider: data.provider },
            })

            return serializeDoc(existing.toObject())
        }

        const created = await IntegrationConfig.create({
            name: data.name,
            provider: data.provider,
            isActive: data.isActive,
            config: data.config,
            createdBy: user.id,
        })

        await AuditLog.create({
            userId: user.id,
            action: "INTEGRATION_CREATED",
            entity: "IntegrationConfig",
            entityId: created._id.toString(),
            newValue: { name: data.name, provider: data.provider },
        })

        return serializeDoc(created.toObject())
    }

    /**
     * Toggle Integration
     */
    static async toggle(user: UserContext, data: ToggleIntegrationInput) {
        if (!hasAdminAccess(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const integration = await IntegrationConfig.findById(data.id)
        if (!integration) throw new NotFoundError("Integration not found")

        integration.isActive = data.isActive
        await integration.save()

        await AuditLog.create({
            userId: user.id,
            action: "INTEGRATION_TOGGLED",
            entity: "IntegrationConfig",
            entityId: integration._id.toString(),
            newValue: { isActive: integration.isActive },
        })

        return serializeDoc(integration.toObject())
    }

    /**
     * List Integrations
     */
    static async list(user: UserContext, provider?: string) {
        if (!hasAdminAccess(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const query = provider ? { provider } : {}
        const configs = await IntegrationConfig.find(query).sort({ createdAt: -1 }).lean()
        const enriched = configs.map((config) => withHealth(config))
        return serializeDocs(enriched)
    }

    /**
     * Test Integration Connection and persist health status.
     */
    static async testConnection(user: UserContext, data: TestIntegrationConnectionInput) {
        if (!hasAdminAccess(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const integration = await IntegrationConfig.findById(data.id)
        if (!integration) throw new NotFoundError("Integration not found")

        const config = asRecord(integration.config) || {}
        const previousHealth = readStoredHealth(config, integration.isActive)
        const health = await probeConnection(integration.provider, integration.isActive, config, data.timeoutMs)

        integration.config = updateConfigHealth(config, health)
        await integration.save()

        await AuditLog.create({
            userId: user.id,
            action: "INTEGRATION_CONNECTION_TESTED",
            entity: "IntegrationConfig",
            entityId: integration._id.toString(),
            oldValue: previousHealth,
            newValue: health,
        })

        const serialized = serializeDoc(withHealth(integration.toObject()))
        return {
            integration: serialized,
            health,
        }
    }

    /**
     * Delete Integration
     */
    static async remove(user: UserContext, data: DeleteIntegrationInput) {
        if (!hasAdminAccess(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const integration = await IntegrationConfig.findById(data.id)
        if (!integration) throw new NotFoundError("Integration not found")

        const oldValue = integration.toObject()
        await IntegrationConfig.deleteOne({ _id: data.id })

        await AuditLog.create({
            userId: user.id,
            action: "INTEGRATION_DELETED",
            entity: "IntegrationConfig",
            entityId: data.id,
            oldValue,
        })

        return { success: true }
    }
}
