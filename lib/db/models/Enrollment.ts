import mongoose, { Schema, Document } from 'mongoose'

export interface IEnrollment extends Document {
  student: mongoose.Types.ObjectId | string
  course: mongoose.Types.ObjectId | string
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded'
  pricePaid: number
  paymentReference?: string
  merchantTransactionId?: string
  billingName?: string
  billingPhone?: string
  billingAddress?: string
  couponCode?: string
  completedLessons: string[] // Array of lesson IDs completed by the student
  createdAt: Date
  updatedAt: Date
}

const EnrollmentSchema = new Schema<IEnrollment>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending', required: true },
    pricePaid: { type: Number, required: true, min: 0 },
    paymentReference: String,
    merchantTransactionId: { type: String, unique: true, sparse: true },
    billingName: String,
    billingPhone: String,
    billingAddress: String,
    couponCode: String,
    completedLessons: { type: [String], default: [] },
  },
  { collection: 'enrollments', timestamps: true }
)

export const Enrollment = mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema)
