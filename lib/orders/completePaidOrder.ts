import { Order, type IOrder, type IOrderItem } from '@/lib/db/models/Order'
import { Product } from '@/lib/db/models/Product'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { verifyEpsTransaction } from '@/lib/eps'
import { epsAmountsMatch } from '@/lib/payments/epsAmount'
import { normalizeEpsStatus } from '@/lib/payments/epsStatus'

export type CompletePaidOrderResult =
  | 'completed'
  | 'already_completed'
  | 'failed'
  | 'pending'
  | 'not_found'

/**
 * Verifies an EPS transaction and marks the order completed when paid.
 * Requires EPS TotalAmount to match order.totalAmount. Atomic claim ensures
 * stock/email side effects run only once under concurrent callback + IPN.
 */
export async function completePaidOrder(
  order: IOrder,
): Promise<CompletePaidOrderResult> {
  if (order.paymentStatus === 'completed') {
    return 'already_completed'
  }

  if (!order.merchantTransactionId) {
    return 'pending'
  }

  const result = await verifyEpsTransaction(order.merchantTransactionId)
  const status = normalizeEpsStatus(result.status)

  if (status === 'not_found') {
    return 'not_found'
  }

  if (status === 'success') {
    if (!epsAmountsMatch(result.totalAmount, order.totalAmount)) {
      console.error('EPS order amount mismatch — leaving pending', {
        orderId: order._id?.toString?.(),
        merchantTransactionId: order.merchantTransactionId,
        expected: order.totalAmount,
        epsTotalAmount: result.totalAmount,
      })
      return 'pending'
    }

    const paymentReference =
      order.paymentReference || order.merchantTransactionId

    const claimed = await Order.findOneAndUpdate(
      {
        _id: order._id,
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
      order.paymentStatus = 'completed'
      return 'already_completed'
    }

    order.paymentStatus = 'completed'
    order.paymentReference = claimed.paymentReference

    for (const item of claimed.items) {
      await Product.updateOne(
        { _id: item.product, stock: { $ne: null } },
        { $inc: { stock: -item.quantity } },
      )
    }

    let student = await Student.findById(claimed.student).lean()
    if (!student) {
      student = await User.findById(claimed.student).lean()
    }

    if (student?.email) {
      const { sendOrderConfirmationEmail } = await import('@/lib/email')
      sendOrderConfirmationEmail(
        student.email,
        student.name,
        claimed.items.map((item: IOrderItem) => ({
          title: item.title,
          price: item.price,
          quantity: item.quantity,
        })),
        claimed.totalAmount,
        claimed.paymentReference || claimed.merchantTransactionId!,
        claimed.shippingAddress,
        claimed.createdAt,
      ).catch((err) =>
        console.error('Failed to send order confirmation email:', err),
      )
    }

    return 'completed'
  }

  if (status === 'failed') {
    await Order.findOneAndUpdate(
      {
        _id: order._id,
        paymentStatus: { $nin: ['completed', 'failed'] },
      },
      { $set: { paymentStatus: 'failed' } },
    )
    order.paymentStatus = 'failed'
    return 'failed'
  }

  return 'pending'
}
