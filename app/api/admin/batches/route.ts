import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Batch } from '@/lib/db/models/Batch'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing.' }, { status: 401 })
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid.' }, { status: 401 })
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || !['admin', 'staff', 'instructor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    // Build filter based on role (Instructors only see their own batches)
    const filter: any = {}
    if (user.role === 'instructor') {
      filter.instructor = user._id
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('course')
    if (courseId) {
      filter.course = courseId
    }

    const batches = await Batch.find(filter)
      .populate('course', 'title slug')
      .populate('instructor', 'name email')
      .populate('students', 'name email phone')
      .sort({ createdAt: -1 })
      .lean()

    const { isBatchAcceptingStudents } = await import('@/lib/batchCapacity')
    const batchesWithStatus = batches.map((b: any) => ({
      ...b,
      isAcceptingStudents: isBatchAcceptingStudents(b),
    }))

    return NextResponse.json({ success: true, batches: batchesWithStatus })

  } catch (error: any) {
    console.error('Get Batches API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch batches.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing.' }, { status: 401 })
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid.' }, { status: 401 })
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || !['admin', 'instructor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, course, instructor, startDate, endDate, status, maxStudents, reactivateDate } = body

    if (!name || !course || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required batch parameters.' }, { status: 400 })
    }

    // Force instructor ID for instructor role
    const finalInstructor = user.role === 'instructor' ? user._id.toString() : (instructor || user._id.toString())

    const newBatch = new Batch({
      name,
      course,
      instructor: finalInstructor,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: status || 'upcoming',
      students: [],
      maxStudents: Number(maxStudents) || 0,
      reactivateDate: reactivateDate ? new Date(reactivateDate) : null,
    })

    await newBatch.save()

    return NextResponse.json({
      success: true,
      message: 'Batch successfully created.',
      batch: newBatch,
    })

  } catch (error: any) {
    console.error('Create Batch API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create batch.' }, { status: 500 })
  }
}
