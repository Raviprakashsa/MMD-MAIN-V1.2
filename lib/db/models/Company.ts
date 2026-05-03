import mongoose, { Schema, Model } from 'mongoose'

export type Sector = 'IT' | 'NON_IT' | 'CORE' | 'STARTUP' | 'ENTERPRISE'
export type HiringType = 'PERMANENT' | 'INTERNSHIP' | 'CONTRACT'
export type LeadSource = 'SCRAPING' | 'LEAD' | 'EVENT' | 'REFERRAL'
export type MouStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SIGNED'

export interface ICompany {
  _id?: mongoose.Types.ObjectId
  name: string
  category: string
  sector: Sector
  location: string
  website?: string
  hiringType: HiringType
  source: LeadSource
  mouStatus: MouStatus
  mouDocumentUrl?: string
  mouStartDate?: Date | null
  mouEndDate?: Date | null
  commercialPercent?: number | null
  paymentTerms?: string
  assignedCoordinatorId: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
}

const CompanySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    sector: { type: String, required: true, enum: ['IT', 'NON_IT', 'CORE', 'STARTUP', 'ENTERPRISE'] },
    location: { type: String, required: true, trim: true },
    website: { type: String },
    hiringType: { type: String, required: true, enum: ['PERMANENT', 'INTERNSHIP', 'CONTRACT'] },
    source: { type: String, required: true, enum: ['SCRAPING', 'LEAD', 'EVENT', 'REFERRAL'] },
    mouStatus: { type: String, required: true, enum: ['NOT_STARTED', 'IN_PROGRESS', 'SIGNED'], default: 'NOT_STARTED' },
    mouDocumentUrl: { type: String },
    mouStartDate: { type: Date, default: null },
    mouEndDate: { type: Date, default: null },
    commercialPercent: { type: Number, default: null, min: 0, max: 100 },
    paymentTerms: { type: String },
    assignedCoordinatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

CompanySchema.index({ name: 1, location: 1 }, { unique: true })
CompanySchema.index({ sector: 1 })
CompanySchema.index({ assignedCoordinatorId: 1 })
CompanySchema.index({ mouEndDate: 1 })

const Company: Model<ICompany> = mongoose.models.Company || mongoose.model<ICompany>('Company', CompanySchema)

export default Company
