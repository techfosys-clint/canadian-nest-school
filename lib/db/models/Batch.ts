import mongoose, { Schema, Document } from 'mongoose'

export interface IBatch extends Document {
  name: string
  course: mongoose.Types.ObjectId | string
  instructor: mongoose.Types.ObjectId | string
  startDate: Date
  endDate: Date
  status: 'upcoming' | 'active' | 'completed'
  students: mongoose.Types.ObjectId[] | string[]
  // Maximum number of students who can join this batch. 0 = unlimited.
  // Once students.length reaches maxStudents, the batch stops accepting
  // new joins until reactivateDate (if set) passes.
  maxStudents: number
  reactivateDate?: Date | null
  createdAt: Date
  updatedAt: Date
}

const BatchSchema = new Schema<IBatch>(
  {
    name: { type: String, required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming', required: true },
    students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    maxStudents: { type: Number, default: 0, min: 0 },
    reactivateDate: { type: Date, default: null },
  },
  { collection: 'batches', timestamps: true }
)

export const Batch = mongoose.models.Batch || mongoose.model<IBatch>('Batch', BatchSchema)
