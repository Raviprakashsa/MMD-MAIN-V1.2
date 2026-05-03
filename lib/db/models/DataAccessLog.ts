import mongoose, { Schema, Model } from 'mongoose'

export interface IDataAccessLog {
  _id?: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  entity: string
  entityId: string
  action: 'VIEW' | 'EXPORT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE'
  createdAt?: Date
}

const DataAccessLogSchema = new Schema<IDataAccessLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    action: { type: String, required: true, enum: ['VIEW', 'EXPORT', 'CREATE', 'UPDATE', 'DELETE', 'RESTORE'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

DataAccessLogSchema.index({ userId: 1, createdAt: -1 })
DataAccessLogSchema.index({ entity: 1, entityId: 1 })
DataAccessLogSchema.index({ action: 1, createdAt: -1 })

const DataAccessLog: Model<IDataAccessLog> = mongoose.models.DataAccessLog || mongoose.model<IDataAccessLog>('DataAccessLog', DataAccessLogSchema)

export default DataAccessLog
