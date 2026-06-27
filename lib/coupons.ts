import { Enrollment } from './db/models/Enrollment'
import { Coupon } from './db/models/Coupon'

// How long a paid enrollment can sit at 'pending' before we treat it as
// abandoned (user closed the EPS tab without clicking cancel/fail, so our
// callback never fired to release the coupon slot).
const STALE_PENDING_MINUTES = 30

/**
 * Expires pending enrollments for a given coupon that have been sitting
 * unpaid past STALE_PENDING_MINUTES, releasing their reserved usedCount
 * slot. Called opportunistically whenever a coupon is checked/applied, so
 * abandoned EPS sessions don't permanently make a coupon look "used up"
 * without requiring a separate cron job.
 */
export async function releaseStalePendingCouponUses(couponCode: string): Promise<void> {
  const staleCutoff = new Date(Date.now() - STALE_PENDING_MINUTES * 60 * 1000)

  const staleEnrollments = await Enrollment.find({
    couponCode,
    paymentStatus: 'pending',
    createdAt: { $lt: staleCutoff },
  })

  for (const enrollment of staleEnrollments) {
    enrollment.paymentStatus = 'failed'
    await enrollment.save()
    await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: -1 } })
  }
}
