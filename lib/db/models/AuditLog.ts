import mongoose, { Schema, Model } from 'mongoose'

export interface IAuditLog {
  _id?: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  action: string
  entity: string
  entityId: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
  createdAt?: Date
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    entity: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

AuditLogSchema.index({ userId: 1 })
AuditLogSchema.index({ entity: 1, entityId: 1 })
AuditLogSchema.index({ createdAt: -1 })

const AuditLog: Model<IAuditLog> =
  (mongoose.models?.AuditLog as Model<IAuditLog> | undefined) || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema)

export default AuditLog
