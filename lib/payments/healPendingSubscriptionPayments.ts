import { SubscriptionPayment } from '@/lib/db/models/SubscriptionPayment'
import { completeSubscriptionPayment } from '@/lib/payments/completeSubscriptionPayment'

/**
 * Re-check a student's pending/recently-failed subscription EPS payments.
 */
export async function healStudentPendingSubscriptionPayments(
  studentId: string,
): Promise<number> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const pending = await SubscriptionPayment.find({
    student: studentId,
    paymentStatus: { $in: ['pending', 'failed'] },
    merchantTransactionId: { $exists: true, $ne: null },
    createdAt: { $gte: cutoff },
  }).limit(20)

  let healed = 0
  for (const payment of pending) {
    try {
      const result = await completeSubscriptionPayment(payment)
      if (result === 'completed' || result === 'already_completed') {
        healed += 1
      }
    } catch (err) {
      console.error(
        'healStudentPendingSubscriptionPayments failed for',
        payment._id?.toString?.(),
        err,
      )
    }
  }
  return healed
}
