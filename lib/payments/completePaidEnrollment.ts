import { Coupon } from '@/lib/db/models/Coupon'
import { Course } from '@/lib/db/models/Course'
import { Enrollment, type IEnrollment } from '@/lib/db/models/Enrollment'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { verifyEpsTransaction } from '@/lib/eps'
import { epsAmountsMatch } from '@/lib/payments/epsAmount'
import { normalizeEpsStatus } from '@/lib/payments/epsStatus'
import { initialPaidUntil } from '@/lib/subscriptions/billing'

export type CompletePaidEnrollmentResult =
  | 'completed'
  | 'already_completed'
  | 'failed'
  | 'pending'
  | 'not_found'

/**
 * Verifies an EPS transaction and updates the enrollment.
 * - Success always wins (including recovering a wrongly marked "failed").
 * - Requires EPS TotalAmount to match enrollment.pricePaid.
 * - Atomic claim prevents double side-effects from callback + IPN races.
 * - Failed is only written when EPS confirms failure/cancel.
 * - Pending / unknown / amount mismatch leave the enrollment open so a later
 *   callback or reconcile job can finish it.
 */
export async function completePaidEnrollment(
  enrollment: IEnrollment,
): Promise<CompletePaidEnrollmentResult> {
  if (enrollment.paymentStatus === 'completed') {
    return 'already_completed'
  }

  if (!enrollment.merchantTransactionId) {
    return 'pending'
  }

  const previousStatus = enrollment.paymentStatus
  const result = await verifyEpsTransaction(enrollment.merchantTransactionId)
  const status = normalizeEpsStatus(result.status)

  if (status === 'not_found') {
    return 'not_found'
  }

  if (status === 'success') {
    if (!epsAmountsMatch(result.totalAmount, enrollment.pricePaid)) {
      console.error('EPS enrollment amount mismatch — leaving pending', {
        enrollmentId: enrollment._id?.toString?.(),
        merchantTransactionId: enrollment.merchantTransactionId,
        expected: enrollment.pricePaid,
        epsTotalAmount: result.totalAmount,
      })
      return 'pending'
    }

    const paymentReference =
      enrollment.paymentReference || enrollment.merchantTransactionId

    const courseForBilling = await Course.findById(enrollment.course)
      .select('billingType title')
      .lean()
    const isMonthly = courseForBilling?.billingType === 'monthly'
    const now = new Date()
    const paidUntil = isMonthly ? initialPaidUntil(now) : undefined

    // Only one worker may transition into completed and run side effects.
    const claimed = await Enrollment.findOneAndUpdate(
      {
        _id: enrollment._id,
        paymentStatus: { $ne: 'completed' },
      },
      {
        $set: {
          paymentStatus: 'completed',
          paymentReference,
          ...(isMonthly
            ? {
                billingType: 'monthly',
                paidUntil,
                billingCycleAnchor: now,
                accessStatus: 'active',
              }
            : { billingType: 'one_time', accessStatus: 'active' }),
        },
      },
      { new: true },
    )

    if (!claimed) {
      enrollment.paymentStatus = 'completed'
      return 'already_completed'
    }

    enrollment.paymentStatus = 'completed'
    enrollment.paymentReference = claimed.paymentReference
    if (isMonthly) {
      enrollment.billingType = 'monthly'
      enrollment.paidUntil = paidUntil
      enrollment.billingCycleAnchor = now
      enrollment.accessStatus = 'active'
    }

    if (previousStatus === 'failed' && claimed.couponCode) {
      await Coupon.updateOne(
        { code: claimed.couponCode },
        { $inc: { usedCount: 1 } },
      )
    }

    let student = await Student.findById(claimed.student).lean()
    if (!student) {
      student = await User.findById(claimed.student).lean()
    }
    const course = courseForBilling || (await Course.findById(claimed.course).lean())

    if (student?.email && course) {
      const { sendEnrollmentConfirmationEmail } = await import('@/lib/email')
      sendEnrollmentConfirmationEmail(
        student.email,
        student.name,
        (course as { title?: string }).title || 'Course',
        claimed.pricePaid,
        claimed.paymentReference || claimed.merchantTransactionId!,
        claimed.createdAt,
      ).catch((err) =>
        console.error('Failed to send enrollment confirmation email:', err),
      )
    }

    return 'completed'
  }

  if (status === 'failed') {
    const failed = await Enrollment.findOneAndUpdate(
      {
        _id: enrollment._id,
        paymentStatus: { $nin: ['completed', 'failed'] },
      },
      { $set: { paymentStatus: 'failed' } },
      { new: true },
    )

    enrollment.paymentStatus = 'failed'
    // Release coupon only when this worker actually transitioned → failed.
    if (failed?.couponCode) {
      await Coupon.updateOne(
        { code: failed.couponCode },
        { $inc: { usedCount: -1 } },
      )
    }

    return 'failed'
  }

  return 'pending'
}
