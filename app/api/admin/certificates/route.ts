import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { CertificateRequest } from '@/lib/db/models/CertificateRequest'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { User } from '@/lib/db/models/User'
import {
  calculateCourseProgressPercent,
  getLessonCountsByCourse,
  getLessonIdsByCourse,
  sanitizeCompletedLessons,
} from '@/lib/progress/getCourseProgress'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

async function adminCheck() {
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) return null

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) return null

  const user = await User.findById(decoded.id).lean()
  if (!user || !['admin', 'staff', 'instructor'].includes(user.role)) return null

  return user
}

function enrollmentKey(studentId: string, courseId: string) {
  return `${studentId}:${courseId}`
}

// GET all certificate requests for administration panel
export async function GET() {
  try {
    await connectToDatabase()
    const user = await adminCheck()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const requests = await CertificateRequest.find()
      .populate('student', 'name email phone')
      .populate('course', 'title price')
      .sort({ createdAt: -1 })
      .lean()

    const courseIds = [
      ...new Set(
        requests
          .map((r) => r.course?._id?.toString())
          .filter((id): id is string => Boolean(id)),
      ),
    ]

    const lessonCounts = await getLessonCountsByCourse(courseIds)
    const lessonIdsByCourse = await getLessonIdsByCourse(courseIds)

    const enrollmentProgress = new Map<string, string[]>()
    if (requests.length > 0) {
      const enrollments = await Enrollment.find({
        paymentStatus: 'completed',
        $or: requests.map((r) => ({
          student: r.student?._id,
          course: r.course?._id,
        })),
      })
        .select('student course completedLessons')
        .lean()

      for (const enrollment of enrollments) {
        const studentId = enrollment.student?.toString()
        const courseId = enrollment.course?.toString()
        if (!studentId || !courseId) continue
        enrollmentProgress.set(
          enrollmentKey(studentId, courseId),
          enrollment.completedLessons || [],
        )
      }
    }

    const formatted = requests.map((r) => {
      const studentId = r.student?._id?.toString()
      const courseId = r.course?._id?.toString()
      const completedLessons =
        studentId && courseId
          ? enrollmentProgress.get(enrollmentKey(studentId, courseId)) || []
          : []
      const totalLessons = courseId ? lessonCounts.get(courseId) || 0 : 0
      const validLessonIds = courseId
        ? lessonIdsByCourse.get(courseId) || new Set<string>()
        : new Set<string>()
      const sanitizedCompletedLessons = sanitizeCompletedLessons(
        completedLessons,
        validLessonIds,
      )
      const progress = calculateCourseProgressPercent(
        sanitizedCompletedLessons,
        totalLessons,
      )

      return {
        id: r._id.toString(),
        student: r.student
          ? {
              id: r.student._id.toString(),
              name: r.student.name,
              email: r.student.email,
              phone: r.student.phone || 'N/A',
            }
          : null,
        course: r.course
          ? {
              id: r.course._id.toString(),
              title: r.course.title,
            }
          : null,
        status: r.status,
        progress,
        certificateUrl: r.certificateUrl || null,
        adminNotes: r.adminNotes || '',
        createdAt: r.createdAt,
      }
    })

    return NextResponse.json({ success: true, requests: formatted })
  } catch (error) {
    console.error('GET /api/admin/certificates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch certificate requests.' },
      { status: 500 },
    )
  }
}
