import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { Student } from '@/lib/db/models/Student'
import { Course } from '@/lib/db/models/Course'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

/**
 * GET /api/admin/enrollments
 * Fetch all enrollments (admin only) with optional search filter
 * Returns standardized response format
 */
export async function GET(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'Session authentication token is missing.',
        },
        { status: 401 }
      )
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'INVALID_TOKEN',
          message: 'Session authentication token is invalid.',
        },
        { status: 401 }
      )
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'ADMIN_ONLY',
          message: 'Only administrators can access enrollments.',
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search') || ''

    const matchCriteria: any = {}

    if (searchQuery) {
      // Escape regex special characters to prevent injection
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      // Find students matching search query (with escaped input)
      const matchingStudents = await Student.find({
        $or: [
          { name: { $regex: escapedQuery, $options: 'i' } },
          { email: { $regex: escapedQuery, $options: 'i' } }
        ]
      }).select('_id').lean()
      const studentIds = matchingStudents.map((s) => s._id)

      // Find courses matching search query (with escaped input)
      const matchingCourses = await Course.find({
        title: { $regex: escapedQuery, $options: 'i' }
      }).select('_id').lean()
      const courseIds = matchingCourses.map((c) => c._id)

      matchCriteria.$or = [
        { student: { $in: studentIds } },
        { course: { $in: courseIds } }
      ]
    }

    const enrollments = await Enrollment.find(matchCriteria)
      .populate('student')
      .populate('course')
      .sort({ createdAt: -1 })
      .lean()

    const formattedEnrollments = enrollments.map((e: any) => ({
      id: e._id.toString(),
      studentName: e.student && typeof e.student === 'object' ? e.student.name : 'Unknown Student',
      studentEmail: e.student && typeof e.student === 'object' ? e.student.email : '',
      courseTitle: e.course && typeof e.course === 'object' ? e.course.title : 'Unknown Course',
      pricePaid: e.pricePaid || 0,
      paymentStatus: e.paymentStatus,
      createdAt: e.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: { enrollments: formattedEnrollments },
    })
  } catch (error: any) {
    console.error('GET /api/admin/enrollments error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch enrollments',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while fetching enrollments.',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/enrollments
 * Delete an enrollment record by ID (admin only)
 * Returns standardized response format
 */
export async function DELETE(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'AUTH_REQUIRED',
          message: 'Session authentication token is missing.',
        },
        { status: 401 }
      )
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'INVALID_TOKEN',
          message: 'Session authentication token is invalid.',
        },
        { status: 401 }
      )
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          code: 'ADMIN_ONLY',
          message: 'Only administrators can delete enrollments.',
        },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const enrollmentId = searchParams.get('id')

    if (!enrollmentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter',
          code: 'VALIDATION_ERROR',
          message: 'Enrollment ID query parameter is required.',
        },
        { status: 400 }
      )
    }

    const deleted = await Enrollment.findByIdAndDelete(enrollmentId)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enrollment not found',
          code: 'NOT_FOUND',
          message: 'The specified enrollment record does not exist.',
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Student unenrolled / course removed successfully.',
    })
  } catch (error: any) {
    console.error('DELETE /api/admin/enrollments error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete enrollment',
        code: 'INTERNAL_ERROR',
        message: error.message || 'An unexpected error occurred while deleting the enrollment.',
      },
      { status: 500 }
    )
  }
}
