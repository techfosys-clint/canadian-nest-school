import { Coupon } from '@/lib/db/models/Coupon'
import { Course } from '@/lib/db/models/Course'
import type { IEnrollment } from '@/lib/db/models/Enrollment'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { verifyEpsTransaction } from '@/lib/eps'
import { normalizeEpsStatus } from '@/lib/payments/epsStatus'

export type CompletePaidEnrollmentResult =
  | 'completed'
  | 'already_completed'
  | 'failed'
  | 'pending'

/**
 * Verifies an EPS transaction and updates the enrollment.
 * - Success always wins (including recovering a wrongly marked "failed").
 * - Failed is only written when EPS confirms failure/cancel.
 * - Pending / unknown statuses leave the enrollment pending so a later
 *   callback or reconcile job can complete it.
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

  if (status === 'success') {
    enrollment.paymentStatus = 'completed'
    if (!enrollment.paymentReference) {
      enrollment.paymentReference = enrollment.merchantTransactionId
    }
    await enrollment.save()

    // If we previously released the coupon on a false "failed", reclaim it.
    if (previousStatus === 'failed' && enrollment.couponCode) {
      await Coupon.updateOne(
        { code: enrollment.couponCode },
        { $inc: { usedCount: 1 } },
      )
    }

    let student = await Student.findById(enrollment.student).lean()
    if (!student) {
      student = await User.findById(enrollment.student).lean()
    }
    const course = await Course.findById(enrollment.course).lean()

    if (student?.email && course) {
      const { sendEnrollmentConfirmationEmail } = await import('@/lib/email')
      sendEnrollmentConfirmationEmail(
        student.email,
        student.name,
        (course as { title?: string }).title || 'Course',
        enrollment.pricePaid,
        enrollment.paymentReference || enrollment.merchantTransactionId!,
        enrollment.createdAt,
      ).catch((err) =>
        console.error('Failed to send enrollment confirmation email:', err),
      )
    }

    return 'completed'
  }

  if (status === 'failed') {
    if (enrollment.paymentStatus !== 'failed') {
      enrollment.paymentStatus = 'failed'
      await enrollment.save()

      if (enrollment.couponCode) {
        await Coupon.updateOne(
          { code: enrollment.couponCode },
          { $inc: { usedCount: -1 } },
        )
      }
    }
    return 'failed'
  }

  // Still pending at EPS — do not flip the local record to failed.
  return 'pending'
}
