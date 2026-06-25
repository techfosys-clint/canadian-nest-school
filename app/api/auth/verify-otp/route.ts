import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { OtpVerification } from '@/lib/db/models/OtpVerification'
import { hashOtp } from '@/lib/sms'
import { normalizePhone } from '@/lib/phone'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const { phone: rawPhone, otp } = await request.json()

    if (!rawPhone || typeof rawPhone !== 'string' || !otp || typeof otp !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number and OTP are required.' },
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

    record.verified = true
    await record.save()

    return NextResponse.json({ success: true, message: 'Phone number verified successfully.' })
  } catch (error: any) {
    console.error('Verify OTP Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred while verifying OTP.' },
      { status: 400 }
    )
  }
}
