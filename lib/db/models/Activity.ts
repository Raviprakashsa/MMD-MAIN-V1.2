import mongoose, { Schema, Model } from 'mongoose'

export type ActivityType =
  | 'CALL'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'INTERVIEW'
  | 'MEETING'
  | 'STATUS_CHANGE'
  | 'FOLLOW_UP'

export type OutcomeType = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'PENDING'

export interface IActivity {
  _id?: mongoose.Types.ObjectId
  requirementId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: ActivityType
  summary: string
  outcome: OutcomeType
  nextFollowUpDate?: Date | null
  isCompleted: boolean
  metadata?: Record<string, unknown>
  createdAt?: Date
}

const ActivitySchema = new Schema<IActivity>(
  {
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      required: true,
      enum: ['CALL', 'WHATSAPP', 'EMAIL', 'INTERVIEW', 'MEETING', 'STATUS_CHANGE', 'FOLLOW_UP'],
    },
    summary: { type: String, required: true },
    outcome: { type: String, required: true, enum: ['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'PENDING'], default: 'PENDING' },
    nextFollowUpDate: { type: Date, default: null },
    isCompleted: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

ActivitySchema.index({ requirementId: 1, createdAt: -1 })
ActivitySchema.index({ userId: 1 })
ActivitySchema.index({ nextFollowUpDate: 1 })

const Activity: Model<IActivity> = mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema)

export default Activity
