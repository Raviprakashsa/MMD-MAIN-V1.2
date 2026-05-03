import { z } from 'zod'
import connectDB from '@/lib/db/mongodb'
import Webhook from '@/lib/db/models/Webhook'
import WebhookDelivery from '@/lib/db/models/WebhookDelivery'
import AuditLog from '@/lib/db/models/AuditLog'
import User from '@/lib/db/models/User'
import { AppError, ForbiddenError, NotFoundError } from '@/lib/core/app-error'
import { createSignature } from '@/lib/middleware/webhookSignature'
import { serializeDocs, serializeDoc } from '@/lib/utils/serialize'

export const WebhookDeliveryStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'DELIVERED',
  'FAILED',
  'DEAD_LETTER',
])

export const QueueWebhookEventSchema = z.object({
  event: z.string().trim().min(1).max(120),
  payload: z.record(z.unknown()),
  webhookIds: z.array(z.string().min(1)).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional().default(3),
})

export const ListWebhookDeliveriesSchema = z.object({
  webhookId: z.string().min(1).optional(),
  event: z.string().trim().min(1).optional(),
  status: WebhookDeliveryStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(25),
})

export const ProcessWebhookDeliveriesSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(15),
})

export const RetryWebhookDeliverySchema = z.object({
  id: z.string().min(1),
})

export interface QueueWebhookEventInput extends z.infer<typeof QueueWebhookEventSchema> {}
export interface ListWebhookDeliveriesInput extends z.infer<typeof ListWebhookDeliveriesSchema> {}
export interface ProcessWebhookDeliveriesInput extends z.infer<typeof ProcessWebhookDeliveriesSchema> {}
export interface RetryWebhookDeliveryInput extends z.infer<typeof RetryWebhookDeliverySchema> {}

interface UserContext {
  id: string
  role: string
}

const OPERATOR_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const

function hasRole(role: string, roles: readonly string[]) {
  return roles.includes(role)
}

function isOperator(user: UserContext) {
  return user.role === 'SYSTEM' || hasRole(user.role, OPERATOR_ROLES)
}

function computeRetryDelayMs(attempts: number) {
  const minutes = Math.min(60, 2 ** Math.max(0, attempts - 1))
  return minutes * 60 * 1000
}

