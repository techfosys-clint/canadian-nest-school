import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Review } from '@/lib/db/models/Review'
import { Student } from '@/lib/db/models/Student'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'staff'], 'reviews')
    if (!user) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { course, studentId, studentName, studentEmail, studentProfilePic, rating, comment, status } = body

    if (!course || !rating || !comment?.trim()) {
      return NextResponse.json({ error: 'Missing required fields: course, rating, comment.' }, { status: 400 })
    }

    // 3. Resolve student ID
    let finalStudentId = studentId
    if (!finalStudentId) {
      if (!studentName?.trim() || !studentEmail?.trim()) {
        return NextResponse.json({ error: 'Please select a student, or provide student name and email.' }, { status: 400 })
      }

      // Check if student already exists
      const existingStudent = await Student.findOne({ email: studentEmail.trim().toLowerCase() })
      if (existingStudent) {
        finalStudentId = existingStudent._id.toString()
      } else {
        // Create new student profile
        const newStudent = await Student.create({
          name: studentName.trim(),
          email: studentEmail.trim().toLowerCase(),
          profilePic: studentProfilePic || undefined,
          status: 'active',
        })
        finalStudentId = newStudent._id.toString()
      }
    }

    // 4. Create review in Mongoose
    const review = await Review.create({
      course,
      student: finalStudentId,
      rating: String(rating) as '1' | '2' | '3' | '4' | '5',
      comment: comment.trim(),
      status: status || 'approved',
    })

    return NextResponse.json({
      success: true,
      message: 'Review successfully created.',
      review,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Create Review API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to create review.' }, { status: 500 })
  }
}
