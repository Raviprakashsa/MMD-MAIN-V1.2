import mongoose, { Schema, Model } from 'mongoose'

export interface ITemplate {
  _id?: mongoose.Types.ObjectId
  name: string
  category: string
  subject?: string
  body: string
  variables: string[]
  createdBy: mongoose.Types.ObjectId | string
  isPublic: boolean
  createdAt?: Date
  updatedAt?: Date
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    subject: { type: String },
    body: { type: String, required: true },
    variables: { type: [String], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
)

TemplateSchema.index({ category: 1 })
TemplateSchema.index({ createdBy: 1 })

const Template: Model<ITemplate> = mongoose.models.Template || mongoose.model<ITemplate>('Template', TemplateSchema)

export default Template
