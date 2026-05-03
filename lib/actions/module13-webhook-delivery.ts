"use server"

import { createProtectedAction } from '@/lib/core/action-client'
import {
  ListWebhookDeliveriesSchema,
  ProcessWebhookDeliveriesSchema,
  QueueWebhookEventSchema,
  RetryWebhookDeliverySchema,
  WebhookService,
} from '@/lib/services/webhook.service'

export const queueWebhookEventAction = createProtectedAction(
  QueueWebhookEventSchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      maxAttempts: payload.maxAttempts ?? 3,
    }

    return WebhookService.queueOutboundEvent(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )
  }
)

export const listWebhookDeliveriesAction = createProtectedAction(
  ListWebhookDeliveriesSchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      limit: payload.limit ?? 25,
    }

    return WebhookService.listDeliveries(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )
  }
)

export const retryWebhookDeliveryAction = createProtectedAction(
  RetryWebhookDeliverySchema,
  async (payload, session) => {
    return WebhookService.retryDelivery(
      { id: session.user.id, role: session.user.role },
      payload
    )
  }
)

export const processWebhookDeliveriesAction = createProtectedAction(
  ProcessWebhookDeliveriesSchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      limit: payload.limit ?? 15,
    }

    return WebhookService.processPendingDeliveries(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )
  }
)
