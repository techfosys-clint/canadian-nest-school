import { Enrollment } from './db/models/Enrollment'
import { Coupon } from './db/models/Coupon'
import { completePaidEnrollment } from '@/lib/payments/completePaidEnrollment'

// How long a paid enrollment can sit at 'pending' before we treat it as
// abandoned (user closed the EPS tab without clicking cancel/fail, so our
// callback never fired to release the coupon slot).
const STALE_PENDING_MINUTES = 30

/**
 * Expires pending enrollments for a given coupon that have been sitting
 * unpaid past STALE_PENDING_MINUTES, releasing their reserved usedCount
 * slot. Always asks EPS first — if the customer actually paid, we complete
 * the enrollment instead of wrongly failing a successful payment.
 */
export async function releaseStalePendingCouponUses(couponCode: string): Promise<void> {
  const staleCutoff = new Date(Date.now() - STALE_PENDING_MINUTES * 60 * 1000)

  const staleEnrollments = await Enrollment.find({
    couponCode,
    paymentStatus: 'pending',
    createdAt: { $lt: staleCutoff },
  })

  for (const enrollment of staleEnrollments) {
    if (enrollment.merchantTransactionId) {
      try {
        const result = await completePaidEnrollment(enrollment)
        if (result === 'completed' || result === 'already_completed') {
          continue
        }
        if (result === 'pending') {
          // Still open at EPS — leave the coupon slot reserved a bit longer.
          continue
        }
        // Confirmed failed — completePaidEnrollment already released the coupon.
        continue
      } catch (err) {
        console.error(
          `EPS verify failed while releasing stale coupon use for enrollment ${enrollment._id}:`,
          err,
        )
        // Fall through to local fail + release only when EPS is unreachable
        // after the stale window, so abandoned checkouts don't lock coupons forever.
      }
    }

    if (enrollment.paymentStatus === 'pending') {
      enrollment.paymentStatus = 'failed'
      await enrollment.save()
      await Coupon.updateOne({ code: couponCode }, { $inc: { usedCount: -1 } })
    }
  }
}
