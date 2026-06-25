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
    let query: any = { student: userId }
    if (isAdminOrStaff) {
      if (studentQueryParam) {
        query = { student: studentQueryParam }
      } else {
        query = {} // Admin/Staff querying all student enrollments
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
          instructor: doc.course.instructor ? {
            id: doc.course.instructor._id.toString(),
            ...doc.course.instructor
          } : null,
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
        return NextResponse.json({ success: false, error: 'This coupon has reached its usage limit.' }, { status: 400 })
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

    // Create enrollment
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
      // Roll back the coupon usage claim if enrollment creation failed
      if (appliedCoupon) {
        await Coupon.updateOne({ _id: appliedCoupon._id }, { $inc: { usedCount: -1 } })
      }
      throw enrollError
    }

    return NextResponse.json({
      success: true,
      message: 'Enrolled successfully.',
      enrollmentId: newEnrollment._id.toString()
    })

  } catch (error: any) {
    console.error('API Enroll POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to complete enrollment.' },
      { status: 500 }
    )
  }
}
