import mongoose, { Schema, Model } from 'mongoose'

export interface ICandidateActivity {
  _id?: mongoose.Types.ObjectId
  candidateId: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  type: string
  notes: string
  rating?: number
  createdAt?: Date
}

const CandidateActivitySchema = new Schema<ICandidateActivity>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    notes: { type: String, required: true },
    rating: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

CandidateActivitySchema.index({ candidateId: 1, createdAt: -1 })

const CandidateActivity: Model<ICandidateActivity> =
  mongoose.models.CandidateActivity || mongoose.model<ICandidateActivity>('CandidateActivity', CandidateActivitySchema)

export default CandidateActivity
