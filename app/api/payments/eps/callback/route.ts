import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { completePaidEnrollment } from '@/lib/payments/completePaidEnrollment'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Handles EPS successUrl/failUrl/cancelUrl redirects for course enrollments.
 * The `outcome` query param is only a UX hint — payment is always confirmed
 * via CheckMerchantTransactionStatus.
 *
 * Soft-landing: pending / not_found / early "failed" all go to the dashboard
 * confirming flow so heal + polling can unlock a paid course instead of
 * showing a hard "purchase failed" screen.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enrollmentId = searchParams.get('enrollmentId')
  const outcome = (searchParams.get('outcome') || '').toLowerCase()

  try {
    await connectToDatabase()

    if (!enrollmentId) {
      return NextResponse.redirect(`${appUrl}/dashboard?enrollment=error`)
    }

    let enrollment = await Enrollment.findById(enrollmentId)
    if (!enrollment || !enrollment.merchantTransactionId) {
      return NextResponse.redirect(`${appUrl}/dashboard?enrollment=error`)
    }

    if (enrollment.paymentStatus === 'completed') {
      return NextResponse.redirect(
        `${appUrl}/dashboard?enrollment=success&enrollmentId=${enrollmentId}`,
      )
    }

    let result = await completePaidEnrollment(enrollment)

    // EPS status APIs often lag a second or two after redirect. Retry once
    // when the first check is inconclusive or when EPS sent us to success
    // but verify still said failed/pending.
    if (
      result === 'pending' ||
      result === 'not_found' ||
      (result === 'failed' && outcome === 'success')
    ) {
      await sleep(2000)
      enrollment = await Enrollment.findById(enrollmentId)
      if (enrollment?.paymentStatus === 'completed') {
        result = 'already_completed'
      } else if (enrollment?.merchantTransactionId) {
        result = await completePaidEnrollment(enrollment)
      }
    }

    if (result === 'completed' || result === 'already_completed') {
      return NextResponse.redirect(
        `${appUrl}/dashboard?enrollment=success&enrollmentId=${enrollmentId}`,
      )
    }

    // Soft confirm — dashboard will keep healing/polling. Avoid sending paid
    // customers to checkout with a scary "failed" banner.
    return NextResponse.redirect(
      `${appUrl}/dashboard?enrollment=confirming&enrollmentId=${enrollmentId}`,
    )
  } catch (error) {
    console.error('EPS Callback Error:', error)
    if (enrollmentId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard?enrollment=confirming&enrollmentId=${enrollmentId}`,
      )
    }
    return NextResponse.redirect(`${appUrl}/dashboard?enrollment=error`)
  }
}
