import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { CertificateRequest } from '@/lib/db/models/CertificateRequest'
import { getCourseScope, getStaffUser, scopeAllows } from '@/lib/auth/staffScope'

/**
 * Admins, staff with the Certificates permission, and instructors of the
 * request's course may change it. Returns the request or an error response.
 */
async function loadManageableRequest(id: string) {
  const user = await getStaffUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) }
  }
  const scope = await getCourseScope(user, 'certificates')
  if (!scope) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }
  const req = await CertificateRequest.findById(id)
  if (!req) {
    return { error: NextResponse.json({ error: 'Certificate request not found.' }, { status: 404 }) }
  }
  if (!scopeAllows(scope, req.course)) {
    return { error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) }
  }
  return { req }
}

// PUT: Update a certificate request status, upload URL, notes
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    const loaded = await loadManageableRequest(id)
    if (loaded.error) return loaded.error
    const req = loaded.req

    const body = await request.json()
    const { status, certificateUrl, adminNotes } = body

    if (status) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 })
      }
      req.status = status
    }

    if (certificateUrl !== undefined) {
      req.certificateUrl = certificateUrl
    }

    if (adminNotes !== undefined) {
      req.adminNotes = adminNotes
    }

    await req.save()

    return NextResponse.json({
      success: true,
      message: 'Certificate request updated successfully.',
      request: {
        id: req._id.toString(),
        status: req.status,
        certificateUrl: req.certificateUrl || null,
        adminNotes: req.adminNotes || '',
      }
    })

  } catch (error: any) {
    console.error('PUT /api/admin/certificates/[id] error:', error)
    return NextResponse.json({ error: 'Failed to update certificate request.' }, { status: 500 })
  }
}

// DELETE a certificate request
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params
    const loaded = await loadManageableRequest(id)
    if (loaded.error) return loaded.error

    await loaded.req.deleteOne()

    return NextResponse.json({ success: true, message: 'Certificate request deleted successfully.' })

  } catch (error: any) {
    console.error('DELETE /api/admin/certificates/[id] error:', error)
    return NextResponse.json({ error: 'Failed to delete certificate request.' }, { status: 500 })
  }
}
