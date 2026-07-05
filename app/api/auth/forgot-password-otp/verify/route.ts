import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { OtpVerification } from '@/lib/db/models/OtpVerification'
import { hashOtp } from '@/lib/sms'
import { normalizePhone } from '@/lib/phone'
import { hashPassword, signToken } from '@/lib/auth/auth'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { phone: rawPhone, otp, password } = await request.json()

    if (!rawPhone || typeof rawPhone !== 'string' || !otp || typeof otp !== 'string' || !password) {
      return NextResponse.json(
        { success: false, error: 'Phone number, OTP, and new password are required.' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      )
    }

    const phone = normalizePhone(rawPhone)

    await connectToDatabase()

    const record = await OtpVerification.findOne({ phone })

    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    if (record.attempts >= 5) {
      return NextResponse.json(
        { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 429 }
      )
    }

    const providedHash = Buffer.from(hashOtp(otp))
    const storedHash = Buffer.from(record.otpHash)
    const isMatch =
      providedHash.length === storedHash.length &&
      crypto.timingSafeEqual(providedHash, storedHash)

    if (!isMatch) {
      record.attempts += 1
      await record.save()
      return NextResponse.json(
        { success: false, error: 'Incorrect OTP.' },
        { status: 400 }
      )
    }

    const student = await Student.findOne({ phone }).populate('profilePic')
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Account not found.' },
        { status: 404 }
      )
    }

    // OTP is single-use — update the password and remove the record
    student.password = await hashPassword(password)
    await student.save()
    await OtpVerification.deleteOne({ phone })

    const jwtToken = signToken({
      id: student._id.toString(),
      email: student.email,
      role: 'student',
    })

    let profilePicUrl = null
    if (student.profilePic && typeof student.profilePic === 'object') {
      profilePicUrl = (student.profilePic as any).url || null
    }

    const response = NextResponse.json({
      success: true,
      message: 'Password reset successfully and logged in.',
      user: {
        id: student._id.toString(),
        name: student.name,
        email: student.email,
        phone: student.phone,
        profilePic: profilePicUrl,
        role: 'student',
      },
      token: jwtToken,
    })

    response.cookies.set({
      name: 'student-token',
      value: jwtToken,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 365 days, matching the JWT's own expiry
    })

    return response
  } catch (error: any) {
    console.error('Forgot Password OTP Verify Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred while resetting password.' },
      { status: 400 }
    )
  }
}
