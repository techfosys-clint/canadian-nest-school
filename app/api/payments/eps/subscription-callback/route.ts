import { SubscriptionPayment } from '@/lib/db/models/SubscriptionPayment'
import { connectToDatabase } from '@/lib/db/mongodb'
import { completeSubscriptionPayment } from '@/lib/payments/completeSubscriptionPayment'
import { NextResponse } from 'next/server'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * EPS redirect handler for monthly subscription renewals.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const paymentId = searchParams.get('paymentId')
  const outcome = (searchParams.get('outcome') || '').toLowerCase()

  try {
    await connectToDatabase()

    if (!paymentId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard?subscription=error`,
      )
    }

    let payment = await SubscriptionPayment.findById(paymentId)
    if (!payment || !payment.merchantTransactionId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard?subscription=error`,
      )
    }

    if (payment.paymentStatus === 'completed') {
      return NextResponse.redirect(
        `${appUrl}/dashboard?subscription=success&enrollmentId=${payment.enrollment}`,
      )
    }

    let result = await completeSubscriptionPayment(payment)

    if (
      result === 'pending' ||
      result === 'not_found' ||
      (result === 'failed' && outcome === 'success')
    ) {
      await sleep(2000)
      payment = await SubscriptionPayment.findById(paymentId)
      if (payment?.paymentStatus === 'completed') {
        result = 'already_completed'
      } else if (payment?.merchantTransactionId) {
        result = await completeSubscriptionPayment(payment)
      }
    }

    if (result === 'completed' || result === 'already_completed') {
      return NextResponse.redirect(
        `${appUrl}/dashboard?subscription=success&enrollmentId=${payment!.enrollment}`,
      )
    }

    return NextResponse.redirect(
      `${appUrl}/dashboard?subscription=confirming&enrollmentId=${payment!.enrollment}`,
    )
  } catch (error) {
    console.error('EPS subscription callback error:', error)
    return NextResponse.redirect(
      `${appUrl}/dashboard?subscription=confirming`,
    )
  }
}
