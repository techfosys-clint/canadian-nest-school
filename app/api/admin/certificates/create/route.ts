import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedUser } from '@/lib/auth/auth'
import {
  buildCertificateDescription,
  generateCertificatePdf,
} from '@/lib/certificate/generateCertificatePdf'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'

export const dynamic = 'force-dynamic'

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'certificate'
}

/**
 * POST /api/admin/certificates/create
 * Generate a certificate PDF for offline / manual issuance.
 * Does not create a database record — download only.
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase()

    const user = await getAuthorizedUser(['admin', 'staff'], 'certificates')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const studentName =
      typeof body.studentName === 'string' ? body.studentName.trim() : ''
    const courseTitle =
      typeof body.courseTitle === 'string' ? body.courseTitle.trim() : ''
    const courseId =
      typeof body.courseId === 'string' ? body.courseId.trim() : ''

    if (!studentName) {
      return NextResponse.json(
        { error: 'Student name is required.' },
        { status: 400 },
      )
    }
    if (!courseTitle) {
      return NextResponse.json(
        { error: 'Course name is required.' },
        { status: 400 },
      )
    }

    let level: string | undefined
    let summary: string | undefined

    if (courseId) {
      const course = await Course.findById(courseId)
        .select('title level summary')
        .lean()
      if (course) {
        level = course.level
        summary = course.summary
      }
    }

    const description = buildCertificateDescription(courseTitle, level, summary)
    const pdfBuffer = await generateCertificatePdf({
      studentName,
      description,
    })

    const filename = `${sanitizeFilename(studentName)}-${sanitizeFilename(courseTitle)}-certificate.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('POST /api/admin/certificates/create error:', error)
    return NextResponse.json(
      { error: 'Failed to generate certificate PDF.' },
      { status: 500 },
    )
  }
}
