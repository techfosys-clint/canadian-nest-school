import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { OtpVerification } from '@/lib/db/models/OtpVerification'
import { generateOtp, hashOtp, buildOtpMessage, sendSms, resendSms } from '@/lib/sms'
import { rateLimit } from '@/lib/rateLimit'
import { isValidBdPhone, normalizePhone } from '@/lib/phone'
import { getLearningSession } from '@/lib/auth/learningSession'

/**
 * Sends a verification code to a NEW phone number for a logged-in account.
 * The number only changes when /api/auth/update-profile receives that code.
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const session = await getLearningSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in first.' },
        { status: 401 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const rawPhone = typeof body?.phone === 'string' ? body.phone : ''
    const phone = normalizePhone(rawPhone)

    if (!isValidBdPhone(phone)) {
      return NextResponse.json(
        { success: false, error: 'Enter a valid mobile number (01XXXXXXXXX).' },
        { status: 400 },
      )
    }

    const current = session.account.phone ? normalizePhone(session.account.phone) : ''
    if (phone === current) {
      return NextResponse.json(
        { success: false, error: 'This is already your mobile number.' },
        { status: 400 },
      )
    }

    const accountId = session.account._id
    const [studentTaken, userTaken] = await Promise.all([
      Student.exists({ phone, _id: { $ne: accountId } }),
      User.exists({ phone, _id: { $ne: accountId } }),
    ])
    if (studentTaken || userTaken) {
      return NextResponse.json(
        { success: false, error: 'This mobile number is already used by another account.' },
        { status: 409 },
      )
    }

    const { allowed, resetIn } = rateLimit(`otp_${phone}`, 3, 600)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: `Too many code requests. Please try again in ${resetIn} seconds.` },
        { status: 429 },
      )
    }

    const isResend = await OtpVerification.exists({ phone })
    const otp = generateOtp()
    await OtpVerification.findOneAndUpdate(
      { phone },
      {
        otpHash: hashOtp(otp),
        attempts: 0,
        verified: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      { upsert: true },
    )

    const sent = isResend
      ? await resendSms(phone, buildOtpMessage(otp))
      : await sendSms(phone, buildOtpMessage(otp))
    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send the code. Please try again.' },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true, phone })
  } catch (error) {
    console.error('Change phone OTP error:', error)
    return NextResponse.json(
      { success: false, error: 'Could not send the code. Please try again.' },
      { status: 500 },
    )
  }
}
