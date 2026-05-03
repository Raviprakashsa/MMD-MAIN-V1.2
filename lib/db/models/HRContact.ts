import mongoose, { Schema, Model } from 'mongoose'

export interface IHRContact {
  _id?: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  name: string
  phone?: string
  email?: string
  linkedIn?: string
  designation?: string
  isPrimary: boolean
  deletedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

const HRContactSchema = new Schema<IHRContact>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String },
    email: { type: String },
    linkedIn: { type: String },
    designation: { type: String },
    isPrimary: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

HRContactSchema.index({ companyId: 1, isPrimary: 1 })
HRContactSchema.index({ companyId: 1, deletedAt: 1 })

const HRContact: Model<IHRContact> = mongoose.models.HRContact || mongoose.model<IHRContact>('HRContact', HRContactSchema)

export default HRContact

