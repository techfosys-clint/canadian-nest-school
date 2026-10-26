import { Coupon } from '@/lib/db/models/Coupon'
import { Enrollment } from '@/lib/db/models/Enrollment'
import {
  SubscriptionPayment,
  type ISubscriptionPayment,
} from '@/lib/db/models/SubscriptionPayment'
import { verifyEpsTransaction } from '@/lib/eps'
import { epsAmountsMatch } from '@/lib/payments/epsAmount'
import { normalizeEpsStatus } from '@/lib/payments/epsStatus'
import { nextPaidUntil } from '@/lib/subscriptions/billing'

export type CompleteSubscriptionPaymentResult =
  | 'completed'
  | 'already_completed'
  | 'failed'
  | 'pending'
  | 'not_found'

/**
 * Completes a monthly renewal EPS payment and extends enrollment.paidUntil
 * from the previous period end (+ optional extension days).
 */
export async function completeSubscriptionPayment(
  payment: ISubscriptionPayment,
): Promise<CompleteSubscriptionPaymentResult> {
  if (payment.paymentStatus === 'completed') {
    return 'already_completed'
  }

  if (!payment.merchantTransactionId) {
    return 'pending'
  }

  const result = await verifyEpsTransaction(payment.merchantTransactionId)
  const status = normalizeEpsStatus(result.status)

  if (status === 'not_found') return 'not_found'

  if (status === 'success') {
    if (!epsAmountsMatch(result.totalAmount, payment.amount)) {
      console.error('EPS subscription amount mismatch — leaving pending', {
        paymentId: payment._id?.toString?.(),
        expected: payment.amount,
        epsTotalAmount: result.totalAmount,
      })
      return 'pending'
    }

    const paymentReference =
      payment.paymentReference || payment.merchantTransactionId

    const claimed = await SubscriptionPayment.findOneAndUpdate(
      {
        _id: payment._id,
        paymentStatus: { $ne: 'completed' },
      },
      {
        $set: {
          paymentStatus: 'completed',
          paymentReference,
        },
      },
      { new: true },
    )

    if (!claimed) {
      payment.paymentStatus = 'completed'
      return 'already_completed'
    }

    payment.paymentStatus = 'completed'
    payment.paymentReference = claimed.paymentReference

    const enrollment = await Enrollment.findById(claimed.enrollment)
    if (enrollment) {
      const previousEnd =
        enrollment.paidUntil &&
        new Date(enrollment.paidUntil).getTime() > 0
          ? new Date(enrollment.paidUntil)
          : new Date(claimed.periodStart)

      const paidUntil = nextPaidUntil(
        previousEnd,
        claimed.extensionDays || 0,
      )

      enrollment.paidUntil = paidUntil
      enrollment.accessStatus = 'active'
      enrollment.billingType = 'monthly'
      enrollment.pricePaid = claimed.amount
      if (!enrollment.billingCycleAnchor) {
        enrollment.billingCycleAnchor = claimed.periodStart
      }
      await enrollment.save()
    }

    if (claimed.couponCode) {
      await Coupon.updateOne(
        { code: claimed.couponCode },
        { $inc: { usedCount: 1 } },
      )
    }

    return 'completed'
  }

  if (status === 'failed') {
    await SubscriptionPayment.findOneAndUpdate(
      {
        _id: payment._id,
        paymentStatus: { $nin: ['completed', 'failed'] },
      },
      { $set: { paymentStatus: 'failed' } },
    )
    payment.paymentStatus = 'failed'
    return 'failed'
  }

  return 'pending'
}
