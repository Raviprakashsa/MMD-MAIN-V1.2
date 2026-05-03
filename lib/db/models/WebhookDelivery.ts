import mongoose, { Model, Schema } from 'mongoose'

export type WebhookDeliveryStatus = 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED' | 'DEAD_LETTER'

export interface IWebhookDelivery {
  _id?: mongoose.Types.ObjectId
  webhookId: mongoose.Types.ObjectId
  event: string
  payload: Record<string, unknown>
  status: WebhookDeliveryStatus
  attempts: number
  maxAttempts: number
  nextAttemptAt: Date
  lastAttemptAt?: Date | null
  deliveredAt?: Date | null
  lastResponseStatus?: number | null
  lastResponseBody?: string | null
  lastError?: string | null
  queuedBy: string
  createdAt?: Date
  updatedAt?: Date
}

const WebhookDeliverySchema = new Schema<IWebhookDelivery>(
  {
    webhookId: { type: Schema.Types.ObjectId, ref: 'Webhook', required: true },
    event: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'DELIVERED', 'FAILED', 'DEAD_LETTER'],
      default: 'PENDING',
      required: true,
    },
    attempts: { type: Number, required: true, default: 0 },
    maxAttempts: { type: Number, required: true, default: 3 },
    nextAttemptAt: { type: Date, required: true, default: Date.now },
    lastAttemptAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    lastResponseStatus: { type: Number, default: null },
    lastResponseBody: { type: String, default: null },
    lastError: { type: String, default: null },
    queuedBy: { type: String, required: true },
  },
  { timestamps: true }
)

WebhookDeliverySchema.index({ status: 1, nextAttemptAt: 1 })
WebhookDeliverySchema.index({ webhookId: 1, createdAt: -1 })
WebhookDeliverySchema.index({ event: 1, createdAt: -1 })

const WebhookDelivery: Model<IWebhookDelivery> =
  mongoose.models.WebhookDelivery || mongoose.model<IWebhookDelivery>('WebhookDelivery', WebhookDeliverySchema)

export default WebhookDelivery
