import mongoose, { Schema, Model } from 'mongoose'

export type CandidateStatus = 'APPLIED' | 'SHORTLISTED' | 'INTERVIEWED' | 'OFFERED' | 'JOINED' | 'REJECTED'

export interface ICandidate {
  _id?: mongoose.Types.ObjectId
  requirementId: mongoose.Types.ObjectId
  applicationFormId?: mongoose.Types.ObjectId | null
  name: string
  phone: string
  email: string
  resumeUrl?: string
  resumeStorageKey?: string
  resumeMimeType?: string
  resumeFileName?: string
  resumeSizeBytes?: number
  skills: string[]
  college?: string | null
  yearsExperience?: number | null
  status: CandidateStatus
  appliedAt?: Date
  shortlistedAt?: Date
  interviewedAt?: Date
  offeredAt?: Date
  joinedAt?: Date
  rejectedAt?: Date
  embedding?: number[]
  deletedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

const CandidateSchema = new Schema<ICandidate>(
  {
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true },
    applicationFormId: { type: Schema.Types.ObjectId, ref: 'ApplicationForm', default: null },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    resumeUrl: { type: String },
    resumeStorageKey: { type: String },
    resumeMimeType: { type: String },
    resumeFileName: { type: String },
    resumeSizeBytes: { type: Number },
    skills: { type: [String], default: [] },
    college: { type: String },
    yearsExperience: { type: Number },
    status: { type: String, enum: ['APPLIED', 'SHORTLISTED', 'INTERVIEWED', 'OFFERED', 'JOINED', 'REJECTED'], default: 'APPLIED' },
    appliedAt: { type: Date, default: () => new Date() },
    shortlistedAt: { type: Date },
    interviewedAt: { type: Date },
    offeredAt: { type: Date },
    joinedAt: { type: Date },
    rejectedAt: { type: Date },
    embedding: { type: [Number], default: undefined },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

  CandidateSchema.index({ email: 1, requirementId: 1, deletedAt: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } })
  CandidateSchema.index({ status: 1 })
  CandidateSchema.index({ requirementId: 1, deletedAt: 1 })

const Candidate: Model<ICandidate> = mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema)

export default Candidate
