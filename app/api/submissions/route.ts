import { assertCourseContentAccess } from '@/lib/subscriptions/access'
import { resolveLessonDelivery } from '@/lib/lessons/delivery'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Submission } from '@/lib/db/models/Submission'
import { Lesson } from '@/lib/db/models/Lesson'
import { syncEnrollmentProgressSideEffects } from '@/lib/progress/syncEnrollmentProgress'
import {
  getValidatedCompletedLessons,
} from '@/lib/progress/getCourseProgress'
import { getLearningSession } from '@/lib/auth/learningSession'


// GET: Fetch student submissions
export async function GET(request: Request) {
  try {
    await connectToDatabase()
    const userId = (await getLearningSession())?.account.id
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
    const userId = (await getLearningSession())?.account.id
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

    if (String(lesson.course) !== courseId) {
      return NextResponse.json({ success: false, error: 'Lesson does not belong to this course.' }, { status: 400 })
    }
    const access = await assertCourseContentAccess(userId, courseId)
    const enrollment = access.enrollment
    const delivery = access.allowed && resolveLessonDelivery(lesson, enrollment?.batch?.toString())
    if (!delivery || delivery.lessonType !== type || !['quiz', 'assignment'].includes(type)) {
      return NextResponse.json({ success: false, error: 'This activity is unavailable for your enrollment.' }, { status: 403 })
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
          enrollment.batch?.toString() ?? null,
        )
      }
    }

    return NextResponse.json({ success: true, submission })
  } catch (error: any) {
    console.error('POST /api/submissions error:', error)
    return NextResponse.json({ success: false, error: 'Failed to save submission.' }, { status: 500 })
  }
}
