import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getLearningSession } from '@/lib/auth/learningSession'

export const dynamic = 'force-dynamic'

// Session state must never be cached — a cached "authenticated" response
// would let a logged-out browser keep seeing logged-in UI (and vice versa).
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' }

export async function GET() {
  try {
    await connectToDatabase()
    
    const session = await getLearningSession()
    if (!session) {
      return NextResponse.json(
        { success: false, authenticated: false, error: 'Not authenticated.' },
        { status: 401, headers: NO_STORE }
      )
    }

    const { role, account } = session
    const verifiedDoc = await account.populate('profilePic')
    let studentId: string | undefined
    if (role === 'student') {
      try {
        const { ensureStudentId } = await import('@/lib/students/studentId')
        studentId = await ensureStudentId(verifiedDoc)
      } catch (idErr) {
        console.error('ensureStudentId on /api/auth/me failed:', idErr)
        studentId = 'studentId' in verifiedDoc ? verifiedDoc.studentId : undefined
      }
    }

    // 3. Resolve profile picture URL
    let profilePicUrl = null
    if (verifiedDoc.profilePic) {
      if (typeof verifiedDoc.profilePic === 'object') {
        profilePicUrl = 'url' in verifiedDoc.profilePic ? verifiedDoc.profilePic.url || null : null
      }
    }

    const safeUser = {
      id: verifiedDoc._id.toString(),
      name: verifiedDoc.name,
      email: verifiedDoc.email,
      phone: verifiedDoc.phone,
      studentId,
      profilePic: profilePicUrl,
      role: role,
      permissions: 'permissions' in verifiedDoc ? verifiedDoc.permissions || [] : [],
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
