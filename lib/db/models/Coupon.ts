import mongoose, { Schema, Document } from 'mongoose'

export interface ICoupon extends Document {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  expirationDate?: Date
  isActive: boolean
  maxUses?: number
  usedCount: number
  course?: mongoose.Types.ObjectId | string | null
  createdAt: Date
  updatedAt: Date
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'fixed', required: true },
    discountValue: { type: Number, required: true, min: 0 },
    expirationDate: { type: Date },
    isActive: { type: Boolean, default: true, required: true },
    maxUses: { type: Number },
    usedCount: { type: Number, default: 0, required: true },
    // When set, the coupon only applies to this specific course.
    // Null/absent means the coupon works on every course.
    course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
  },
  { collection: 'coupons', timestamps: true }
)

// Clear cached model in dev if the course path is missing from the compiled schema
if (mongoose.models.Coupon && !mongoose.models.Coupon.schema.paths.course) {
  delete mongoose.models.Coupon
}

export const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema)
