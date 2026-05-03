import mongoose, { Schema, Model } from 'mongoose'

export type CommunicationEntity = 'Company' | 'Requirement' | 'Candidate' | 'Placement'

export interface ICommunicationThread {
  _id?: mongoose.Types.ObjectId
  entityType: CommunicationEntity
  entityId: mongoose.Types.ObjectId | string
  subject: string
  createdBy: mongoose.Types.ObjectId
  isClosed: boolean
  lastMessageAt?: Date | null
  participants?: mongoose.Types.ObjectId[]
  createdAt?: Date
  updatedAt?: Date
}

const CommunicationThreadSchema = new Schema<ICommunicationThread>(
  {
    entityType: { type: String, required: true, enum: ['Company', 'Requirement', 'Candidate', 'Placement'] },
    entityId: { type: Schema.Types.Mixed, required: true },
    subject: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isClosed: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: null },
    participants: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true }
)

CommunicationThreadSchema.index({ entityType: 1, entityId: 1 })
CommunicationThreadSchema.index({ isClosed: 1, lastMessageAt: -1 })

const CommunicationThread: Model<ICommunicationThread> =
  mongoose.models.CommunicationThread || mongoose.model<ICommunicationThread>('CommunicationThread', CommunicationThreadSchema)

export default CommunicationThread
