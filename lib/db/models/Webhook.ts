import mongoose, { Schema, Model } from 'mongoose'

export interface IWebhook {
  _id?: mongoose.Types.ObjectId
  name: string
  url: string
  secret: string
  direction: 'IN' | 'OUT'
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const WebhookSchema = new Schema<IWebhook>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    secret: { type: String, required: true },
    direction: { type: String, enum: ['IN', 'OUT'], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

WebhookSchema.index({ direction: 1, isActive: 1 })

const Webhook: Model<IWebhook> = mongoose.models.Webhook || mongoose.model<IWebhook>('Webhook', WebhookSchema)

export default Webhook
