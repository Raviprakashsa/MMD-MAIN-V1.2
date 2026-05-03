"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import {
  IntegrationService,
  DeleteIntegrationSchema,
  TestIntegrationConnectionSchema,
  UpsertIntegrationSchema,
  ToggleIntegrationSchema
} from "@/lib/services/integration.service"
import { IntegrationProviderSchema } from "@/lib/validators/common"


export const upsertIntegrationConfigAction = createProtectedAction(
  UpsertIntegrationSchema,
  async (payload, session) => {
    const integration = await IntegrationService.upsert(
      { id: session.user.id, role: session.user.role },
      { ...payload, isActive: payload.isActive ?? false }
    )
    return integration
  }
)

export const toggleIntegrationConfigAction = createProtectedAction(
  ToggleIntegrationSchema,
  async (payload, session) => {
    const integration = await IntegrationService.toggle(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return integration
  }
)

export const listIntegrationConfigsAction = createProtectedAction(
  IntegrationProviderSchema.optional(),
  async (payload, session) => {
    const provider = payload ?? undefined

    const configs = await IntegrationService.list(
      { id: session.user.id, role: session.user.role },
      provider
    )
    return configs
  }
)

export const deleteIntegrationConfigAction = createProtectedAction(
  DeleteIntegrationSchema,
  async (payload, session) => {
    const result = await IntegrationService.remove(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return result
  }
)

export const testIntegrationConnectionAction = createProtectedAction(
  TestIntegrationConnectionSchema,
  async (payload, session) => {
    const result = await IntegrationService.testConnection(
      { id: session.user.id, role: session.user.role },
      {
        ...payload,
        timeoutMs: payload.timeoutMs ?? 5000,
      }
    )
    return result
  }
)

