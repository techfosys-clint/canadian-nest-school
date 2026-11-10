import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Batch } from '@/lib/db/models/Batch'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import {
  canStudentJoinBatch,
  isBatchAcceptingStudents,
  isBatchJoinWindowOpen,
} from '@/lib/batchCapacity'

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Props) {
  try {
    await connectToDatabase()
    const { id } = await params

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

    const batch = await Batch.findById(id)
      .populate('course', 'title slug')
      .populate('instructor', 'name email')
      .populate('students', 'name email')
      .lean()

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      batch: {
        ...batch,
        isAcceptingStudents: isBatchAcceptingStudents(batch as any),
        isJoinWindowOpen: isBatchJoinWindowOpen(batch as any),
        isOpenForEnrollment: canStudentJoinBatch(batch as any),
      },
    })

  } catch (error: any) {
    console.error('Get Batch API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch batch.' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: Props) {
  try {
    await connectToDatabase()
    const { id } = await params

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
    const {
      name,
      instructor,
      startDate,
      endDate,
      joinOpensAt,
      joinClosesAt,
      status,
      students,
      maxStudents,
      reactivateDate,
    } = body

    const batch = await Batch.findById(id)
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found.' }, { status: 444 })
    }

    // Instructors can only edit their own batches
    if (user.role === 'instructor' && batch.instructor.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own batches.' }, { status: 403 })
    }

    if (name) batch.name = name
    if (instructor && user.role === 'admin') batch.instructor = instructor
    if (startDate) batch.startDate = new Date(startDate)
    if (endDate) batch.endDate = new Date(endDate)
    if (joinOpensAt !== undefined) {
      batch.joinOpensAt = joinOpensAt ? new Date(joinOpensAt) : null
    }
    if (joinClosesAt !== undefined) {
      batch.joinClosesAt = joinClosesAt ? new Date(joinClosesAt) : null
    }
    if (
      batch.joinOpensAt &&
      batch.joinClosesAt &&
      !(batch.joinOpensAt.getTime() < batch.joinClosesAt.getTime())
    ) {
      return NextResponse.json(
        { error: 'Join opens must be before join closes.' },
        { status: 400 },
      )
    }
    if (status) batch.status = status
    if (maxStudents !== undefined) batch.maxStudents = Number(maxStudents) || 0
    if (reactivateDate !== undefined) batch.reactivateDate = reactivateDate ? new Date(reactivateDate) : null

    if (students) {
      // Only enforce the capacity gate when the roster is growing — removing
      // students should always be allowed regardless of capacity.
      if (students.length > batch.students.length && !isBatchAcceptingStudents(batch)) {
        return NextResponse.json(
          { error: `This batch is full (max ${batch.maxStudents} students). Set a reactivate date or raise the limit to allow more joins.` },
          { status: 400 }
        )
      }
      batch.students = students
    }

    await batch.save()

    return NextResponse.json({
      success: true,
      message: 'Batch successfully updated.',
      batch,
    })

  } catch (error: any) {
    console.error('Update Batch API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update batch.' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    await connectToDatabase()
    const { id } = await params

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
    if (!user || !['admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    const batch = await Batch.findByIdAndDelete(id)
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found.' }, { status: 444 })
    }

    return NextResponse.json({
      success: true,
      message: 'Batch successfully deleted.',
    })

  } catch (error: any) {
    console.error('Delete Batch API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete batch.' }, { status: 500 })
  }
}
