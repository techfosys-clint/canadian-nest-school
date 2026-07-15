import mongoose, { Schema, Document } from 'mongoose'

export interface IInstructorReview extends Document {
  course: mongoose.Types.ObjectId | string
  student: mongoose.Types.ObjectId | string
  instructor: mongoose.Types.ObjectId | string
  rating: '1' | '2' | '3' | '4' | '5'
  comment: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date
  updatedAt: Date
}

const InstructorReviewSchema = new Schema<IInstructorReview>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    instructor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: {
      type: String,
      enum: ['1', '2', '3', '4', '5'],
      default: '5',
      required: true,
    },
    comment: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      required: true,
    },
  },
  { collection: 'instructor_reviews', timestamps: true },
)

InstructorReviewSchema.index(
  { student: 1, course: 1, instructor: 1 },
  { unique: true },
)

export const InstructorReview =
  mongoose.models.InstructorReview ||
  mongoose.model<IInstructorReview>('InstructorReview', InstructorReviewSchema)
