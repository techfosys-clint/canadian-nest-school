import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Enrollment } from '@/lib/db/models/Enrollment'
import { Course } from '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'

export async function GET(request: Request) {
  try {
    await connectToDatabase()

    // 1. Get filename from URL
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('file')

    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file parameter.' }, { status: 400 })
    }

    // 2. Session verification
    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let userId: string | null = null
    let hasDirectAccess = false

    // Check admin/staff/instructor session
    if (payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id).lean()
        if (user && ['admin', 'staff', 'instructor'].includes(user.role)) {
          hasDirectAccess = true
        }
      }
    }

    // Check student session if not admin/staff
    if (!hasDirectAccess && studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded && decoded.id) {
        userId = decoded.id
      }
    }

    if (!hasDirectAccess && !userId) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 })
    }

    // 3. Enforce Enrollment Check for students
    if (!hasDirectAccess && userId) {
      // Find all completed enrollments of this student
      const enrollments = await Enrollment.find({
        student: userId,
        paymentStatus: 'completed'
      }).populate('course').lean()

      const isEnrolled = enrollments.some((e: any) => {
        const course = e.course
        if (!course || !course.studyMaterials) return false
        // Check if any study material URL contains our target filename
        return course.studyMaterials.some((material: any) => {
          return material.url && material.url.includes(filename)
        })
      })

      if (!isEnrolled) {
        return NextResponse.json({ error: 'Forbidden. You are not enrolled in the course offering this material.' }, { status: 403 })
      }
    }

    // 4. Locate and serve the file
    const { getFromStorage } = await import('@/lib/storage')
    const fileData = await getFromStorage(filename, 'study-materials')
    
    if (!fileData) {
      return NextResponse.json({ error: 'File not found on server.' }, { status: 404 })
    }

    // Auto-detect Content-Type
    const ext = path.extname(filename).toLowerCase()
    let contentType = fileData.contentType || 'application/octet-stream'
    if (!fileData.contentType) {
      if (ext === '.pdf') contentType = 'application/pdf'
      else if (ext === '.epub') contentType = 'application/epub+zip'
      else if (ext === '.mobi') contentType = 'application/x-mobipocket-ebook'
      else if (ext === '.zip') contentType = 'application/zip'
      else if (ext === '.doc') contentType = 'application/msword'
      else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }

    // Serve file as inline preview if PDF, otherwise as attachment download
    const disposition = ext === '.pdf' ? 'inline' : 'attachment'

    return new Response(fileData.buffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })

  } catch (error: any) {
    console.error('Study Material Download API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to download study material.' }, { status: 500 })
  }
}
