import { verifyToken } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { SubscriptionPayment } from '@/lib/db/models/SubscriptionPayment'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type HistoryRow = {
  id: string
  kind: 'enrollment' | 'renewal'
  courseId: string
  courseTitle: string
  billingType: string
  amount: number
  lateFee: number
  periodStart: string | null
  periodEnd: string | null
  paymentStatus: string
  paymentReference: string
  paidAt: string
}

export async function GET() {
  try {
    await connectToDatabase()

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
        .populate({ path: 'enrollment', select: 'billingType' })
        .sort({ createdAt: -1 })
        .lean(),
    ])

    const rows: HistoryRow[] = []

    for (const e of enrollments as any[]) {
      const course = e.course
      rows.push({
        id: `enroll-${e._id.toString()}`,
        kind: 'enrollment',
        courseId: course?._id?.toString?.() || String(e.course || ''),
        courseTitle: course?.title || 'Course',
        billingType: e.billingType || 'monthly',
        amount: Number(e.pricePaid || 0),
        lateFee: 0,
        periodStart: e.billingCycleAnchor
          ? new Date(e.billingCycleAnchor).toISOString()
          : e.createdAt
            ? new Date(e.createdAt).toISOString()
            : null,
        periodEnd: e.paidUntil ? new Date(e.paidUntil).toISOString() : null,
        paymentStatus: 'completed',
        paymentReference: e.paymentReference || e.merchantTransactionId || '',
        paidAt: e.createdAt
          ? new Date(e.createdAt).toISOString()
          : new Date().toISOString(),
      })
    }

    for (const p of renewals as any[]) {
      const course = p.course
      const billingType =
        p.enrollment?.billingType === 'quarterly' ? 'quarterly' : 'monthly'
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
        periodEnd: p.periodEnd ? new Date(p.periodEnd).toISOString() : null,
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
  } catch (error: any) {
    console.error('Subscription history error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load payment history.' },
      { status: 500 },
    )
  }
}
