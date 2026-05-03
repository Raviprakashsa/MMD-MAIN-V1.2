import mongoose, { Schema, Model } from 'mongoose'
import type { Sector } from './Company'

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'FOLLOW_UP' | 'CONVERTED' | 'REJECTED' | 'STALLED'
export type ActivityType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'note'

export interface ILeadActivity {
  _id?: mongoose.Types.ObjectId
  type: ActivityType
  summary: string
  outcome: string
  date: string
  time: string
  createdBy: string
  createdByName?: string
  nextFollowUp?: string
  createdAt?: Date
}

export interface ILead {
  _id?: mongoose.Types.ObjectId
  sourcePlatform: string
  companyName: string
  sector: Sector
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  contactLinkedIn?: string
  confidenceScore: number
  notes?: string
  status: LeadStatus
  followUpDate?: string
  lastActivityDate?: string
  activities: ILeadActivity[]
  convertedToCompanyId?: string
  convertedAt?: Date
  convertedBy?: string
  assignedTo?: string
  assignedToName?: string
  createdBy?: string
  createdByName?: string
  deletedAt?: Date | null
  createdAt?: Date
  updatedAt?: Date
}

const LeadActivitySchema = new Schema<ILeadActivity>(
  {
    type: { type: String, required: true, enum: ['call', 'whatsapp', 'email', 'meeting', 'note'] },
    summary: { type: String, required: true },
    outcome: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    createdBy: { type: String, required: true },
    createdByName: { type: String },
    nextFollowUp: { type: String },
  },
  { timestamps: true }
)

const LeadSchema = new Schema<ILead>(
  {
    sourcePlatform: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    sector: { type: String, required: true, enum: ['IT', 'NON_IT', 'CORE', 'STARTUP', 'ENTERPRISE'] },
    contactName: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    contactLinkedIn: { type: String },
    confidenceScore: { type: Number, required: true, min: 1, max: 100 },
    notes: { type: String },
    status: { type: String, required: true, enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'FOLLOW_UP', 'CONVERTED', 'REJECTED', 'STALLED'], default: 'NEW' },
    followUpDate: { type: String },
    lastActivityDate: { type: String },
    activities: { type: [LeadActivitySchema], default: [] },
    convertedToCompanyId: { type: String },
    convertedAt: { type: Date },
    convertedBy: { type: String },
    assignedTo: { type: String },
    assignedToName: { type: String },
    createdBy: { type: String },
    createdByName: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

LeadSchema.index({ status: 1 })
LeadSchema.index({ assignedTo: 1 })
LeadSchema.index({ deletedAt: 1 })

const Lead: Model<ILead> = mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema)

export default Lead
