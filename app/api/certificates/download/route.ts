import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/auth'
import {
  buildCertificateDescription,
  generateCertificatePdf,
} from '@/lib/certificate/generateCertificatePdf'
import { connectToDatabase } from '@/lib/db/mongodb'
import { CertificateRequest } from '@/lib/db/models/CertificateRequest'
import { Course } from '@/lib/db/models/Course'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { getCourseProgressPercent } from '@/lib/progress/getCourseProgress'
import {
  canDownloadCertificate,
  hasSubmittedRequiredReviews,
  reconcileCertificateWithReviewGate,
  syncCertificateRequestWithReviewGate,
} from '@/lib/reviews/reviewPack'
import '@/lib/db/models/Student'
import '@/lib/db/models/User'
import '@/lib/db/models/Category'
import '@/lib/db/models/InstructorReview'
import '@/lib/db/models/Review'

export const dynamic = 'force-dynamic'

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

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').slice(0, 80)
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase()

    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const courseId = request.nextUrl.searchParams.get('courseId')
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required.' }, { status: 400 })
    }

    const enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      paymentStatus: 'completed',
    }).lean()

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You are not enrolled in this course.' },
        { status: 403 },
      )
    }

    const progress = await getCourseProgressPercent(
      courseId,
      enrollment.completedLessons,
    )

    if (progress < 100) {
      return NextResponse.json(
        { error: 'Complete all lessons before downloading your certificate.' },
        { status: 403 },
      )
    }

    const { gate, heldForReviews } = await reconcileCertificateWithReviewGate(
      userId,
      courseId,
    )

    if (
      !hasSubmittedRequiredReviews(
        gate.courseReviewStatus,
        gate.teacherReviewStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Please leave course and teacher reviews before downloading your certificate.',
          code: 'REVIEWS_REQUIRED',
          redirectTo: `/dashboard/courses/${courseId}/complete`,
          heldForReviews,
        },
        { status: 403 },
      )
    }

    if (
      !canDownloadCertificate(
        gate.courseReviewStatus,
        gate.teacherReviewStatus,
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Your reviews were rejected. Please resubmit course and teacher reviews to unlock the certificate.',
          code: 'REVIEWS_REJECTED',
          redirectTo: `/dashboard/courses/${courseId}/complete`,
        },
        { status: 403 },
      )
    }

    // Reviews submitted → approve/create the certificate row immediately.
    await syncCertificateRequestWithReviewGate(userId, courseId, 100)
    const certificateRequest = await CertificateRequest.findOne({
      student: userId,
      course: courseId,
    })

    if (!certificateRequest || certificateRequest.status !== 'approved') {
      return NextResponse.json(
        {
          error: 'Your certificate is not ready for download yet.',
          code: 'CERTIFICATE_NOT_APPROVED',
          redirectTo: `/dashboard/courses/${courseId}/complete`,
        },
        { status: 403 },
      )
    }

    const course = await Course.findById(courseId).populate('category').lean()
    if (!course) {
      return NextResponse.json({ error: 'Course not found.' }, { status: 404 })
    }

    const { Student } = await import('@/lib/db/models/Student')
    let student = await Student.findById(userId).select('name').lean()
    if (!student) {
      const { User } = await import('@/lib/db/models/User')
      student = await User.findById(userId).select('name').lean()
    }

    const studentName = student?.name?.trim() || 'Student'
    const completionDate =
      certificateRequest.updatedAt ||
      certificateRequest.createdAt ||
      new Date()
    const description = buildCertificateDescription(
      course.title,
      completionDate,
    )

    const pdfBuffer = await generateCertificatePdf({
      studentName,
      description,
    })

    const filename = `${sanitizeFilename(course.title)}-certificate.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('GET /api/certificates/download error:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificate PDF.' },
      { status: 500 },
    )
  }
}
