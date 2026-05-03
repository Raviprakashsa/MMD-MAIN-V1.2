import mongoose, { Schema, Model } from 'mongoose'

export interface IApiKey {
  _id?: mongoose.Types.ObjectId
  name: string
  keyPrefix: string
  keyHash: string
  scopes: string[]
  createdBy: mongoose.Types.ObjectId
  revokedAt?: Date | null
  expiresAt?: Date | null
  lastUsedAt?: Date | null
  lastUsedIp?: string | null
  lastUsedUserAgent?: string | null
  createdAt?: Date
  updatedAt?: Date
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    name: { type: String, required: true },
    keyPrefix: { type: String, required: true },
    keyHash: { type: String, required: true },
    scopes: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    lastUsedIp: { type: String, default: null },
    lastUsedUserAgent: { type: String, default: null },
  },
  { timestamps: true }
)

ApiKeySchema.index({ name: 1, createdBy: 1 })
ApiKeySchema.index({ keyHash: 1 }, { unique: true })
ApiKeySchema.index({ revokedAt: 1, expiresAt: 1 })

const ApiKey: Model<IApiKey> = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema)

export default ApiKey
