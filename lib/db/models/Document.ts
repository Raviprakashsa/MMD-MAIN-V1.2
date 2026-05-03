import mongoose, { Schema, Model } from 'mongoose'

export type DocumentEntity = 'Company' | 'Requirement' | 'Candidate' | 'Placement' | 'CommunicationThread'

export interface IDocument {
  _id?: mongoose.Types.ObjectId
  entityType: DocumentEntity
  entityId: mongoose.Types.ObjectId | string
  name: string
  url: string
  storageKey?: string | null
  originalFileName?: string | null
  category?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  tags?: string[]
  uploadedBy: mongoose.Types.ObjectId
  createdAt?: Date
  updatedAt?: Date
}

const DocumentSchema = new Schema<IDocument>(
  {
    entityType: { type: String, required: true, enum: ['Company', 'Requirement', 'Candidate', 'Placement', 'CommunicationThread'] },
    entityId: { type: Schema.Types.Mixed, required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    storageKey: { type: String },
    originalFileName: { type: String },
    category: { type: String },
    mimeType: { type: String },
    sizeBytes: { type: Number },
    tags: { type: [String], default: [] },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
)

DocumentSchema.index({ entityType: 1, entityId: 1 })
DocumentSchema.index({ uploadedBy: 1 })

const Document: Model<IDocument> = mongoose.models.Document || mongoose.model<IDocument>('Document', DocumentSchema)

export default Document
