import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { Media } from '@/lib/db/models/Media'
import { comparePasswords, signToken } from '@/lib/auth/auth'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(request: Request) {
  try {
    // ═══════════════════════════════════════════════════════
    // Rate limiting — max 5 login attempts per IP per minute
    // ═══════════════════════════════════════════════════════
    const clientIP = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const { allowed, resetIn } = rateLimit(clientIP, 5, 60)

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please try again in ${resetIn} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 }
      )
    }

    const { email, password, portal } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email or Mobile Number and password are required.' },
        { status: 400 }
      )
    }

    const identifier = email.toLowerCase().trim()
    const query = {
      $or: [
        { email: identifier },
        { phone: identifier }
      ]
    }

    await connectToDatabase()

    let verifiedDoc: any = null
    let collectionSlug: 'students' | 'users' = 'users'
    let role = 'student'

    // The admin portal must never authenticate a student account — only
    // look in the staff/admin/instructor collection there, regardless of
    // whether a Student happens to share the same email/phone+password.
    if (portal !== 'admin') {
      const student = await Student.findOne(query).populate('profilePic')
      if (student) {
        const isMatch = await comparePasswords(password, student.password || '')
        if (isMatch) {
          verifiedDoc = student
          collectionSlug = 'students'
          role = 'student'
        }
      }
    }

    // If not found or password mismatch, try staff/admin
    if (!verifiedDoc) {
      const user = await User.findOne(query).populate('profilePic')
      if (user) {
        const isMatch = await comparePasswords(password, user.password || '')
        if (isMatch) {
          verifiedDoc = user
          collectionSlug = 'users'
          role = user.role || 'staff'
        }
      }
    }

    if (!verifiedDoc) {
      return NextResponse.json(
        { success: false, error: 'Authentication failed. Invalid email or password.' },
        { status: 401 }
      )
    }

    // 3. Generate token
    const token = signToken({
      id: verifiedDoc._id.toString(),
      email: verifiedDoc.email,
      role: role,
    })

    // 4. Resolve profile picture URL
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
    }

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      user: safeUser,
      token: token,
    })

    // Set standard JWT cookie
    const cookieOptions = {
      name: collectionSlug === 'students' ? 'student-token' : 'payload-token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7200, // 2 hours
    }

    response.cookies.set(cookieOptions)

    return response

  } catch (error: any) {
    console.error('Login Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Invalid email or password.',
      },
      { status: 401 }
    )
  }
}
