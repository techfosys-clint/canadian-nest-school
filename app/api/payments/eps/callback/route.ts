import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Student } from '@/lib/db/models/Student'
import { Course } from '@/lib/db/models/Course'
import { verifyEpsTransaction } from '@/lib/eps'

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Handles EPS's successUrl/failUrl/cancelUrl redirect. The `outcome` query
 * param is only a UX hint from the redirect — the actual payment result is
 * always re-verified server-side via CheckMerchantTransactionStatus before
 * the enrollment is ever marked completed, since a client-controlled
 * redirect must never be trusted to confirm payment.
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

    // Already processed (e.g. user refreshed the redirect page) — don't
    // re-verify, just route based on the stored result.
    if (enrollment.paymentStatus === 'completed') {
      return NextResponse.redirect(`${appUrl}/dashboard?enrollment=success&enrollmentId=${enrollmentId}`)
    }
    if (enrollment.paymentStatus === 'failed') {
      return NextResponse.redirect(`${appUrl}/checkout/${enrollment.course}?enrollment=failed`)
    }

    const result = await verifyEpsTransaction(enrollment.merchantTransactionId)

    if (result.status?.toLowerCase() === 'success') {
      enrollment.paymentStatus = 'completed'
      await enrollment.save()

      const [student, course] = await Promise.all([
        Student.findById(enrollment.student).lean(),
        Course.findById(enrollment.course).lean(),
      ])

      if (student?.email && course) {
        const { sendEnrollmentConfirmationEmail } = await import('@/lib/email')
        sendEnrollmentConfirmationEmail(
          student.email,
          student.name,
          (course as any).title,
          enrollment.pricePaid,
          enrollment.paymentReference || enrollment.merchantTransactionId!,
          enrollment.createdAt
        ).catch((err) => console.error('Failed to send enrollment confirmation email:', err))
      }

      return NextResponse.redirect(`${appUrl}/dashboard?enrollment=success&enrollmentId=${enrollmentId}`)
    }

    enrollment.paymentStatus = 'failed'
    await enrollment.save()
    return NextResponse.redirect(`${appUrl}/checkout/${enrollment.course}?enrollment=failed`)
  } catch (error) {
    console.error('EPS Callback Error:', error)
    return NextResponse.redirect(`${appUrl}/dashboard?enrollment=error`)
  }
}
