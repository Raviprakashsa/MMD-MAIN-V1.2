import mongoose, { Schema, Model } from 'mongoose'

export type NotificationType = 'STALLED_REQ' | 'MISSING_JD' | 'FOLLOW_UP'

export interface INotification {
  _id?: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId | string
  type: NotificationType
  message: string
  link?: string
  isRead: boolean
  createdAt?: Date
  updatedAt?: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['STALLED_REQ', 'MISSING_JD', 'FOLLOW_UP'] },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
)

NotificationSchema.index({ userId: 1, isRead: 1 })
NotificationSchema.index({ createdAt: -1 })

const Notification: Model<INotification> = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema)

export default Notification
