import { Order } from '@/lib/db/models/Order'
import { connectToDatabase } from '@/lib/db/mongodb'
import { completePaidOrder } from '@/lib/orders/completePaidOrder'
import { NextResponse } from 'next/server'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Handles EPS failUrl/cancelUrl redirects for shop orders, and legacy successUrl
 * hits that still point at this route. Success landings should use
 * /shop/order/thank-you directly — that page finalizes pending payments too.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')
  const outcome = searchParams.get('outcome')

  try {
    await connectToDatabase()

    if (!orderId) {
      return NextResponse.redirect(`${appUrl}/shop?order=error`)
    }

    const order = await Order.findById(orderId)
    if (!order || !order.merchantTransactionId) {
      return NextResponse.redirect(`${appUrl}/shop?order=error`)
    }

    if (outcome === 'fail' || outcome === 'cancel') {
      if (order.paymentStatus === 'pending') {
        order.paymentStatus = 'failed'
        await order.save()
      }
      return NextResponse.redirect(`${appUrl}/shop?order=failed`)
    }

    if (order.paymentStatus === 'completed') {
      return NextResponse.redirect(
        `${appUrl}/shop/order/thank-you?orderId=${orderId}`,
      )
    }

    const result = await completePaidOrder(order)

    if (result === 'completed' || result === 'already_completed') {
      return NextResponse.redirect(
        `${appUrl}/shop/order/thank-you?orderId=${orderId}`,
      )
    }

    return NextResponse.redirect(`${appUrl}/shop?order=failed`)
  } catch (error) {
    console.error('EPS Order Callback Error:', error)
    return NextResponse.redirect(`${appUrl}/shop?order=error`)
  }
}
