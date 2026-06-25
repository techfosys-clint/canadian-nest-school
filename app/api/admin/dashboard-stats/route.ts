import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { Student } from '@/lib/db/models/Student'
import { Course } from '@/lib/db/models/Course'
import { Lesson } from '@/lib/db/models/Lesson'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Review } from '@/lib/db/models/Review'
import { Blog } from '@/lib/db/models/Blog'
import { FAQ } from '@/lib/db/models/FAQ'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { checkAndSendLiveClassReminders } from '@/lib/email'

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

    // Trigger upcoming live class email reminders in background — only after
    // confirming the caller is an authenticated staff/admin/instructor, so
    // this side effect can't be triggered by an unauthenticated request.
    checkAndSendLiveClassReminders().catch((err) => {
      console.error('Error in background live class reminders:', err)
    })

    const role = user.role

    // ─── ADMIN ROLE DATA ──────────────────────────────────────────────────────
    if (role === 'admin') {
      const [
        totalCourses,
        totalStudents,
        enrollments,
        pendingReviewsCount,
        recentReviews,
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
      ])

      // Aggregations
      const completedList = enrollments.filter((e) => e.paymentStatus === 'completed')
      const totalIncome = completedList.reduce((sum, e) => sum + (e.pricePaid || 0), 0)
      const totalRefunded = enrollments
        .filter((e) => e.paymentStatus === 'refunded')
        .reduce((sum, e) => sum + (e.pricePaid || 0), 0)

      // Recent 5 transactions
      const recentEnrollments = [...enrollments]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map((e) => ({
          id: e._id.toString(),
          studentName: e.student && typeof e.student === 'object' ? (e.student as any).name : 'Unknown Student',
          studentEmail: e.student && typeof e.student === 'object' ? (e.student as any).email : '',
          courseTitle: e.course && typeof e.course === 'object' ? (e.course as any).title : 'Unknown Course',
          pricePaid: e.pricePaid || 0,
          paymentStatus: e.paymentStatus,
          createdAt: e.createdAt,
        }))

      // Sparkline revenue chart (last 7 days)
      const chartData: Array<{ day: string; income: number }> = []
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const today = new Date()

      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(today.getDate() - i)
        const dateStr = d.toDateString()
        const dayLabel = days[d.getDay()]

        const dayIncome = completedList
          .filter((e) => new Date(e.createdAt).toDateString() === dateStr)
          .reduce((sum, e) => sum + (e.pricePaid || 0), 0)

        chartData.push({ day: dayLabel, income: dayIncome })
      }

      return NextResponse.json({
        role: 'admin',
        summary: {
          totalCourses,
          totalStudents,
          totalEnrollments: enrollments.length,
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
        totalCategories,
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
      const instructorCourses = await Course.find({ instructor: user._id })
        .populate('thumbnail')
        .lean()
      const courseIds = instructorCourses.map((c) => c._id)

      const [totalLessons, totalStudentEnrollments, rawLiveLessons] = await Promise.all([
        Lesson.countDocuments({ course: { $in: courseIds } }),
        Enrollment.countDocuments({ course: { $in: courseIds }, paymentStatus: 'completed' }),
        Lesson.find({ course: { $in: courseIds }, lessonType: 'live' })
          .populate('course')
          .sort({ liveDate: 1 })
          .lean()
      ])

      const serializedLiveLessons = (rawLiveLessons as any[]).map((l: any) => ({
        id: l._id.toString(),
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
            duration: c.duration || 'N/A',
          }
        }),
        liveLessons: serializedLiveLessons,
      })
    }

    return NextResponse.json({ error: 'Unauthorized: Role unrecognized.' }, { status: 451 })

  } catch (error: any) {
    console.error('Admin Dashboard Stats API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
