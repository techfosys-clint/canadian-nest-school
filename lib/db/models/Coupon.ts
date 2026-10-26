import mongoose, { Schema, Document } from 'mongoose'

export interface ICoupon extends Document {
  code: string
  /** discount = cart/checkout discount; subscription_extension = monthly renewal helper */
  kind?: 'discount' | 'subscription_extension'
  discountType: 'percentage' | 'fixed'
  discountValue: number
  expirationDate?: Date
  isActive: boolean
  maxUses?: number
  usedCount: number
  course?: mongoose.Types.ObjectId | string | null
  /** Extra days added to paidUntil after a successful renewal (extension coupons). */
  extensionDays?: number
  /** If set, replaces monthlyFee(+late) for that renewal. */
  overrideFee?: number
  createdAt: Date
  updatedAt: Date
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    kind: {
      type: String,
      enum: ['discount', 'subscription_extension'],
      default: 'discount',
    },
    discountType: { type: String, enum: ['percentage', 'fixed'], default: 'fixed', required: true },
    discountValue: { type: Number, required: true, min: 0 },
    expirationDate: { type: Date },
    isActive: { type: Boolean, default: true, required: true },
    maxUses: { type: Number },
    usedCount: { type: Number, default: 0, required: true },
    // When set, the coupon only applies to this specific course.
    // Null/absent means the coupon works on every course.
    course: { type: Schema.Types.ObjectId, ref: 'Course', default: null },
    extensionDays: { type: Number, min: 0, default: 0 },
    overrideFee: { type: Number, min: 0 },
  },
  { collection: 'coupons', timestamps: true }
)

// Clear cached model in dev if newer paths are missing from the compiled schema
if (
  mongoose.models.Coupon &&
  (!mongoose.models.Coupon.schema.paths.course ||
    !mongoose.models.Coupon.schema.paths.kind)
) {
  delete mongoose.models.Coupon
}

export const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema)
