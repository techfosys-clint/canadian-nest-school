import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Submission } from '@/lib/db/models/Submission'
import { Lesson } from '@/lib/db/models/Lesson'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { syncEnrollmentProgressSideEffects } from '@/lib/progress/syncEnrollmentProgress'
import {
  getValidatedCompletedLessons,
  isLessonInCourse,
} from '@/lib/progress/getCourseProgress'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

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

// GET: Fetch student submissions
export async function GET(request: Request) {
  try {
    await connectToDatabase()
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const filter: any = { student: userId }
    if (courseId) {
      filter.course = courseId
    }

    const submissions = await Submission.find(filter)
      .populate('lesson', 'title totalMarks lessonType')
      .sort({ updatedAt: -1 })
      .lean()

    return NextResponse.json({ success: true, submissions })
  } catch (error: any) {
    console.error('GET /api/submissions error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch submissions.' }, { status: 500 })
  }
}

// POST: Submit a quiz or assignment
export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { courseId, lessonId, type, googleDriveLink, quizCorrectAnswers, quizTotalQuestions, selectedAnswers } = body

    if (!courseId || !lessonId || !type) {
      return NextResponse.json({ success: false, error: 'Missing required parameters.' }, { status: 400 })
    }

    const lesson = await Lesson.findById(lessonId).lean()
    if (!lesson) {
      return NextResponse.json({ success: false, error: 'Lesson not found.' }, { status: 404 })
    }

    const lessonBelongsToCourse = await isLessonInCourse(courseId, lessonId)
    if (!lessonBelongsToCourse) {
      return NextResponse.json(
        { success: false, error: 'Lesson does not belong to this course.' },
        { status: 400 },
      )
    }

    const totalMarks = lesson.totalMarks || 100

    let marksObtained = 0
    let status: 'pending' | 'graded' = 'pending'

    if (type === 'quiz') {
      if (typeof quizCorrectAnswers !== 'number' || typeof quizTotalQuestions !== 'number') {
        return NextResponse.json({ success: false, error: 'Quiz answers stats are required.' }, { status: 400 })
      }
      status = 'graded'
      marksObtained = quizTotalQuestions > 0 ? Math.round((quizCorrectAnswers / quizTotalQuestions) * totalMarks) : 0
    } else if (type === 'assignment') {
      if (!googleDriveLink || !googleDriveLink.trim()) {
        return NextResponse.json({ success: false, error: 'Google Drive link is required.' }, { status: 400 })
      }
      status = 'pending'
      marksObtained = 0
    }

    // Upsert submission
    const submission = await Submission.findOneAndUpdate(
      { student: userId, lesson: lessonId },
      {
        student: userId,
        course: courseId,
        lesson: lessonId,
        type,
        googleDriveLink: type === 'assignment' ? googleDriveLink : undefined,
        status,
        totalMarks,
        marksObtained,
        quizCorrectAnswers: type === 'quiz' ? quizCorrectAnswers : undefined,
        quizTotalQuestions: type === 'quiz' ? quizTotalQuestions : undefined,
        selectedAnswers: type === 'quiz' ? selectedAnswers : undefined,
        submittedAt: new Date(),
      },
      { upsert: true, returnDocument: 'after' }
    )

    // Automatically mark the lesson as completed in Enrollment progress
    const enrollment = await Enrollment.findOne({
      student: userId,
      course: courseId,
      paymentStatus: 'completed',
    })

    if (enrollment) {
      if (!Array.isArray(enrollment.completedLessons)) {
        enrollment.completedLessons = []
      }
      if (!enrollment.completedLessons.includes(lessonId)) {
        enrollment.completedLessons.push(lessonId)
        const sanitizedCompletedLessons = await getValidatedCompletedLessons(
          courseId,
          enrollment.completedLessons,
        )
        enrollment.completedLessons = sanitizedCompletedLessons
        await enrollment.save()
        await syncEnrollmentProgressSideEffects(
          userId,
          courseId,
          sanitizedCompletedLessons,
        )
      }
    }

    return NextResponse.json({ success: true, submission })
  } catch (error: any) {
    console.error('POST /api/submissions error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save submission.' }, { status: 500 })
  }
}
