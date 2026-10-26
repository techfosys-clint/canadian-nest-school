import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Lesson } from '@/lib/db/models/Lesson'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let userId: string | null = null
    let isAdmin = false

    // 1. Authenticate student token
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded && decoded.id) {
        userId = decoded.id
      }
    }

    // 2. Authenticate admin token
    if (!userId && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded && decoded.id) {
        userId = decoded.id
        const user = await User.findById(decoded.id).lean()
        if (user && user.role === 'admin') {
          isAdmin = true
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Session missing.' }, { status: 401 })
    }

    const lessonsQuery: any = { lessonType: 'live' }

    const blockedCourseIds = new Set<string>()

    if (!isAdmin) {
      // For standard students, query only live classes belonging to courses they purchased
      const enrollments = await Enrollment.find({
        student: userId,
        paymentStatus: 'completed',
      })
        .select(
          'course billingType paidUntil accessStatus paymentStatus',
        )
        .lean()

      const { getSubscriptionAccessSnapshot } = await import(
        '@/lib/subscriptions/billing'
      )
      const { Course } = await import('@/lib/db/models/Course')

      const courseIds: any[] = []
      for (const e of enrollments as any[]) {
        const courseId = e.course?.toString?.() || String(e.course)
        if (e.billingType === 'monthly') {
          const course = await Course.findById(courseId)
            .select(
              'billingType noticeStartOffsetDays noticeEndOffsetDays blockOffsetDays',
            )
            .lean()
          if (course) {
            const snapshot = getSubscriptionAccessSnapshot(e, course)
            if (snapshot.isBlocked) {
              blockedCourseIds.add(courseId)
              // Persist block if cron hasn't caught up
              if (e.accessStatus !== 'blocked') {
                await Enrollment.updateOne(
                  { _id: e._id },
                  { $set: { accessStatus: 'blocked' } },
                )
              }
              continue
            }
          }
        }
        courseIds.push(e.course)
      }

      lessonsQuery.course = { $in: courseIds }
    }

    // Find upcoming live webinars
    const liveLessons = await Lesson.find(lessonsQuery)
      .populate({ path: 'course', select: 'title' })
      .sort({ liveDate: 1 })
      .lean()

    const serializedLessons = (liveLessons as any[])
      .filter((l: any) => {
        const cid = l.course?._id?.toString?.() || l.course?.toString?.()
        return !cid || !blockedCourseIds.has(cid)
      })
      .map((l: any) => ({
        id: l._id.toString(),
        title: l.title,
        slug: l.slug,
        courseTitle: l.course?.title || 'Unknown Course',
        livePlatform: l.livePlatform || 'zoom',
        liveUrl: l.liveUrl || '',
        liveDate: l.liveDate ? l.liveDate.toISOString() : null,
        duration: l.duration || 60,
      }))

    return NextResponse.json({ success: true, liveLessons: serializedLessons })
  } catch (error: any) {
    console.error('Fetch Student Webinars API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch live webinars.' }, { status: 500 })
  }
}
