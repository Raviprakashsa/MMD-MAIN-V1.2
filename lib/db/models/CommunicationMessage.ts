import mongoose, { Schema, Model } from 'mongoose'

export type CommunicationChannel = 'EMAIL' | 'WHATSAPP' | 'CALL' | 'NOTE'
export type MessageDirection = 'INBOUND' | 'OUTBOUND'

export interface ICommunicationMessage {
  _id?: mongoose.Types.ObjectId
  threadId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  channel: CommunicationChannel
  direction: MessageDirection
  body: string
  metadata?: Record<string, unknown>
  createdAt?: Date
}

const CommunicationMessageSchema = new Schema<ICommunicationMessage>(
  {
    threadId: { type: Schema.Types.ObjectId, ref: 'CommunicationThread', required: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    channel: { type: String, required: true, enum: ['EMAIL', 'WHATSAPP', 'CALL', 'NOTE'] },
    direction: { type: String, required: true, enum: ['INBOUND', 'OUTBOUND'] },
    body: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

CommunicationMessageSchema.index({ threadId: 1, createdAt: -1 })
CommunicationMessageSchema.index({ channel: 1 })

const CommunicationMessage: Model<ICommunicationMessage> =
  mongoose.models.CommunicationMessage || mongoose.model<ICommunicationMessage>('CommunicationMessage', CommunicationMessageSchema)

export default CommunicationMessage
