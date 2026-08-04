import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { hashPassword, signToken } from '@/lib/auth/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, password } = body

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    await connectToDatabase()

    let account: any = null
    let targetCollection: 'students' | 'users' = 'students'
    let role = 'student'

    // 1. Search for matching token in Student first
    account = await Student.findOne({
      resetPasswordToken: token,
      resetPasswordExpiration: { $gt: new Date() },
    }).populate('profilePic')

    if (account) {
      targetCollection = 'students'
      role = 'student'
    } else {
      // 2. Try User collection
      account = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpiration: { $gt: new Date() },
      }).populate('profilePic')
      
      if (account) {
        targetCollection = 'users'
        role = account.role || 'staff'
      }
    }

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Failed to reset password. The token may be invalid or expired.' },
        { status: 400 }
      )
    }

    // 3. Reset the password and clear fields
    account.password = await hashPassword(password)
    account.resetPasswordToken = undefined
    account.resetPasswordExpiration = undefined
    await account.save()

    // 4. Generate token
    const jwtToken = signToken({
      id: account._id.toString(),
      email: account.email,
      role: role,
    })

    // 5. Resolve profile picture URL
    let profilePicUrl = null
    if (account.profilePic) {
      if (typeof account.profilePic === 'object') {
        profilePicUrl = account.profilePic.url || null
      }
    }

    const safeUser = {
      id: account._id.toString(),
      name: account.name,
      email: account.email,
      phone: account.phone,
      profilePic: profilePicUrl,
      role: role,
    }

    const response = NextResponse.json({
      success: true,
      message: 'Password reset successfully and logged in.',
      user: safeUser,
      token: jwtToken,
    })

    // 6. Set standard JWT cookie
    const cookieOptions = {
      name: targetCollection === 'students' ? 'student-token' : 'payload-token',
      value: jwtToken,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 365, // 365 days, matching the JWT's own expiry
    }

    response.cookies.set(cookieOptions)

    return response

  } catch (error: any) {
    console.error('Reset Password Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred during password reset.',
      },
      { status: 400 }
    )
  }
}

