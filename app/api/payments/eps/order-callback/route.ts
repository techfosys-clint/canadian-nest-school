import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Order } from '@/lib/db/models/Order'
import { Product } from '@/lib/db/models/Product'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { verifyEpsTransaction } from '@/lib/eps'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Handles EPS's successUrl/failUrl/cancelUrl redirect for shop orders.
 * Mirrors /api/payments/eps/callback (course enrollments) but for the
 * Order model — kept as a separate route so the existing, already-fixed
 * course checkout flow is never touched by shop changes.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')

  try {
    await connectToDatabase()

    if (!orderId) {
      return NextResponse.redirect(`${appUrl}/dashboard/orders?order=error`)
    }

    const order = await Order.findById(orderId)
    if (!order || !order.merchantTransactionId) {
      return NextResponse.redirect(`${appUrl}/dashboard/orders?order=error`)
    }

    if (order.paymentStatus === 'completed') {
      return NextResponse.redirect(`${appUrl}/dashboard/orders?order=success&orderId=${orderId}`)
    }
    if (order.paymentStatus === 'failed') {
      return NextResponse.redirect(`${appUrl}/shop?order=failed`)
    }

    const result = await verifyEpsTransaction(order.merchantTransactionId)

    if (result.status?.toLowerCase() === 'success') {
      order.paymentStatus = 'completed'
      await order.save()

      // Decrement stock for each purchased item (skip unlimited-stock items)
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product, stock: { $ne: null } },
          { $inc: { stock: -item.quantity } }
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
          order.items.map((i: any) => ({ title: i.title, price: i.price, quantity: i.quantity })),
          order.totalAmount,
          order.paymentReference || order.merchantTransactionId!,
          order.shippingAddress,
          order.createdAt
        ).catch((err) => console.error('Failed to send order confirmation email:', err))
      }

      return NextResponse.redirect(`${appUrl}/dashboard/orders?order=success&orderId=${orderId}`)
    }

    order.paymentStatus = 'failed'
    await order.save()

    return NextResponse.redirect(`${appUrl}/shop?order=failed`)
  } catch (error) {
    console.error('EPS Order Callback Error:', error)
    return NextResponse.redirect(`${appUrl}/dashboard/orders?order=error`)
  }
}
