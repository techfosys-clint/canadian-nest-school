import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { Media } from '@/lib/db/models/Media'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Session state must never be cached — a cached "authenticated" response
// would let a logged-out browser keep seeing logged-in UI (and vice versa).
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' }

export async function GET() {
  try {
    await connectToDatabase()
    
    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let verifiedDoc: any = null
    let role = 'student'

    // 1. Try student token first
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded && decoded.id) {
        verifiedDoc = await Student.findById(decoded.id).populate('profilePic')
        role = 'student'
      }
    }

    // 2. Try staff/admin token if student not resolved
    if (!verifiedDoc && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded && decoded.id) {
        verifiedDoc = await User.findById(decoded.id).populate('profilePic')
        role = verifiedDoc?.role || 'staff'
      }
    }

    if (!verifiedDoc) {
      return NextResponse.json(
        { success: false, authenticated: false, error: 'Not authenticated.' },
        { status: 401, headers: NO_STORE }
      )
    }

    // 3. Resolve profile picture URL
    let profilePicUrl = null
    if (verifiedDoc.profilePic) {
      if (typeof verifiedDoc.profilePic === 'object') {
        profilePicUrl = verifiedDoc.profilePic.url || null
      }
    }

    const safeUser = {
      id: verifiedDoc._id.toString(),
      name: verifiedDoc.name,
      email: verifiedDoc.email,
      phone: verifiedDoc.phone,
      profilePic: profilePicUrl,
      role: role,
      permissions: verifiedDoc.permissions || [],
    }

    return NextResponse.json(
      {
        success: true,
        authenticated: true,
        user: safeUser,
      },
      { headers: NO_STORE }
    )

  } catch (error: any) {
    console.error('Auth Check Error:', error)
    return NextResponse.json(
      { success: false, authenticated: false, error: 'Failed to verify session.' },
      { status: 500 }
    )
  }
}
