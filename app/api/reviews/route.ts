import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Review } from '@/lib/db/models/Review'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let userId: string | null = null
    let isAdminOrStaff = false

    // 1. Authenticate student token
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded && decoded.id) {
        userId = decoded.id
      }
    }

    // 2. Authenticate admin/staff token
    if (!userId && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded && decoded.id) {
        userId = decoded.id
        const user = await User.findById(decoded.id).lean()
        if (user && ['admin', 'staff', 'instructor'].includes(user.role)) {
          isAdminOrStaff = true
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse Payload-style query filter where[student][equals] — only
    // admin/staff/instructor may override the target student; a regular
    // student is always scoped to their own reviews regardless of this param.
    let targetStudentId = userId
    if (isAdminOrStaff) {
      for (const [key, value] of searchParams.entries()) {
        if (key.includes('student') && key.includes('equals')) {
          targetStudentId = value
          break
        }
      }
    }

    // Query reviews submitted by this student
    const docs = await Review.find({ student: targetStudentId })
      .populate('course')
      .sort({ createdAt: -1 })
      .lean()

    // Format reviews for client use
    const formattedDocs = docs.map((doc: any) => ({
      id: doc._id.toString(),
      ...doc,
      course: doc.course ? {
        id: doc.course._id.toString(),
        title: doc.course.title,
        slug: doc.course.slug
      } : null
    }))

    return NextResponse.json({
      success: true,
      docs: formattedDocs,
    })

  } catch (error: any) {
    console.error('API Reviews GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reviews.' },
      { status: 500 }
    )
  }
}
