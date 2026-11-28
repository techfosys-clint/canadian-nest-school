import mongoose, { Schema, Document } from 'mongoose'

export interface IContactMessage extends Document {
  name: string
  email: string
  subject: string
  message: string
  locale: 'bn' | 'en'
  /** Whether the notification email reached the school inbox. */
  emailSent: boolean
  /** Set by an admin once the message has been answered. */
  handled: boolean
  createdAt: Date
  updatedAt: Date
}

const ContactMessageSchema = new Schema<IContactMessage>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    locale: { type: String, enum: ['bn', 'en'], default: 'bn' },
    emailSent: { type: Boolean, default: false },
    handled: { type: Boolean, default: false },
  },
  { collection: 'contact_messages', timestamps: true },
)

ContactMessageSchema.index({ createdAt: -1 })

export const ContactMessage: mongoose.Model<IContactMessage> =
  (mongoose.models.ContactMessage as mongoose.Model<IContactMessage> | undefined) ||
  mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema)
