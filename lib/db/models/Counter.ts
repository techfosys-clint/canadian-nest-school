import mongoose, { Schema } from 'mongoose'

export type ICounter = {
  _id: string
  seq: number
}

const CounterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { collection: 'counters', versionKey: false },
)

export const Counter =
  (mongoose.models.Counter as mongoose.Model<ICounter>) ||
  mongoose.model<ICounter>('Counter', CounterSchema)
