import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { OtpVerification } from '@/lib/db/models/OtpVerification'
import { generateOtp, hashOtp, buildOtpMessage, sendSms, resendSms } from '@/lib/sms'
import { rateLimit } from '@/lib/rateLimit'
import { normalizePhone } from '@/lib/phone'

export async function POST(request: Request) {
  try {
    const { phone: rawPhone } = await request.json()

    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid phone number is required.' },
        { status: 400 }
      )
    }

    const phone = normalizePhone(rawPhone)

    const { allowed, resetIn } = rateLimit(`otp_${phone}`, 3, 600)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: `Too many OTP requests. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }

    await connectToDatabase()

    // We intentionally removed the existingStudent phone check here
    // to allow a single phone number to be used for multiple student accounts.

    const isResend = await OtpVerification.exists({ phone })

    const otp = generateOtp()
    const otpHash = hashOtp(otp)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await OtpVerification.findOneAndUpdate(
      { phone },
      { otpHash, attempts: 0, verified: false, expiresAt },
      { upsert: true }
    )

    const sent = isResend
      ? await resendSms(phone, buildOtpMessage(otp))
      : await sendSms(phone, buildOtpMessage(otp))
    if (!sent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send OTP. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully.' })
  } catch (error: any) {
    console.error('Send OTP Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred while sending OTP.' },
      { status: 400 }
    )
  }
}
