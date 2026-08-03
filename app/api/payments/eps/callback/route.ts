import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { completePaidEnrollment } from '@/lib/payments/completePaidEnrollment'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Handles EPS successUrl/failUrl/cancelUrl redirects for course enrollments.
 * The `outcome` query param is only a UX hint — payment is always confirmed
 * via CheckMerchantTransactionStatus. Pending EPS statuses leave the
 * enrollment pending so reconcile can finish it later.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const enrollmentId = searchParams.get('enrollmentId')

  try {
    await connectToDatabase()

    if (!enrollmentId) {
      return NextResponse.redirect(`${appUrl}/dashboard?enrollment=error`)
    }

    const enrollment = await Enrollment.findById(enrollmentId)
    if (!enrollment || !enrollment.merchantTransactionId) {
      return NextResponse.redirect(`${appUrl}/dashboard?enrollment=error`)
    }

    if (enrollment.paymentStatus === 'completed') {
      return NextResponse.redirect(
        `${appUrl}/dashboard?enrollment=success&enrollmentId=${enrollmentId}`,
      )
    }

    const result = await completePaidEnrollment(enrollment)

    if (result === 'completed' || result === 'already_completed') {
      return NextResponse.redirect(
        `${appUrl}/dashboard?enrollment=success&enrollmentId=${enrollmentId}`,
      )
    }

    if (result === 'pending' || result === 'not_found') {
      // Still settling, or EPS has no record yet — soft pending, not hard fail.
      return NextResponse.redirect(
        `${appUrl}/dashboard?enrollment=pending&enrollmentId=${enrollmentId}`,
      )
    }

    return NextResponse.redirect(
      `${appUrl}/checkout/${enrollment.course}?enrollment=failed`,
    )
  } catch (error) {
    console.error('EPS Callback Error:', error)
    return NextResponse.redirect(`${appUrl}/dashboard?enrollment=error`)
  }
}
