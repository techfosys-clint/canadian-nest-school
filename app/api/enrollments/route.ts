import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { Course } from '@/lib/db/models/Course'
import { Coupon } from '@/lib/db/models/Coupon'
import { Lesson } from '@/lib/db/models/Lesson'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let userId: string | null = null
    let isAdminOrStaff = false

    // 1. Authenticate student token
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded && decoded.id) {
        userId = decoded.id
      }
    }

    // 2. Authenticate admin/staff token
    if (!userId && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded && decoded.id) {
        userId = decoded.id
        const user = await User.findById(decoded.id).lean()
        if (user && ['admin', 'staff', 'instructor'].includes(user.role)) {
          isAdminOrStaff = true
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const studentQueryParam = searchParams.get('student')

    // Determine query target student ID/filter criteria
    let query: any = { student: userId, paymentStatus: 'completed' }
    if (isAdminOrStaff) {
      if (studentQueryParam) {
        query = { student: studentQueryParam, paymentStatus: 'completed' }
      } else {
        query = { paymentStatus: 'completed' } // Admin/Staff querying all student enrollments
      }
    }

    // Fetch enrollments with populated student and course detail structures
    const docs = await Enrollment.find(query)
      .populate('student', 'name email')
      .populate({
        path: 'course',
        populate: [
          { path: 'thumbnail' },
          { path: 'category' },
          { path: 'instructor' }
        ]
      })
      .sort({ createdAt: -1 })
      .lean()

    // ═══════════════════════════════════════════════════════
    // Pre-fetch ALL lesson counts in ONE aggregation query
    // (instead of N separate queries — N+1 problem fixed)
    // ═══════════════════════════════════════════════════════
    const lessonCounts = await Lesson.aggregate([
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 }
        }
      }
    ])

    const countMap: Record<string, number> = {}
    lessonCounts.forEach((item: any) => {
      countMap[item._id.toString()] = item.count
    })

    // Now map enrollments with pre-fetched counts (no N+1 queries)
    const formattedDocs = docs.map((doc: any) => {
      if (!doc.course) {
        return {
          id: doc._id.toString(),
          ...doc,
          course: null
        }
      }

      const courseId = doc.course._id.toString()
      const totalLessons = countMap[courseId] || 0

      return {
        id: doc._id.toString(),
        ...doc,
        course: {
          id: courseId,
          ...doc.course,
          totalLessons,
          category: doc.course.category ? {
            id: doc.course.category._id.toString(),
            ...doc.course.category
          } : null,
          categories: doc.course.category ? [{
            id: doc.course.category._id.toString(),
            ...doc.course.category
          }] : [],
          instructor: doc.course.instructor ? {
            id: doc.course.instructor._id.toString(),
            ...doc.course.instructor
          } : null,
          instructors: doc.course.instructor ? [{
            id: doc.course.instructor._id.toString(),
            ...doc.course.instructor
          }] : [],
          thumbnail: doc.course.thumbnail ? {
            id: doc.course.thumbnail._id.toString(),
            ...doc.course.thumbnail
          } : null
        }
      }
    })

    return NextResponse.json({
      success: true,
      docs: formattedDocs,
    })

  } catch (error: any) {
    console.error('API Enrollments Error:', error)
    try {
      require('fs').writeFileSync('enrollments-error.log', String(error.stack || error.message));
    } catch (e) {}
    return NextResponse.json(
      { success: false, error: 'Failed to fetch enrollments.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let userId: string | null = null

    // 1. Authenticate student token
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded && decoded.id) {
        userId = decoded.id
      }
    }

    // 2. Authenticate admin/staff token
    if (!userId && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded && decoded.id) {
        userId = decoded.id
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please login to enroll.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { courseId, couponCode, billingName, billingPhone, billingAddress } = body

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required.' },
        { status: 400 }
      )
    }

    // Check if course exists
    const course = await Course.findById(courseId).lean()
    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Course not found.' },
        { status: 404 }
      )
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      paymentStatus: 'completed'
    }).lean()

    if (existingEnrollment) {
      return NextResponse.json({
        success: true,
        message: 'Already enrolled.',
        enrollmentId: existingEnrollment._id.toString()
      })
    }

    // Coupon logic
    let pricePaid = course.price || 0
    let appliedCoupon = null

    if (couponCode) {
      const uppercaseCode = couponCode.toUpperCase().trim()
      const coupon = await Coupon.findOne({ code: uppercaseCode })

      if (!coupon) {
        return NextResponse.json({ success: false, error: 'Invalid coupon code.' }, { status: 400 })
      }

      if (!coupon.isActive) {
        return NextResponse.json({ success: false, error: 'This coupon is no longer active.' }, { status: 400 })
      }

      if (coupon.expirationDate && new Date() > new Date(coupon.expirationDate)) {
        return NextResponse.json({ success: false, error: 'This coupon has expired.' }, { status: 400 })
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        // Release any abandoned EPS sessions still holding a usedCount slot
        // before declaring the coupon exhausted.
        const { releaseStalePendingCouponUses } = await import('@/lib/coupons')
        await releaseStalePendingCouponUses(uppercaseCode)

        const refreshedCoupon = await Coupon.findById(coupon._id)
        if (!refreshedCoupon || (refreshedCoupon.maxUses && refreshedCoupon.usedCount >= refreshedCoupon.maxUses)) {
          return NextResponse.json({ success: false, error: 'This coupon has reached its usage limit.' }, { status: 400 })
        }
        coupon.usedCount = refreshedCoupon.usedCount
      }

      // Calculate discount
      if (coupon.discountType === 'percentage') {
        const discountAmount = (pricePaid * coupon.discountValue) / 100
        pricePaid = Math.max(0, pricePaid - discountAmount)
      } else if (coupon.discountType === 'fixed') {
        pricePaid = Math.max(0, pricePaid - coupon.discountValue)
      }

      appliedCoupon = coupon

      // Atomically claim a usage slot so concurrent requests can't both pass
      // the maxUses check and over-redeem the coupon (TOCTOU race fix).
      const claimedCoupon = await Coupon.findOneAndUpdate(
        {
          _id: coupon._id,
          $or: [
            { maxUses: { $exists: false } },
            { maxUses: null },
            { $expr: { $lt: ['$usedCount', '$maxUses'] } },
          ],
        },
        { $inc: { usedCount: 1 } }
      )

      if (!claimedCoupon) {
        return NextResponse.json({ success: false, error: 'This coupon has reached its usage limit.' }, { status: 400 })
      }
    }

    // pricePaid === 0 (free course, or coupon discounted to free) — enroll
    // immediately with no payment gateway involved.
    if (pricePaid === 0) {
      let newEnrollment
      try {
        newEnrollment = await Enrollment.create({
          student: userId,
          course: courseId,
          paymentStatus: 'completed',
          pricePaid,
          paymentReference: 'ENROLL-' + Math.random().toString(36).substring(2, 11).toUpperCase(),
          billingName,
          billingPhone,
          billingAddress,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        })
      } catch (enrollError) {
        if (appliedCoupon) {
          await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: -1 } })
        }
        throw enrollError
      }

      let enrolledStudent = await Student.findById(userId).lean()
      if (!enrolledStudent) {
        enrolledStudent = await User.findById(userId).lean()
      }
      if (enrolledStudent?.email) {
        const { sendEnrollmentConfirmationEmail } = await import('@/lib/email')
        sendEnrollmentConfirmationEmail(
          enrolledStudent.email,
          enrolledStudent.name,
          (course as any).title,
          pricePaid,
          newEnrollment.paymentReference!,
          newEnrollment.createdAt
        ).catch((err) => console.error('Failed to send enrollment confirmation email:', err))
      }

      return NextResponse.json({
        success: true,
        message: 'Enrolled successfully.',
        enrollmentId: newEnrollment._id.toString()
      })
    }

    // Paid enrollment — create a pending record and start an EPS payment
    // session. The enrollment is only marked 'completed' once the EPS
    // callback verifies the transaction server-side (see
    // /api/payments/eps/callback) — never on the client's say-so.
    let student = await Student.findById(userId).lean()
    if (!student) {
      student = await User.findById(userId).lean()
    }
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student account not found.' }, { status: 404 })
    }

    // Base36 timestamp keeps this short while staying unique, unlike the
    // full decimal Date.now() which produced unreadably long invoice
    // references (e.g. "ENR17825344536719L9FLO").
    const merchantTransactionId = `ENR${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    let pendingEnrollment
    try {
      pendingEnrollment = await Enrollment.create({
        student: userId,
        course: courseId,
        paymentStatus: 'pending',
        pricePaid,
        merchantTransactionId,
        billingName,
        billingPhone,
        billingAddress,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
      })
    } catch (enrollError) {
      if (appliedCoupon) {
        await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: -1 } })
      }
      throw enrollError
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
      const { initializeEpsPayment } = await import('@/lib/eps')
      const { redirectUrl } = await initializeEpsPayment({
        merchantTransactionId,
        customerOrderId: pendingEnrollment._id.toString(),
        totalAmount: pricePaid,
        successUrl: `${appUrl}/api/payments/eps/callback?enrollmentId=${pendingEnrollment._id}&outcome=success`,
        failUrl: `${appUrl}/api/payments/eps/callback?enrollmentId=${pendingEnrollment._id}&outcome=fail`,
        cancelUrl: `${appUrl}/api/payments/eps/callback?enrollmentId=${pendingEnrollment._id}&outcome=cancel`,
        customerName: billingName || (student as any).name,
        customerEmail: (student as any).email || 'no-reply@canadiannestschool.com',
        customerPhone: billingPhone || (student as any).phone || '01700000000',
        productName: (course as any).title,
      })

      return NextResponse.json({
        success: true,
        message: 'Redirecting to payment gateway.',
        redirectUrl,
        enrollmentId: pendingEnrollment._id.toString(),
      })
    } catch (epsError: any) {
      console.error('EPS Initialize Error:', epsError)
      pendingEnrollment.paymentStatus = 'failed'
      await pendingEnrollment.save()
      if (appliedCoupon) {
        await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: -1 } })
      }
      return NextResponse.json(
        { success: false, error: epsError.message || 'Failed to start payment. Please try again.' },
        { status: 422 }
      )
    }

  } catch (error: any) {
    console.error('API Enroll POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete enrollment.' },
      { status: 500 }
    )
  }
}
