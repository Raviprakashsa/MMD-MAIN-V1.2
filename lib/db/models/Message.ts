import mongoose, { Schema, Model } from 'mongoose'

export type MessageType = 'REQUEST' | 'MESSAGE' | 'NOTIFICATION'
export type MessageStatus = 'UNREAD' | 'READ' | 'ARCHIVED'

export interface IMessage {
    _id?: mongoose.Types.ObjectId
    senderId: mongoose.Types.ObjectId
    senderName: string
    senderRole: string
    recipientId?: mongoose.Types.ObjectId // If null, it's for all admins
    recipientRole?: string // e.g., 'ADMIN' to target all admins
    subject: string
    body: string
    type: MessageType
    status: MessageStatus
    createdAt?: Date
    updatedAt?: Date
}

const MessageSchema = new Schema<IMessage>(
    {
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        senderName: { type: String, required: true },
        senderRole: { type: String, required: true },
        recipientId: { type: Schema.Types.ObjectId, ref: 'User' },
        recipientRole: { type: String },
        subject: { type: String, required: true },
        body: { type: String, required: true },
        type: {
            type: String,
            enum: ['REQUEST', 'MESSAGE', 'NOTIFICATION'],
            default: 'MESSAGE',
        },
        status: {
            type: String,
            enum: ['UNREAD', 'READ', 'ARCHIVED'],
            default: 'UNREAD',
        },
    },
    {
        timestamps: true,
    }
)

MessageSchema.index({ recipientId: 1, status: 1 })
MessageSchema.index({ recipientRole: 1, status: 1 })
MessageSchema.index({ senderId: 1 })

const Message: Model<IMessage> = mongoose.models?.Message || mongoose.model<IMessage>('Message', MessageSchema)

export default Message