function truncateText(value: string, maxLength = 3000) {
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

async function resolveAuditUserId(userId: string): Promise<string | null> {
  if (z.string().min(1).safeParse(userId).success && /^[a-fA-F0-9]{24}$/.test(userId)) {
    return userId
  }

  const fallbackUser = await User.findOne({ role: { $in: OPERATOR_ROLES }, deletedAt: null })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean()

  return fallbackUser?._id ? fallbackUser._id.toString() : null
}

export class WebhookService {
  static async queueOutboundEvent(user: UserContext, data: QueueWebhookEventInput) {
    if (!isOperator(user)) throw new ForbiddenError('Forbidden')

    await connectDB()

    const query: Record<string, unknown> = {
      direction: 'OUT',
      isActive: true,
    }

    if (data.webhookIds && data.webhookIds.length > 0) {
      query._id = { $in: data.webhookIds }
    }

    const webhooks = await Webhook.find(query).select('_id').lean()

    if (webhooks.length === 0) {
      return {
        enqueued: 0,
        deliveryIds: [] as string[],
      }
    }

    const now = new Date()
    const created = await WebhookDelivery.insertMany(
      webhooks.map((webhook) => ({
        webhookId: webhook._id,
        event: data.event,
        payload: data.payload,
        status: 'PENDING',
        attempts: 0,
        maxAttempts: data.maxAttempts,
        nextAttemptAt: now,
        queuedBy: user.id,
        lastAttemptAt: null,
        deliveredAt: null,
        lastResponseStatus: null,
        lastResponseBody: null,
        lastError: null,
      }))
    )

    const auditUserId = await resolveAuditUserId(user.id)
    if (auditUserId) {
      await AuditLog.create({
        userId: auditUserId,
        action: 'WEBHOOK_EVENT_QUEUED',
        entity: 'WebhookDelivery',
        entityId: created[0]._id.toString(),
        newValue: {
          event: data.event,
          deliveryCount: created.length,
          maxAttempts: data.maxAttempts,
        },
      })
    }

    return {
      enqueued: created.length,
      deliveryIds: created.map((item) => item._id.toString()),
    }
  }

  static async listDeliveries(user: UserContext, data: ListWebhookDeliveriesInput) {
    if (!hasRole(user.role, OPERATOR_ROLES)) throw new ForbiddenError('Forbidden')

    await connectDB()

    const query: Record<string, unknown> = {}
    if (data.webhookId) query.webhookId = data.webhookId
    if (data.event) query.event = data.event
    if (data.status) query.status = data.status

    const deliveries = await WebhookDelivery.find(query)
      .sort({ createdAt: -1 })
      .limit(data.limit)
      .populate('webhookId', 'name url direction isActive')
      .lean()

    return serializeDocs(deliveries as Array<Record<string, unknown>>)
  }

  static async retryDelivery(user: UserContext, data: RetryWebhookDeliveryInput) {
    if (!hasRole(user.role, OPERATOR_ROLES)) throw new ForbiddenError('Forbidden')

    await connectDB()

    const delivery = await WebhookDelivery.findById(data.id)
    if (!delivery) throw new NotFoundError('Webhook delivery not found')

    const oldValue = {
      status: delivery.status,
      attempts: delivery.attempts,
      nextAttemptAt: delivery.nextAttemptAt,
      lastError: delivery.lastError,
    }

    delivery.status = 'PENDING'
    delivery.attempts = 0
    delivery.nextAttemptAt = new Date()
    delivery.lastError = null
    delivery.lastResponseStatus = null
    delivery.lastResponseBody = null
    delivery.lastAttemptAt = null
    delivery.deliveredAt = null
    await delivery.save()

    await AuditLog.create({
      userId: user.id,
      action: 'WEBHOOK_DELIVERY_RETRIED',
      entity: 'WebhookDelivery',
      entityId: delivery._id.toString(),
      oldValue,
      newValue: {
        status: delivery.status,
        attempts: delivery.attempts,
        nextAttemptAt: delivery.nextAttemptAt,
      },
    })

    return serializeDoc(delivery.toObject())
  }

  static async processPendingDeliveries(user: UserContext, data: ProcessWebhookDeliveriesInput) {
    if (!isOperator(user)) throw new ForbiddenError('Forbidden')

    await connectDB()

    const summary = {
      processed: 0,
      delivered: 0,
      failed: 0,
      deadLetter: 0,
    }

    const now = new Date()

    const candidates = await WebhookDelivery.find({
      status: { $in: ['PENDING', 'FAILED'] },
      nextAttemptAt: { $lte: now },
      $expr: { $lt: ['$attempts', '$maxAttempts'] },
    })
      .sort({ nextAttemptAt: 1, createdAt: 1 })
      .limit(data.limit)
      .select('_id')
      .lean()

    for (const candidate of candidates) {
      const claimed = await WebhookDelivery.findOneAndUpdate(
        {
          _id: candidate._id,
          status: { $in: ['PENDING', 'FAILED'] },
          nextAttemptAt: { $lte: new Date() },
          $expr: { $lt: ['$attempts', '$maxAttempts'] },
        },
        {
          $set: {
            status: 'PROCESSING',
            lastAttemptAt: new Date(),
            lastError: null,
          },
          $inc: {
            attempts: 1,
          },
        },
        { new: true }
      )

      if (!claimed) {
        continue
      }

      summary.processed += 1

      const webhook = await Webhook.findById(claimed.webhookId).lean()
      if (!webhook || !webhook.isActive || webhook.direction !== 'OUT') {
        claimed.status = 'DEAD_LETTER'
        claimed.lastError = 'Webhook target is missing or inactive'
        claimed.nextAttemptAt = new Date()
        await claimed.save()
        summary.deadLetter += 1
        continue
      }

      const envelope = {
        event: claimed.event,
        deliveryId: claimed._id.toString(),
        timestamp: new Date().toISOString(),
        payload: claimed.payload,
      }

      const body = JSON.stringify(envelope)
      const signature = createSignature(body, webhook.secret)

      let responseStatus: number | null = null
      let responseBody: string | null = null

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-webhook-signature': signature,
            'x-webhook-event': claimed.event,
            'x-webhook-delivery-id': claimed._id.toString(),
          },
          body,
        })

        responseStatus = response.status
        responseBody = truncateText(await response.text())

        if (!response.ok) {
          throw new AppError(`Webhook target responded with HTTP ${response.status}`)
        }

        claimed.status = 'DELIVERED'
        claimed.deliveredAt = new Date()
        claimed.nextAttemptAt = new Date()
        claimed.lastResponseStatus = responseStatus
        claimed.lastResponseBody = responseBody
        claimed.lastError = null
        await claimed.save()

        summary.delivered += 1
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Webhook delivery failed'
        const shouldDeadLetter = claimed.attempts >= claimed.maxAttempts

        claimed.status = shouldDeadLetter ? 'DEAD_LETTER' : 'FAILED'
        claimed.nextAttemptAt = shouldDeadLetter
          ? new Date()
          : new Date(Date.now() + computeRetryDelayMs(claimed.attempts))
        claimed.lastResponseStatus = responseStatus
        claimed.lastResponseBody = responseBody
        claimed.lastError = truncateText(errorMessage)

        await claimed.save()

        if (shouldDeadLetter) {
          summary.deadLetter += 1
        } else {
          summary.failed += 1
        }
      }
    }

    const auditUserId = await resolveAuditUserId(user.id)
    if (auditUserId && summary.processed > 0) {
      await AuditLog.create({
        userId: auditUserId,
        action: 'WEBHOOK_DELIVERY_BATCH_PROCESSED',
        entity: 'WebhookDelivery',
        entityId: 'BATCH',
        newValue: summary,
      })
    }

    return summary
  }
}
