import mongoose, { Model, Schema } from 'mongoose'

export interface ICounter {
  _id?: mongoose.Types.ObjectId
  key: string
  value: number
  createdAt?: Date
  updatedAt?: Date
}

const CounterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
)

const Counter: Model<ICounter> = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema)

export default Counter
