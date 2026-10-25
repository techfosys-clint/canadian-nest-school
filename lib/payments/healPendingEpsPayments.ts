import { Enrollment } from '@/lib/db/models/Enrollment'
import { Order } from '@/lib/db/models/Order'
import { completePaidEnrollment } from '@/lib/payments/completePaidEnrollment'
import { completePaidOrder } from '@/lib/orders/completePaidOrder'

export type HealByMerchantResult = {
  type: 'enrollment' | 'order' | 'none'
  result?: string
  id?: string
}

/**
 * Find enrollment or order by EPS merchant transaction id and complete it
 * via live verify (never trust status alone).
 */
export async function healPaymentByMerchantTransactionId(
  merchantTransactionId: string,
): Promise<HealByMerchantResult> {
  const txn = merchantTransactionId.trim()
  if (!txn) return { type: 'none' }

  const enrollment = await Enrollment.findOne({ merchantTransactionId: txn })
  if (enrollment) {
    const result = await completePaidEnrollment(enrollment)
    return {
      type: 'enrollment',
      result,
      id: enrollment._id.toString(),
    }
  }

  const order = await Order.findOne({ merchantTransactionId: txn })
  if (order) {
    const result = await completePaidOrder(order)
    return {
      type: 'order',
      result,
      id: order._id.toString(),
    }
  }

  return { type: 'none' }
}

/**
 * Re-check a student's open EPS enrollments so a successful payment that
 * never hit the browser callback still unlocks the course on next dashboard load.
 * Also re-checks recently failed ones (EPS lag / premature fail redirect).
 */
export async function healStudentPendingEnrollments(
  studentId: string,
  options?: { limit?: number; recoverFailedWithinHours?: number },
): Promise<{ checked: number; completed: number }> {
  const limit = options?.limit ?? 8
  const recoverFailedWithinHours = options?.recoverFailedWithinHours ?? 72
  const failedSince = new Date(
    Date.now() - recoverFailedWithinHours * 60 * 60 * 1000,
  )

  const open = await Enrollment.find({
    student: studentId,
    merchantTransactionId: { $exists: true, $nin: [null, ''] },
    $or: [
      { paymentStatus: 'pending' },
      { paymentStatus: 'failed', updatedAt: { $gte: failedSince } },
      { paymentStatus: 'failed', createdAt: { $gte: failedSince } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)

  let completed = 0
  for (const enrollment of open) {
    try {
      const result = await completePaidEnrollment(enrollment)
      if (result === 'completed' || result === 'already_completed') {
        completed += 1
      }
      // pending / not_found: leave as-is; IPN or a later heal may still complete.
    } catch (err) {
      console.error(
        'healStudentPendingEnrollments error:',
        enrollment.merchantTransactionId,
        err,
      )
    }
  }

  return { checked: open.length, completed }
}
