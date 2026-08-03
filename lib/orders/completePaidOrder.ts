import type { IOrder } from '@/lib/db/models/Order';
import { Product } from '@/lib/db/models/Product';
import { Student } from '@/lib/db/models/Student';
import { User } from '@/lib/db/models/User';
import { verifyEpsTransaction } from '@/lib/eps';
import { normalizeEpsStatus } from '@/lib/payments/epsStatus';

export type CompletePaidOrderResult =
  | 'completed'
  | 'already_completed'
  | 'failed'
  | 'pending'
  | 'not_found';

/**
 * Verifies an EPS transaction and marks the order completed when paid.
 * Safe to call on refresh. Recovers wrongly marked "failed" orders when
 * EPS later reports Success. Leaves status pending when EPS is still pending.
 */
export async function completePaidOrder(
  order: IOrder,
): Promise<CompletePaidOrderResult> {
  if (order.paymentStatus === 'completed') {
    return 'already_completed';
  }

  if (!order.merchantTransactionId) {
    return 'pending';
  }

  const result = await verifyEpsTransaction(order.merchantTransactionId);
  const status = normalizeEpsStatus(result.status);

  if (status === 'not_found') {
    return 'not_found';
  }

  if (status === 'success') {
    order.paymentStatus = 'completed';
    if (!order.paymentReference) {
      order.paymentReference = order.merchantTransactionId;
    }
    await order.save();

    // Stock + email only on newly completing (already-completed returns earlier).
    // Failed orders never decremented stock, so recovery here is also correct.
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product, stock: { $ne: null } },
        { $inc: { stock: -item.quantity } },
      );
    }

    let student = await Student.findById(order.student).lean();
    if (!student) {
      student = await User.findById(order.student).lean();
    }

    if (student?.email) {
      const { sendOrderConfirmationEmail } = await import('@/lib/email');
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
      );
    }

    return 'completed';
  }

  if (status === 'failed') {
    if (order.paymentStatus !== 'failed') {
      order.paymentStatus = 'failed';
      await order.save();
    }
    return 'failed';
  }

  return 'pending';
}
