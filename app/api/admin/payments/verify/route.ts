import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Order } from '@/lib/db/models/Order'
import { completePaidEnrollment } from '@/lib/payments/completePaidEnrollment'
import { completePaidOrder } from '@/lib/orders/completePaidOrder'

/**
 * POST /api/admin/payments/verify
 * Body: { type: 'enrollment' | 'order', id: string }
 * Manually re-check one payment with EPS and complete it when paid.
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin'])
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const type = body?.type as string
    const id = body?.id as string

    if (!id || !['enrollment', 'order'].includes(type)) {
      return NextResponse.json(
        { error: 'Provide type ("enrollment" | "order") and id.' },
        { status: 400 },
      )
    }

    if (type === 'enrollment') {
      const enrollment = await Enrollment.findById(id)
      if (!enrollment) {
        return NextResponse.json({ error: 'Enrollment not found.' }, { status: 404 })
      }
      if (!enrollment.merchantTransactionId) {
        return NextResponse.json(
          { error: 'Enrollment has no EPS merchant transaction id.' },
          { status: 400 },
        )
      }

      const result = await completePaidEnrollment(enrollment)
      return NextResponse.json({
        success: true,
        result,
        paymentStatus: enrollment.paymentStatus,
        merchantTransactionId: enrollment.merchantTransactionId,
      })
    }

    const order = await Order.findById(id)
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 })
    }
    if (!order.merchantTransactionId) {
      return NextResponse.json(
        { error: 'Order has no EPS merchant transaction id.' },
        { status: 400 },
      )
    }

    const result = await completePaidOrder(order)
    return NextResponse.json({
      success: true,
      result,
      paymentStatus: order.paymentStatus,
      merchantTransactionId: order.merchantTransactionId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Verification failed.'
    console.error('Admin payment verify error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
