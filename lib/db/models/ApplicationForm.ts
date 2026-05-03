import mongoose, { Schema, Model } from 'mongoose'

export interface IApplicationForm {
  _id?: mongoose.Types.ObjectId
  requirementId: mongoose.Types.ObjectId
  formFields: any
  shareableUrl: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const ApplicationFormSchema = new Schema<IApplicationForm>(
  {
    requirementId: { type: Schema.Types.ObjectId, ref: 'Requirement', required: true, unique: true },
    formFields: { type: Schema.Types.Mixed, required: true },
    shareableUrl: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const ApplicationForm: Model<IApplicationForm> =
  mongoose.models.ApplicationForm || mongoose.model<IApplicationForm>('ApplicationForm', ApplicationFormSchema)

export default ApplicationForm
