import mongoose, { Schema, Model } from 'mongoose'

export interface IAnalyticsEvent {
  _id?: mongoose.Types.ObjectId
  metric: string
  entityType?: string | null
  entityId?: mongoose.Types.ObjectId | string | null
  value?: number
  metadata?: Record<string, unknown>
  occurredAt?: Date
  createdAt?: Date
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    metric: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: Schema.Types.Mixed },
    value: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed },
    occurredAt: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

AnalyticsEventSchema.index({ metric: 1, occurredAt: -1 })
AnalyticsEventSchema.index({ entityType: 1, entityId: 1 })

const AnalyticsEvent: Model<IAnalyticsEvent> =
  mongoose.models.AnalyticsEvent || mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema)

export default AnalyticsEvent
