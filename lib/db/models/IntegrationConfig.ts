import mongoose, { Schema, Model } from 'mongoose'

export type IntegrationProvider = 'JOB_BOARD' | 'ATS' | 'WEBHOOK' | 'EXPORT'

export interface IIntegrationConfig {
  _id?: mongoose.Types.ObjectId
  name: string
  provider: IntegrationProvider
  isActive: boolean
  config: Record<string, unknown>
  createdBy: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

const IntegrationConfigSchema = new Schema<IIntegrationConfig>(
  {
    name: { type: String, required: true },
    provider: { type: String, required: true, enum: ['JOB_BOARD', 'ATS', 'WEBHOOK', 'EXPORT'] },
    isActive: { type: Boolean, default: true },
    config: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

IntegrationConfigSchema.index({ provider: 1, isActive: 1 })
IntegrationConfigSchema.index({ name: 1 }, { unique: true })

const IntegrationConfig: Model<IIntegrationConfig> =
  mongoose.models.IntegrationConfig || mongoose.model<IIntegrationConfig>('IntegrationConfig', IntegrationConfigSchema)

export default IntegrationConfig
