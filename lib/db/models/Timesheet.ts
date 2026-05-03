import mongoose, { Schema, Model } from 'mongoose'

export type WorkType =
  | 'JD Creation'
  | 'Sourcing'
  | 'Screening'
  | 'Interview Coordination'
  | 'Client Follow-up'
  | 'Database Update'
  | 'Administrative'

export interface ITimesheet {
  _id?: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  date: Date
  requirementId?: mongoose.Types.ObjectId | null
  workType: WorkType
  description: string
  hours: number
  isBackdated: boolean
  entryDate: Date
  requiresApproval?: boolean
  createdAt?: Date
  updatedAt?: Date
}

const TimesheetSchema = new Schema<ITimesheet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', default: null },
    workType: {
      type: String,
      required: true,
      enum: ['JD Creation', 'Sourcing', 'Screening', 'Interview Coordination', 'Client Follow-up', 'Database Update', 'Administrative'],
    },
    description: { type: String, required: true },
    hours: { type: Number, required: true, min: 0.5, max: 12 },
    isBackdated: { type: Boolean, default: false },
    entryDate: { type: Date, default: Date.now },
    requiresApproval: { type: Boolean, default: false },
  },
  { timestamps: true }
)

TimesheetSchema.index({ userId: 1, date: 1, requirementId: 1, workType: 1 }, { unique: true })
TimesheetSchema.index({ date: 1 })
TimesheetSchema.index({ userId: 1 })

const Timesheet: Model<ITimesheet> = mongoose.models.Timesheet || mongoose.model<ITimesheet>('Timesheet', TimesheetSchema)

export default Timesheet
