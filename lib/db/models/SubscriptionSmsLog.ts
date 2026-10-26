import mongoose, { Schema, Document } from 'mongoose'

/** Tracks SMS already sent so cron does not re-send the same offset. */
export interface ISubscriptionSmsLog extends Document {
  enrollment: mongoose.Types.ObjectId | string
  periodEnd: Date
  offsetDays: number
  phone: string
  sentAt: Date
}

const SubscriptionSmsLogSchema = new Schema<ISubscriptionSmsLog>(
  {
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: true,
      index: true,
    },
    periodEnd: { type: Date, required: true },
    offsetDays: { type: Number, required: true },
    phone: { type: String, required: true },
    sentAt: { type: Date, default: Date.now, required: true },
  },
  { collection: 'subscription_sms_logs', timestamps: false },
)

SubscriptionSmsLogSchema.index(
  { enrollment: 1, periodEnd: 1, offsetDays: 1 },
  { unique: true },
)

export const SubscriptionSmsLog =
  mongoose.models.SubscriptionSmsLog ||
  mongoose.model<ISubscriptionSmsLog>(
    'SubscriptionSmsLog',
    SubscriptionSmsLogSchema,
  )
