import mongoose, { Schema, Document } from 'mongoose'

/**
 * Singleton-style global settings for monthly-fee SMS reminders.
 * Offsets are days BEFORE paidUntil (period end), e.g. [5, 3, 1].
 */
export interface ISmsReminderSettings extends Document {
  enabled: boolean
  /** Days before period end to send reminders (unique, sorted desc). */
  offsetDaysBeforeEnd: number[]
  /** Max SMS per enrollment per billing period. */
  maxMessagesPerPeriod: number
  createdAt: Date
  updatedAt: Date
}

const SmsReminderSettingsSchema = new Schema<ISmsReminderSettings>(
  {
    enabled: { type: Boolean, default: true, required: true },
    offsetDaysBeforeEnd: {
      type: [Number],
      default: [5, 3, 1],
      required: true,
    },
    maxMessagesPerPeriod: { type: Number, default: 3, min: 0, required: true },
  },
  { collection: 'sms_reminder_settings', timestamps: true },
)

export const SmsReminderSettings =
  mongoose.models.SmsReminderSettings ||
  mongoose.model<ISmsReminderSettings>(
    'SmsReminderSettings',
    SmsReminderSettingsSchema,
  )

export const SMS_REMINDER_SETTINGS_SINGLETON_QUERY = {}
