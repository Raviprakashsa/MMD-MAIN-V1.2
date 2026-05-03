import mongoose, { Schema, Model } from 'mongoose'

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "COORDINATOR" | "RECRUITER" | "SCRAPER"

export interface IUser {
  _id?: mongoose.Types.ObjectId
  email: string
  password: string
  name: string
  role: UserRole
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
  deletedAt?: Date | null
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER', 'SCRAPER'],
      default: 'RECRUITER',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Indexes for efficient queries
UserSchema.index({ email: 1 }, { unique: true })
UserSchema.index({ deletedAt: 1 })

const User: Model<IUser> = mongoose.models?.User || mongoose.model<IUser>('User', UserSchema)

export default User
