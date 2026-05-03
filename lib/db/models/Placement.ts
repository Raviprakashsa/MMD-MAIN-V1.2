import mongoose, { Schema, Model } from 'mongoose'

export type PlacementStatus = 'OFFERED' | 'ACCEPTED' | 'JOINED' | 'BACKED_OUT' | 'INVOICE_SENT' | 'PAID'

export interface IPlacement {
  _id?: mongoose.Types.ObjectId
  requirementId: mongoose.Types.ObjectId
  candidateId: mongoose.Types.ObjectId
  companyId: mongoose.Types.ObjectId
  status: PlacementStatus
  offerDate?: Date | null
  joiningDate?: Date | null
  feeAmount?: number | null
  currency?: string | null
  invoiceNumber?: string | null
  invoiceUrl?: string | null
  paymentReceivedAt?: Date | null
  backoutReason?: string | null
  notes?: string | null
  createdAt?: Date
  updatedAt?: Date
}

const PlacementSchema = new Schema<IPlacement>(
  {
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    status: {
      type: String,
      enum: ['OFFERED', 'ACCEPTED', 'JOINED', 'BACKED_OUT', 'INVOICE_SENT', 'PAID'],
      default: 'OFFERED',
      required: true,
    },
    offerDate: { type: Date, default: () => new Date() },
    joiningDate: { type: Date, default: null },
    feeAmount: { type: Number },
    currency: { type: String },
    invoiceNumber: { type: String },
    invoiceUrl: { type: String },
    paymentReceivedAt: { type: Date, default: null },
    backoutReason: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
)

PlacementSchema.index({ requirementId: 1, candidateId: 1 }, { unique: true })
PlacementSchema.index({ companyId: 1 })
PlacementSchema.index({ status: 1 })

const Placement: Model<IPlacement> = mongoose.models.Placement || mongoose.model<IPlacement>('Placement', PlacementSchema)

export default Placement
