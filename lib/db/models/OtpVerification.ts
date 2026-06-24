import mongoose, { Schema, Document } from 'mongoose'

export interface IOtpVerification extends Document {
  phone: string
  otpHash: string
  attempts: number
  verified: boolean
  expiresAt: Date
}

const OtpVerificationSchema = new Schema<IOtpVerification>(
  {
    phone: { type: String, required: true, unique: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { collection: 'otp_verifications', timestamps: true }
)

export const OtpVerification =
  mongoose.models.OtpVerification || mongoose.model<IOtpVerification>('OtpVerification', OtpVerificationSchema)
