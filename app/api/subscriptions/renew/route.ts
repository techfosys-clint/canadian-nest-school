import { verifyToken } from '@/lib/auth/auth'
import { isCouponExpired } from '@/lib/coupons'
import { Coupon } from '@/lib/db/models/Coupon'
import { Course } from '@/lib/db/models/Course'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Student } from '@/lib/db/models/Student'
import { SubscriptionPayment } from '@/lib/db/models/SubscriptionPayment'
import { User } from '@/lib/db/models/User'
import { connectToDatabase } from '@/lib/db/mongodb'
import {
  BILLING_PERIOD_DAYS,
  addDays,
  computeRenewalAmount,
  isMonthlyCourse,
} from '@/lib/subscriptions/billing'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function resolveUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const studentToken = cookieStore.get('student-token')?.value
  const payloadToken = cookieStore.get('payload-token')?.value
  if (studentToken) {
    const decoded = verifyToken(studentToken)
    if (decoded?.id) return decoded.id
  }
  if (payloadToken) {
    const decoded = verifyToken(payloadToken)
    if (decoded?.id) return decoded.id
  }
  return null
}

/**
 * POST /api/subscriptions/renew
 * Body: { enrollmentId: string, couponCode?: string }
 * Starts an EPS payment to renew a monthly course enrollment.
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const userId = await resolveUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 },
      )
    }

    const body = await request.json()
    const enrollmentId = body?.enrollmentId as string
    const couponCode =
      typeof body?.couponCode === 'string'
        ? body.couponCode.toUpperCase().trim()
        : ''

    if (!enrollmentId) {
      return NextResponse.json(
        { success: false, error: 'enrollmentId is required.' },
        { status: 400 },
      )
    }

    const enrollment = await Enrollment.findOne({
      _id: enrollmentId,
      student: userId,
      paymentStatus: 'completed',
    })
    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Enrollment not found.' },
        { status: 404 },
      )
    }

    const course = await Course.findById(enrollment.course)
    if (!course || !isMonthlyCourse(course)) {
      return NextResponse.json(
        { success: false, error: 'This course is not a monthly subscription.' },
        { status: 400 },
      )
    }

    let extensionDays = 0
    let overrideFee: number | undefined
    let appliedCouponCode: string | undefined

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode })
      if (!coupon || !coupon.isActive) {
        return NextResponse.json(
          { success: false, error: 'Invalid coupon code.' },
          { status: 400 },
        )
      }
      if (coupon.kind !== 'subscription_extension') {
        return NextResponse.json(
          {
            success: false,
            error: 'Only subscription extension coupons can be used here.',
          },
          { status: 400 },
        )
      }
      if (isCouponExpired(coupon.expirationDate)) {
        return NextResponse.json(
          { success: false, error: 'This coupon has expired.' },
          { status: 400 },
        )
      }
      if (coupon.course && coupon.course.toString() !== course._id.toString()) {
        return NextResponse.json(
          { success: false, error: 'This coupon is not valid for this course.' },
          { status: 400 },
        )
      }
      if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
        return NextResponse.json(
          { success: false, error: 'This coupon has reached its usage limit.' },
          { status: 400 },
        )
      }

      extensionDays = Math.max(0, Number(coupon.extensionDays || 0))
      if (typeof coupon.overrideFee === 'number') {
        overrideFee = coupon.overrideFee
      }
      appliedCouponCode = coupon.code
    }

    const { baseFee, lateFee, total } = computeRenewalAmount(
      course,
      enrollment,
      { overrideFee },
    )

    if (total <= 0) {
      // Zero-amount renewal (override fee 0): extend immediately.
      const previousEnd =
        enrollment.paidUntil && new Date(enrollment.paidUntil).getTime() > 0
          ? new Date(enrollment.paidUntil)
          : new Date()
      const { nextPaidUntil } = await import('@/lib/subscriptions/billing')
      enrollment.paidUntil = nextPaidUntil(previousEnd, extensionDays)
      enrollment.accessStatus = 'active'
      await enrollment.save()
      if (appliedCouponCode) {
        await Coupon.updateOne(
          { code: appliedCouponCode },
          { $inc: { usedCount: 1 } },
        )
      }
      return NextResponse.json({
        success: true,
        message: 'Subscription renewed.',
        enrollmentId: enrollment._id.toString(),
        paidUntil: enrollment.paidUntil,
      })
    }

    let student = await Student.findById(userId).lean()
    if (!student) student = await User.findById(userId).lean()
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student account not found.' },
        { status: 404 },
      )
    }

    const periodStart =
      enrollment.paidUntil && new Date(enrollment.paidUntil).getTime() > 0
        ? new Date(enrollment.paidUntil)
        : new Date()
    const periodEnd = addDays(periodStart, BILLING_PERIOD_DAYS + extensionDays)

    const merchantTransactionId = `SUB${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const pendingPayment = await SubscriptionPayment.create({
      enrollment: enrollment._id,
      student: userId,
      course: course._id,
      periodStart,
      periodEnd,
      amount: total,
      lateFee,
      couponCode: appliedCouponCode,
      extensionDays,
      paymentStatus: 'pending',
      merchantTransactionId,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
      const { initializeEpsPayment } = await import('@/lib/eps')
      const { redirectUrl } = await initializeEpsPayment({
        merchantTransactionId,
        customerOrderId: pendingPayment._id.toString(),
        totalAmount: total,
        successUrl: `${appUrl}/api/payments/eps/subscription-callback?paymentId=${pendingPayment._id}&outcome=success`,
        failUrl: `${appUrl}/api/payments/eps/subscription-callback?paymentId=${pendingPayment._id}&outcome=fail`,
        cancelUrl: `${appUrl}/api/payments/eps/subscription-callback?paymentId=${pendingPayment._id}&outcome=cancel`,
        customerName: (student as any).name || 'Student',
        customerEmail:
          (student as any).email || 'no-reply@canadiannestschool.com',
        customerPhone: (student as any).phone || '01700000000',
        productName: `${course.title} — monthly renewal`,
      })

      return NextResponse.json({
        success: true,
        message: 'Redirecting to payment gateway.',
        redirectUrl,
        paymentId: pendingPayment._id.toString(),
        amount: total,
        baseFee,
        lateFee,
      })
    } catch (epsError: any) {
      console.error('EPS subscription renew init error:', epsError)
      pendingPayment.paymentStatus = 'failed'
      await pendingPayment.save()
      return NextResponse.json({
        success: false,
        error: epsError.message || 'Failed to start renewal payment.',
      })
    }
  } catch (error: any) {
    console.error('Subscription renew error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start renewal.' },
      { status: 500 },
    )
  }
}
