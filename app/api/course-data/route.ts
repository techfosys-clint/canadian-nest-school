import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Submission } from '@/lib/db/models/Submission'
import { CertificateRequest } from '@/lib/db/models/CertificateRequest'
import { getValidatedCompletedLessons } from '@/lib/progress/getCourseProgress'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

// Standard API Response Format:
// {
//   success: boolean,
//   data?: any,
//   error?: string,
//   code?: string,
//   message?: string
// }

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

/**
 * GET /api/course-data?courseId=...
 *
 * Fetches combined course data including:
 * - Progress (completedLessons)
 * - Submissions (quiz & assignment)
 * - Certificate status
 *
 * Returns standardized format with all data in single request
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase()

    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'User authentication required to access course data.',
        },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const courseId = url.searchParams.get('courseId')

    if (!courseId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing courseId parameter',
          code: 'INVALID_REQUEST',
          message: 'courseId query parameter is required.',
        },
        { status: 400 }
      )
    }

    // 1. Fetch progress (completed lessons)
    const enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      paymentStatus: 'completed',
    }).select('_id completedLessons')

    let completedLessons: string[] = []
    if (enrollment) {
      completedLessons = await getValidatedCompletedLessons(
        courseId,
        enrollment.completedLessons,
      )

      const raw = enrollment.completedLessons || []
      if (raw.length !== completedLessons.length) {
        enrollment.completedLessons = completedLessons
        await enrollment.save()
      }
    }

    // 2. Fetch submissions (quiz & assignment)
    const submissions = await Submission.find({
      student: userId,
      course: courseId,
    })
      .select('lesson type quizCorrectAnswers quizTotalQuestions marksObtained totalMarks googleDriveLink status feedback selectedAnswers')
      .lean()

    const submissionsMap: Record<string, any> = {}
    submissions.forEach((sub: any) => {
      const lessonId = sub.lesson?.toString()
      if (lessonId) {
        submissionsMap[lessonId] = {
          _id: sub._id,
          type: sub.type,
          status: sub.status,
          quizCorrectAnswers: sub.quizCorrectAnswers,
          quizTotalQuestions: sub.quizTotalQuestions,
          selectedAnswers: sub.selectedAnswers,
          marksObtained: sub.marksObtained,
          totalMarks: sub.totalMarks,
          googleDriveLink: sub.googleDriveLink,
          feedback: sub.feedback,
        }
      }
    })

    // 3. Fetch certificate status
    const certificateRequest = await CertificateRequest.findOne({
      student: userId,
      course: courseId,
    })
      .select('status certificateUrl')
      .lean()

    const certificateStatus = certificateRequest
      ? {
          status: certificateRequest.status,
          url: certificateRequest.certificateUrl || null,
        }
      : null

    // Return standardized response
    return NextResponse.json({
      success: true,
      data: {
        progress: {
          completedLessons,
        },
        submissions: submissionsMap,
        certificates: certificateStatus,
      },
    })
  } catch (error: any) {
    console.error('GET /api/course-data error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch course data',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while fetching course data.',
      },
      { status: 500 }
    )
  }
}
