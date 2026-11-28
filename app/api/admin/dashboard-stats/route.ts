import { listLiveDeliveries, liveLessonQuery } from '@/lib/lessons/delivery'
import { taughtByFilter } from '@/lib/auth/staffScope'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { Student } from '@/lib/db/models/Student'
import { Course } from '@/lib/db/models/Course'
import { Lesson } from '@/lib/db/models/Lesson'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { SubscriptionPayment } from '@/lib/db/models/SubscriptionPayment'
import { Order } from '@/lib/db/models/Order'
import { Review } from '@/lib/db/models/Review'
import { Blog } from '@/lib/db/models/Blog'
import { FAQ } from '@/lib/db/models/FAQ'
import {
  calculateCourseProgressPercent,
  getLessonCountsByCourse,
  getLessonIdsByCourse,
  sanitizeCompletedLessons,
} from '@/lib/progress/getCourseProgress'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { bdTodayYmd } from '@/lib/bdTime'
import { formatCourseDuration } from '@/lib/courseDuration'

export async function GET() {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing.' }, { status: 401 })
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid.' }, { status: 401 })
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || !['admin', 'staff', 'instructor'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized: User not found.' }, { status: 401 })
    }

    const role = user.role

    // ─── ADMIN ROLE DATA ──────────────────────────────────────────────────────
    if (role === 'admin') {
      const [
        totalCourses,
        totalStudents,
        enrollments,
        pendingReviewsCount,
        recentReviews,
        renewals,
        orders,
      ] = await Promise.all([
        Course.countDocuments(),
        Student.countDocuments(),
        Enrollment.find().populate('student').populate('course').lean(),
        Review.countDocuments({ status: 'pending' }),
        Review.find({ status: 'pending' })
          .populate('student')
          .populate('course')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
        SubscriptionPayment.find({ paymentStatus: 'completed' })
          .select('amount updatedAt createdAt')
          .lean(),
        Order.find({ paymentStatus: { $in: ['completed', 'refunded'] } })
          .select('totalAmount paymentStatus createdAt')
          .lean(),
      ])

      // Every payment actually received: course purchases (first payment),
      // monthly-fee renewals and shop orders. Refunded items were paid too,
      // so they count in gross and are taken off once for net revenue.
      type PaymentEvent = { amount: number; at: Date; refunded: boolean }
      const payments: PaymentEvent[] = [
        ...enrollments
          .filter((e) => e.paymentStatus === 'completed' || e.paymentStatus === 'refunded')
          .map((e: any) => ({
            // Older renewals overwrote pricePaid; the first payment is kept separately.
            amount: Number(e.initialPaymentAmount ?? e.pricePaid ?? 0),
            at: new Date(e.createdAt),
            refunded: e.paymentStatus === 'refunded',
          })),
        ...renewals.map((p: any) => ({
          amount: Number(p.amount || 0),
          at: new Date(p.updatedAt || p.createdAt),
          refunded: false,
        })),
        ...orders.map((o: any) => ({
          amount: Number(o.totalAmount || 0),
          at: new Date(o.createdAt),
          refunded: o.paymentStatus === 'refunded',
        })),
      ].filter((p) => p.amount > 0)

      const totalIncome = payments.reduce((sum, p) => sum + p.amount, 0)
      const totalRefunded = payments
        .filter((p) => p.refunded)
        .reduce((sum, p) => sum + p.amount, 0)
      const completedPayments = payments.filter((p) => !p.refunded)

      // Recent 5 transactions
      const recentEnrollments = [...enrollments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((e) => ({
          id: e._id.toString(),
          studentName:
            e.student && typeof e.student === 'object'
              ? (e.student as any).name
              : (e as any).billingName || 'Unknown Student',
          studentEmail: e.student && typeof e.student === 'object' ? (e.student as any).email : '',
          courseTitle: e.course && typeof e.course === 'object' ? (e.course as any).title : 'Unknown Course',
          pricePaid: e.pricePaid || 0,
          paymentStatus: e.paymentStatus,
          createdAt: e.createdAt,
        }))

      // Sparkline revenue chart (last 7 days, Bangladesh calendar)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const todayNoonBd = new Date(`${bdTodayYmd()}T12:00:00+06:00`)
      const chartData: { day: string; income: number }[] = []

      for (let i = 6; i >= 0; i--) {
        const day = new Date(todayNoonBd.getTime() - i * 24 * 60 * 60 * 1000)
        const dayYmd = bdTodayYmd(day)
        const label = days[new Date(`${dayYmd}T12:00:00+06:00`).getUTCDay()]

        const dayIncome = completedPayments
          .filter((p) => bdTodayYmd(p.at) === dayYmd)
          .reduce((sum, p) => sum + p.amount, 0)

        chartData.push({ day: label, income: dayIncome })
      }

      return NextResponse.json({
        role: 'admin',
        summary: {
          totalCourses,
          totalStudents,
          totalEnrollments: enrollments.length,
          completedPayments: completedPayments.length,
          totalIncome,
          totalRefunded,
          netRevenue: totalIncome - totalRefunded,
          pendingReviews: pendingReviewsCount,
        },
        recentReviews: recentReviews.map((r: any) => ({
          id: r._id.toString(),
          studentName: r.student?.name || 'Anonymous',
          courseTitle: r.course?.title || 'Course',
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
        })),
        recentEnrollments,
        chartData,
      })
    }

    // ─── STAFF ROLE DATA ──────────────────────────────────────────────────────
    if (role === 'staff') {
      const [
        ,
        totalBlogs,
        totalFAQs,
        pendingReviewsCount,
        recentReviews,
      ] = await Promise.all([
        FAQ.countDocuments(), // Reusing categories, blogs, faqs
        Blog.countDocuments(),
        FAQ.countDocuments(),
        Review.countDocuments({ status: 'pending' }),
        Review.find({ status: 'pending' })
          .populate('student')
          .populate('course')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),
      ])

      // Re-fetch category count cleanly
      const { Category } = await import('@/lib/db/models/Category')
      const catCount = await Category.countDocuments()

      return NextResponse.json({
        role: 'staff',
        summary: {
          totalCategories: catCount,
          totalBlogs,
          totalFAQs,
          pendingReviews: pendingReviewsCount,
        },
        recentReviews: recentReviews.map((r: any) => ({
          id: r._id.toString(),
          studentName: r.student?.name || 'Anonymous',
          courseTitle: r.course?.title || 'Course',
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt,
        })),
      })
    }

    // ─── INSTRUCTOR ROLE DATA ─────────────────────────────────────────────────
    if (role === 'instructor') {
      // Find courses where this instructor is assigned
      const instructorCourses = await Course.find(taughtByFilter(user._id.toString()))
        .populate('thumbnail')
        .lean()
      const courseIds = instructorCourses.map((c) => c._id)

      const [totalLessons, totalStudentEnrollments, rawLiveLessons, enrollments] =
        await Promise.all([
          Lesson.countDocuments({ course: { $in: courseIds } }),
          Enrollment.countDocuments({
            course: { $in: courseIds },
            paymentStatus: 'completed',
          }),
          Lesson.find({ course: { $in: courseIds }, ...liveLessonQuery })
            .populate('course')
            .sort({ liveDate: 1 })
            .lean(),
          Enrollment.find({
            course: { $in: courseIds },
            paymentStatus: 'completed',
          })
            .populate('student', 'name email')
            .populate('course', 'title')
            .sort({ updatedAt: -1 })
            .limit(25)
            .lean(),
        ])

      const lessonCounts = await getLessonCountsByCourse(
        courseIds.map((id) => id.toString()),
      )
      const lessonIdsByCourse = await getLessonIdsByCourse(
        courseIds.map((id) => id.toString()),
      )

      const studentProgress = enrollments.map((enrollment) => {
        const courseId = enrollment.course?._id?.toString() || ''
        const totalCourseLessons = lessonCounts.get(courseId) || 0
        const validLessonIds =
          lessonIdsByCourse.get(courseId) || new Set<string>()
        const sanitizedCompletedLessons = sanitizeCompletedLessons(
          enrollment.completedLessons,
          validLessonIds,
        )
        const progress = calculateCourseProgressPercent(
          sanitizedCompletedLessons,
          totalCourseLessons,
        )

        return {
          id: enrollment._id.toString(),
          studentName:
            enrollment.student && typeof enrollment.student === 'object'
              ? enrollment.student.name
              : (enrollment as any).billingName || 'Unknown Student',
          studentEmail:
            enrollment.student && typeof enrollment.student === 'object'
              ? enrollment.student.email
              : '',
          courseTitle:
            enrollment.course && typeof enrollment.course === 'object'
              ? enrollment.course.title
              : 'Unknown Course',
          progress,
          completedLessons: sanitizedCompletedLessons.length,
          totalLessons: totalCourseLessons,
          updatedAt: enrollment.updatedAt,
        }
      })

      const serializedLiveLessons = (rawLiveLessons as any[]).flatMap(listLiveDeliveries).sort((a, b) => Number(a.liveDate) - Number(b.liveDate)).map((l: any) => ({
        id: l.deliveryBatchId ? `${l._id}-${l.deliveryBatchId}` : l._id.toString(),
        title: l.title,
        slug: l.slug,
        courseTitle: l.course?.title || 'Unknown Course',
        livePlatform: l.livePlatform || 'zoom',
        liveUrl: l.liveUrl || '',
        liveDate: l.liveDate ? l.liveDate.toISOString() : null,
        duration: l.duration || 60,
        autoGenerateZoom: l.autoGenerateZoom || false,
      }))

      return NextResponse.json({
        role: 'instructor',
        summary: {
          totalCourses: instructorCourses.length,
          totalLessons,
          totalStudents: totalStudentEnrollments,
        },
        courses: instructorCourses.map((c: any) => {
          let thumbnailUrl = null
          if (c.thumbnail && typeof c.thumbnail === 'object') {
            thumbnailUrl = c.thumbnail.url || null
          }
          return {
            id: c._id.toString(),
            title: c.title,
            slug: c.slug,
            status: c.status,
            price: c.price,
            thumbnail: thumbnailUrl,
            level: c.level,
            duration: formatCourseDuration(c.duration) || 'N/A',
          }
        }),
        liveLessons: serializedLiveLessons,
        studentProgress,
      })
    }

    return NextResponse.json({ error: 'Unauthorized: Role unrecognized.' }, { status: 451 })

  } catch (error: any) {
    console.error('Admin Dashboard Stats API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
