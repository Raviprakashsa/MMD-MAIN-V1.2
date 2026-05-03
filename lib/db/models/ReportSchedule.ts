import mongoose, { Schema, Model } from 'mongoose'

export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export interface IReportSchedule {
  _id?: mongoose.Types.ObjectId
  name: string
  reportType: string
  frequency: ReportFrequency
  recipients: string[]
  filters?: Record<string, unknown>
  isActive: boolean
  lastRunAt?: Date | null
  nextRunAt?: Date | null
  processingStartedAt?: Date | null
  lastError?: string | null
  consecutiveFailures?: number
  maxConsecutiveFailures?: number
  deadLetteredAt?: Date | null
  createdBy: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

const ReportScheduleSchema = new Schema<IReportSchedule>(
  {
    name: { type: String, required: true },
    reportType: { type: String, required: true },
    frequency: { type: String, required: true, enum: ['DAILY', 'WEEKLY', 'MONTHLY'] },
    recipients: { type: [String], required: true },
    filters: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    lastRunAt: { type: Date, default: null },
    nextRunAt: { type: Date, default: null },
    processingStartedAt: { type: Date, default: null },
    lastError: { type: String, default: null },
    consecutiveFailures: { type: Number, default: 0 },
    maxConsecutiveFailures: { type: Number, default: 3 },
    deadLetteredAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

ReportScheduleSchema.index({ reportType: 1, isActive: 1 })
ReportScheduleSchema.index({ frequency: 1 })
ReportScheduleSchema.index({ isActive: 1, deadLetteredAt: 1, nextRunAt: 1, createdAt: 1 })

const ReportSchedule: Model<IReportSchedule> =
  mongoose.models.ReportSchedule || mongoose.model<IReportSchedule>('ReportSchedule', ReportScheduleSchema)

export default ReportSchedule
