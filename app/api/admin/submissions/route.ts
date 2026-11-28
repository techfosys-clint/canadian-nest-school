import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Submission } from '@/lib/db/models/Submission'
import { getCourseScope, getStaffUser } from '@/lib/auth/staffScope'

// GET all submissions for administration grading
export async function GET(request: Request) {
  try {
    await connectToDatabase()
    const user = await getStaffUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    // Admins: all; staff: with the Lessons permission; instructors: their courses.
    const scope = await getCourseScope(user, 'lessons')
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'quiz' | 'assignment'
    const status = searchParams.get('status') // 'pending' | 'graded'
    const studentId = searchParams.get('studentId')
    const courseId = searchParams.get('courseId')

    const filter: any = {}
    if (status) filter.status = status
    if (studentId) filter.student = studentId
    if (courseId) filter.course = courseId
    if (scope !== 'all') {
      filter.course = courseId
        ? (scope.includes(courseId) ? courseId : { $in: [] })
        : { $in: scope }
    }

    if (type) {
      filter.type = type
    } else if (!studentId && !courseId) {
      filter.type = 'assignment'
    }

    const submissions = await Submission.find(filter)
      .populate('student', 'name email phone')
      .populate('course', 'title')
      .populate('lesson', 'title totalMarks')
      .sort({ createdAt: -1 })
      .lean()

    const formatted = submissions.map((s: any) => ({
      id: s._id.toString(),
      student: s.student ? {
        id: s.student._id.toString(),
        name: s.student.name,
        email: s.student.email,
        phone: s.student.phone || 'N/A',
      } : null,
      course: s.course ? {
        id: s.course._id.toString(),
        title: s.course.title,
      } : null,
      lesson: s.lesson ? {
        id: s.lesson._id.toString(),
        title: s.lesson.title,
        totalMarks: s.lesson.totalMarks || 100,
      } : null,
      type: s.type,
      googleDriveLink: s.googleDriveLink || null,
      status: s.status,
      feedback: s.feedback || '',
      totalMarks: s.totalMarks,
      marksObtained: s.marksObtained,
      quizCorrectAnswers: s.quizCorrectAnswers || 0,
      quizTotalQuestions: s.quizTotalQuestions || 0,
      submittedAt: s.submittedAt,
      gradedAt: s.gradedAt || null,
    }))

    return NextResponse.json({ success: true, submissions: formatted })
  } catch (error: any) {
    console.error('GET /api/admin/submissions error:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions.' }, { status: 500 })
  }
}
