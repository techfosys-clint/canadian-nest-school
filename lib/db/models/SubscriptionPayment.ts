import mongoose, { Schema, Document } from 'mongoose'

export interface ISubscriptionPayment extends Document {
  enrollment: mongoose.Types.ObjectId | string
  student: mongoose.Types.ObjectId | string
  course: mongoose.Types.ObjectId | string
  periodStart: Date
  periodEnd: Date
  amount: number
  lateFee: number
  couponCode?: string
  extensionDays: number
  paymentStatus: 'pending' | 'completed' | 'failed'
  paymentReference?: string
  merchantTransactionId?: string
  createdAt: Date
  updatedAt: Date
}

const SubscriptionPaymentSchema = new Schema<ISubscriptionPayment>(
  {
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    lateFee: { type: Number, default: 0, min: 0 },
    couponCode: { type: String },
    extensionDays: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      required: true,
    },
    paymentReference: String,
    merchantTransactionId: { type: String, unique: true, sparse: true },
  },
  { collection: 'subscription_payments', timestamps: true },
)

export const SubscriptionPayment =
  mongoose.models.SubscriptionPayment ||
  mongoose.model<ISubscriptionPayment>(
    'SubscriptionPayment',
    SubscriptionPaymentSchema,
  )
