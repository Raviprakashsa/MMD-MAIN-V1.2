import mongoose, { Schema, Model } from 'mongoose'

export interface ISession {
  _id?: mongoose.Types.ObjectId
  sessionToken: string
  userId: mongoose.Types.ObjectId
  expires: Date
  createdAt?: Date
  updatedAt?: Date
}

const SessionSchema = new Schema<ISession>(
  {
    sessionToken: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expires: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

SessionSchema.index({ sessionToken: 1 })
SessionSchema.index({ userId: 1 })

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema)

export default Session
