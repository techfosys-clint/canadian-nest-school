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

// Defense-in-depth: even though the enrollment API already checks for an
// existing completed enrollment before charging, this DB-level partial
// unique index blocks a second *completed* enrollment for the same
// student+course from ever being written (e.g. two concurrent EPS
// callbacks), so a student can never end up paying for the same course
// twice.
EnrollmentSchema.index(
  { student: 1, course: 1 },
  { unique: true, partialFilterExpression: { paymentStatus: 'completed' } }
)

export const Enrollment = mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema)
