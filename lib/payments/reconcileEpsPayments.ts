import { Enrollment } from '@/lib/db/models/Enrollment'
import { Order } from '@/lib/db/models/Order'
import { completePaidEnrollment } from '@/lib/payments/completePaidEnrollment'
import { completePaidOrder } from '@/lib/orders/completePaidOrder'

export type ReconcileSummary = {
  enrollmentsChecked: number
  enrollmentsCompleted: number
  enrollmentsFailed: number
  enrollmentsPending: number
  ordersChecked: number
  ordersCompleted: number
  ordersFailed: number
  ordersPending: number
  errors: string[]
}

/**
 * Re-check EPS for open payments so Success emails that never returned to
 * the site still get written into the database.
 *
 * Includes:
 * - pending enrollments/orders with a merchantTransactionId
 * - recently failed ones (recovery for the old "non-success = failed" bug)
 */
export async function reconcileEpsPayments(options?: {
  /** Also re-check records marked failed within this window (hours). Default 72. */
  recoverFailedWithinHours?: number
  /** Ignore brand-new checkouts still in the EPS UI (minutes). Default 2. */
  minAgeMinutes?: number
  /** Cap how many records we touch per run. Default 50. */
  limit?: number
}): Promise<ReconcileSummary> {
  const recoverFailedWithinHours = options?.recoverFailedWithinHours ?? 72
  const minAgeMinutes = options?.minAgeMinutes ?? 2
  const limit = options?.limit ?? 50

  const minCreatedAt = new Date(Date.now() - minAgeMinutes * 60 * 1000)
  const failedSince = new Date(
    Date.now() - recoverFailedWithinHours * 60 * 60 * 1000,
  )

  const summary: ReconcileSummary = {
    enrollmentsChecked: 0,
    enrollmentsCompleted: 0,
    enrollmentsFailed: 0,
    enrollmentsPending: 0,
    ordersChecked: 0,
    ordersCompleted: 0,
    ordersFailed: 0,
    ordersPending: 0,
    errors: [],
  }

  const enrollmentQuery = {
    merchantTransactionId: { $exists: true, $nin: [null, ''] },
    createdAt: { $lt: minCreatedAt },
    $or: [
      { paymentStatus: 'pending' },
      { paymentStatus: 'failed', updatedAt: { $gte: failedSince } },
      { paymentStatus: 'failed', createdAt: { $gte: failedSince } },
    ],
  }

  const enrollments = await Enrollment.find(enrollmentQuery)
    .sort({ createdAt: -1 })
    .limit(limit)

  for (const enrollment of enrollments) {
    summary.enrollmentsChecked += 1
    try {
      const result = await completePaidEnrollment(enrollment)
      if (result === 'completed' || result === 'already_completed') {
        summary.enrollmentsCompleted += 1
      } else if (result === 'failed') {
        summary.enrollmentsFailed += 1
      } else {
        summary.enrollmentsPending += 1
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      summary.errors.push(`enrollment ${enrollment._id}: ${message}`)
    }
  }

  const orderQuery = {
    merchantTransactionId: { $exists: true, $nin: [null, ''] },
    createdAt: { $lt: minCreatedAt },
    $or: [
      { paymentStatus: 'pending' },
      { paymentStatus: 'failed', updatedAt: { $gte: failedSince } },
      { paymentStatus: 'failed', createdAt: { $gte: failedSince } },
    ],
  }

  const orders = await Order.find(orderQuery).sort({ createdAt: -1 }).limit(limit)

  for (const order of orders) {
    summary.ordersChecked += 1
    try {
      const result = await completePaidOrder(order)
      if (result === 'completed' || result === 'already_completed') {
        summary.ordersCompleted += 1
      } else if (result === 'failed') {
        summary.ordersFailed += 1
      } else {
        summary.ordersPending += 1
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      summary.errors.push(`order ${order._id}: ${message}`)
    }
  }

  return summary
}
