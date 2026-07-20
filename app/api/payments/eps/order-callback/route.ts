import { Order } from '@/lib/db/models/Order'
import { connectToDatabase } from '@/lib/db/mongodb'
import { completePaidOrder } from '@/lib/orders/completePaidOrder'
import { NextResponse } from 'next/server'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Handles EPS redirects for shop orders (success/fail/cancel).
 * Always re-verifies with EPS — never trusts `outcome` alone — so a paid
 * transaction is completed even when EPS redirects with a fail/cancel URL,
 * and completion does not require the customer to still be logged in.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')

  try {
    await connectToDatabase()

    if (!orderId) {
      return NextResponse.redirect(`${appUrl}/shop?order=error`)
    }

    const order = await Order.findById(orderId)
    if (!order || !order.merchantTransactionId) {
      return NextResponse.redirect(`${appUrl}/shop?order=error`)
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

    if (result === 'pending') {
      return NextResponse.redirect(
        `${appUrl}/shop/order/thank-you?orderId=${orderId}&outcome=pending`,
      )
    }

    return NextResponse.redirect(`${appUrl}/shop?order=failed`)
  } catch (error) {
    console.error('EPS Order Callback Error:', error)
    return NextResponse.redirect(`${appUrl}/shop?order=error`)
  }
}
