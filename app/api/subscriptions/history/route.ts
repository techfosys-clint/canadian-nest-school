import { verifyToken } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { SubscriptionPayment } from '@/lib/db/models/SubscriptionPayment'
import { initialPaidUntil, nextPaidUntil } from '@/lib/subscriptions/billing'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type HistoryRow = {
  id: string
  kind: 'enrollment' | 'renewal'
  courseId: string
  courseTitle: string
  billingType: string
  amount: number | null
  lateFee: number
  periodStart: string | null
  periodEnd: string | null
  paymentStatus: string
  paymentReference: string
  paidAt: string
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let userId: string | null = null
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded?.id) userId = decoded.id
    }
    if (!userId && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded?.id) userId = decoded.id
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 },
      )
    }

    await connectToDatabase()
    const [enrollments, renewals] = await Promise.all([
      Enrollment.find({
        student: userId,
        paymentStatus: 'completed',
        billingType: { $in: ['monthly', 'quarterly'] },
      })
        .populate({ path: 'course', select: 'title' })
        .sort({ createdAt: -1 })
        .lean(),
      SubscriptionPayment.find({
        student: userId,
        paymentStatus: { $in: ['completed', 'pending', 'failed'] },
      })
        .populate({ path: 'course', select: 'title' })
        .sort({ createdAt: -1 })
        .lean(),
    ])

    const rows: HistoryRow[] = []
    const enrollmentById = new Map(
      enrollments.map((enrollment) => [String(enrollment._id), enrollment]),
    )
    const firstRenewalStart = new Map<string, number>()
    const renewedEnrollmentIds = new Set<string>()
    for (const renewal of renewals) {
      const enrollmentId = String(renewal.enrollment)
      const start = new Date(renewal.periodStart).getTime()
      firstRenewalStart.set(
        enrollmentId,
        Math.min(firstRenewalStart.get(enrollmentId) ?? Infinity, start),
      )
      if (renewal.paymentStatus === 'completed') {
        renewedEnrollmentIds.add(enrollmentId)
      }
    }

    for (const e of enrollments as any[]) {
      const course = e.course
      const enrollmentId = String(e._id)
      const anchor = e.billingCycleAnchor ? new Date(e.billingCycleAnchor) : null
      // Legacy renewals could set a missing anchor to the renewal start.
      const originalStart =
        anchor && anchor.getTime() < (firstRenewalStart.get(enrollmentId) ?? Infinity)
          ? anchor
          : null
      const periodEnd = e.initialPaymentPeriodEnd
        ? new Date(e.initialPaymentPeriodEnd)
        : e.billingType === 'monthly' && originalStart
          ? initialPaidUntil(originalStart)
          : null
      rows.push({
        id: `enroll-${e._id.toString()}`,
        kind: 'enrollment',
        courseId: course?._id?.toString?.() || String(e.course || ''),
        courseTitle: course?.title || 'Course',
        billingType: e.billingType || 'monthly',
        // Older paid renewals overwrote pricePaid on the enrollment.
        amount: e.initialPaymentAmount ??
          (renewedEnrollmentIds.has(enrollmentId) ? null : e.pricePaid ?? null),
        lateFee: 0,
        periodStart: originalStart?.toISOString() ?? null,
        periodEnd: periodEnd?.toISOString() ?? null,
        paymentStatus: 'completed',
        paymentReference: e.paymentReference || e.merchantTransactionId || '',
        paidAt: originalStart?.toISOString() ?? (e.createdAt
          ? new Date(e.createdAt).toISOString()
          : new Date().toISOString()),
      })
    }

    for (const p of renewals as any[]) {
      const course = p.course
      const billingType =
        enrollmentById.get(String(p.enrollment))?.billingType === 'quarterly'
          ? 'quarterly'
          : 'monthly'
      // Older quarterly checkout records used the monthly period formula.
      const periodEnd = billingType === 'quarterly' && p.periodStart
        ? nextPaidUntil(new Date(p.periodStart), p.extensionDays || 0, billingType)
        : p.periodEnd ? new Date(p.periodEnd) : null
      rows.push({
        id: `renew-${p._id.toString()}`,
        kind: 'renewal',
        courseId: course?._id?.toString?.() || String(p.course || ''),
        courseTitle: course?.title || 'Course',
        billingType,
        amount: Number(p.amount || 0),
        lateFee: Number(p.lateFee || 0),
        periodStart: p.periodStart
          ? new Date(p.periodStart).toISOString()
          : null,
        periodEnd: periodEnd?.toISOString() ?? null,
        paymentStatus: p.paymentStatus || 'pending',
        paymentReference: p.paymentReference || p.merchantTransactionId || '',
        paidAt:
          p.paymentStatus === 'completed' && p.updatedAt
            ? new Date(p.updatedAt).toISOString()
            : p.createdAt
              ? new Date(p.createdAt).toISOString()
              : new Date().toISOString(),
      })
    }

    rows.sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
    )

    return NextResponse.json({ success: true, payments: rows })
  } catch (error) {
    console.error('Subscription history error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load payment history.' },
      { status: 500 },
    )
  }
}
