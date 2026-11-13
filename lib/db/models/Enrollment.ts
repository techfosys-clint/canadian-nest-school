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
  /** Present for subscription enrollments (monthly / quarterly). */
  billingType?: 'one_time' | 'monthly' | 'quarterly'
  /** End of the current paid period (recurring only). */
  paidUntil?: Date
  /** Join date used as billing cycle anchor (recurring only). */
  billingCycleAnchor?: Date
  /** Original charge and coverage, captured at recurring enrollment. */
  initialPaymentAmount?: number
  initialPaymentPeriodEnd?: Date
  /** Batch this student joined (required for monthly/quarterly). */
  batch?: mongoose.Types.ObjectId | string
  accessStatus?: 'active' | 'blocked'
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
    billingType: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly'],
      default: 'one_time',
    },
    paidUntil: { type: Date },
    billingCycleAnchor: { type: Date },
    initialPaymentAmount: { type: Number, min: 0 },
    initialPaymentPeriodEnd: { type: Date },
    batch: { type: Schema.Types.ObjectId, ref: 'Batch' },
    accessStatus: {
      type: String,
      enum: ['active', 'blocked'],
      default: 'active',
    },
  },
  { collection: 'enrollments', timestamps: true }
)

if (
  mongoose.models.Enrollment &&
  (!mongoose.models.Enrollment.schema.paths.billingType ||
    !mongoose.models.Enrollment.schema.paths.batch ||
    !mongoose.models.Enrollment.schema.paths.initialPaymentPeriodEnd)
) {
  delete mongoose.models.Enrollment
}

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
