import { Product } from '@/lib/db/models/Product'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { verifyEpsTransaction } from '@/lib/eps'
import type { IOrder } from '@/lib/db/models/Order'

export type CompletePaidOrderResult =
  | 'completed'
  | 'already_completed'
  | 'failed'
  | 'pending'

/**
 * Verifies an EPS transaction and marks the order completed when paid.
 * Safe to call on refresh — already-completed orders are left unchanged.
 */
export async function completePaidOrder(
  order: IOrder,
): Promise<CompletePaidOrderResult> {
  if (order.paymentStatus === 'completed') {
    return 'already_completed'
  }
  if (order.paymentStatus === 'failed') {
    return 'failed'
  }
  if (!order.merchantTransactionId) {
    return 'pending'
  }

  const result = await verifyEpsTransaction(order.merchantTransactionId)

  if (result.status?.toLowerCase() === 'success') {
    order.paymentStatus = 'completed'
    await order.save()

    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, stock: { $ne: null } },
        { $inc: { stock: -item.quantity } },
      )
    }

    let student = await Student.findById(order.student).lean()
    if (!student) {
      student = await User.findById(order.student).lean()
    }

    if (student?.email) {
      const { sendOrderConfirmationEmail } = await import('@/lib/email')
      sendOrderConfirmationEmail(
        student.email,
        student.name,
        order.items.map((i) => ({
          title: i.title,
          price: i.price,
          quantity: i.quantity,
        })),
        order.totalAmount,
        order.paymentReference || order.merchantTransactionId!,
        order.shippingAddress,
        order.createdAt,
      ).catch((err) =>
        console.error('Failed to send order confirmation email:', err),
      )
    }

    return 'completed'
  }

  order.paymentStatus = 'failed'
  await order.save()
  return 'failed'
}
