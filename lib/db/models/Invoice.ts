import mongoose, { Schema, Model } from 'mongoose'

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'VOID'

export interface IInvoice {
  _id?: mongoose.Types.ObjectId
  invoiceNumber: string
  companyId: mongoose.Types.ObjectId
  requirementId?: mongoose.Types.ObjectId | null
  placementId?: mongoose.Types.ObjectId | null
  amount: number
  currency?: string
  status: InvoiceStatus
  issueDate: Date
  dueDate: Date
  pdfUrl?: string | null
  createdAt?: Date
  updatedAt?: Date
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', default: null },
    placementId: { type: Schema.Types.ObjectId, ref: 'Placement', default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['DRAFT', 'SENT', 'PAID', 'VOID'], default: 'DRAFT' },
    issueDate: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date, required: true },
    pdfUrl: { type: String },
  },
  { timestamps: true }
)

InvoiceSchema.index({ companyId: 1 })
InvoiceSchema.index({ dueDate: 1 })
InvoiceSchema.index({ status: 1 })

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema)

export default Invoice
