"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import {
  ApiKeyService,
  CreateApiKeySchema,
  ListApiKeysSchema,
  RevokeApiKeySchema,
  RotateApiKeySchema,
} from "@/lib/services/api-key.service"

export const createApiKeyAction = createProtectedAction(
  CreateApiKeySchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      scopes: payload.scopes ?? [],
    }

    const result = await ApiKeyService.create(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )

    return result
  }
)

export const listApiKeysAction = createProtectedAction(
  ListApiKeysSchema,
  async (payload, session) => {
    const normalizedPayload = {
      includeRevoked: payload.includeRevoked ?? false,
    }

    const result = await ApiKeyService.list(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )

    return result
  }
)

export const rotateApiKeyAction = createProtectedAction(
  RotateApiKeySchema,
  async (payload, session) => {
    const result = await ApiKeyService.rotate(
      { id: session.user.id, role: session.user.role },
      payload
    )

    return result
  }
)

export const revokeApiKeyAction = createProtectedAction(
  RevokeApiKeySchema,
  async (payload, session) => {
    const result = await ApiKeyService.revoke(
      { id: session.user.id, role: session.user.role },
      payload
    )

    return result
  }
)
