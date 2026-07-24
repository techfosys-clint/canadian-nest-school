import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { StudentProgress } from '@/lib/db/models/StudentProgress'
import {
  getValidatedCompletedLessons,
  isLessonInCourse,
} from '@/lib/progress/getCourseProgress'
import { syncEnrollmentProgressSideEffects } from '@/lib/progress/syncEnrollmentProgress'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { bdTodayYmd } from '@/lib/bdTime'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
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

// ─── GET: Fetch all progress for the current student ──────────────────────────
// Returns: { completedLessons: { [courseId]: string[] }, loginDates: string[] }
export async function GET() {
  try {
    await connectToDatabase()
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    // Fetch all enrollments for the student and extract completedLessons
    const enrollments = await Enrollment.find({ student: userId, paymentStatus: 'completed' })
      .select('course completedLessons')
      .lean()

    const completedLessons: Record<string, string[]> = {}
    for (const enr of enrollments) {
      const courseId = enr.course?.toString()
      if (!courseId) continue

      const sanitized = await getValidatedCompletedLessons(
        courseId,
        enr.completedLessons,
      )
      completedLessons[courseId] = sanitized

      const raw = enr.completedLessons || []
      if (raw.length !== sanitized.length) {
        await Enrollment.updateOne(
          { _id: enr._id },
          { $set: { completedLessons: sanitized } },
        )
      }
    }

    // Fetch login streak dates
    const progressDoc = await StudentProgress.findOne({ student: userId }).lean() as any
    const loginDates: string[] = progressDoc?.loginDates || []

    // Auto-record today's login (Bangladesh calendar day)
    const today = bdTodayYmd()
    if (!loginDates.includes(today)) {
      await StudentProgress.findOneAndUpdate(
        { student: userId },
        { $addToSet: { loginDates: today } },
        { upsert: true, new: true }
      )
      loginDates.push(today)
    }

    return NextResponse.json({ success: true, completedLessons, loginDates })
  } catch (error: any) {
    console.error('GET /api/progress error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch progress.' }, { status: 500 })
  }
}

// ─── POST: Update progress (toggle lesson completion) ─────────────────────────
// Body: { courseId: string, lessonId: string, completed: boolean }
export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, lessonId, completed } = body

    if (!courseId || !lessonId || typeof completed !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'courseId, lessonId, and completed (boolean) are required.' },
        { status: 400 }
      )
    }

    // Find the enrollment
    const enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      paymentStatus: 'completed',
    })

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'No active enrollment found for this course.' },
        { status: 404 }
      )
    }

    if (!Array.isArray(enrollment.completedLessons)) {
      enrollment.completedLessons = []
    }

    if (completed) {
      const lessonBelongsToCourse = await isLessonInCourse(courseId, lessonId)
      if (!lessonBelongsToCourse) {
        return NextResponse.json(
          { success: false, error: 'Lesson does not belong to this course.' },
          { status: 400 },
        )
      }

      if (!enrollment.completedLessons.includes(lessonId)) {
        enrollment.completedLessons.push(lessonId)
      }
    } else {
      enrollment.completedLessons = enrollment.completedLessons.filter(
        (id: string) => id !== lessonId,
      )
    }

    const sanitizedCompletedLessons = await getValidatedCompletedLessons(
      courseId,
      enrollment.completedLessons,
    )
    enrollment.completedLessons = sanitizedCompletedLessons

    await enrollment.save()

    const progress = await syncEnrollmentProgressSideEffects(
      userId,
      courseId,
      sanitizedCompletedLessons,
    )

    return NextResponse.json({
      success: true,
      completedLessons: sanitizedCompletedLessons,
      progress,
    })
  } catch (error: any) {
    console.error('POST /api/progress error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update progress.' }, { status: 500 })
  }
}
