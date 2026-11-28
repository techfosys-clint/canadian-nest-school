import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Submission } from '@/lib/db/models/Submission'
import { getCourseScope, getStaffUser, scopeAllows } from '@/lib/auth/staffScope'

/** Loads a submission the current user may grade, or an error response. */
async function loadManageableSubmission(id: string) {
  const user = await getStaffUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }
  const scope = await getCourseScope(user, 'lessons')
  if (!scope) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }
  const submission = await Submission.findById(id)
  if (!submission) {
    return { error: NextResponse.json({ error: 'Submission not found.' }, { status: 404 }) }
  }
  if (!scopeAllows(scope, submission.course)) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }
  return { submission }
}

// PUT: Grade a submission
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase()
    const { id } = await params
    const loaded = await loadManageableSubmission(id)
    if (loaded.error) return loaded.error
    const submission = loaded.submission

    const body = await request.json()
    const { marksObtained, feedback, googleDriveLink } = body

    if (typeof marksObtained !== 'number' || !Number.isFinite(marksObtained)) {
      return NextResponse.json({ error: 'marksObtained (number) is required.' }, { status: 400 })
    }
    const maxMarks = submission.totalMarks || 100
    if (marksObtained < 0 || marksObtained > maxMarks) {
      return NextResponse.json(
        { error: `Marks must be between 0 and ${maxMarks}.` },
        { status: 400 },
      )
    }

    submission.marksObtained = marksObtained
    submission.feedback = feedback || ''
    if (googleDriveLink !== undefined) {
      submission.googleDriveLink = googleDriveLink
    }
    submission.status = 'graded'
    submission.gradedAt = new Date()

    await submission.save()

    return NextResponse.json({ success: true, submission })
  } catch (error: any) {
    console.error('PUT /api/admin/submissions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update submission grade.' }, { status: 500 })
  }
}

// DELETE: Delete a submission
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase()
    const { id } = await params
    const loaded = await loadManageableSubmission(id)
    if (loaded.error) return loaded.error
    await loaded.submission.deleteOne()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /api/admin/submissions/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete submission.' }, { status: 500 })
  }
}
