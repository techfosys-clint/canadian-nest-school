import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { connectToDatabase } from '@/lib/db/mongodb'
import { normalizePhone } from '@/lib/phone'
import { rateLimit } from '@/lib/rateLimit'
import { NextResponse } from 'next/server'

/**
 * Returns only whether an account exists for a phone number.
 * Used by the mobile-first auth flow to branch login vs OTP registration.
 */
export async function POST(request: Request) {
  try {
    const clientIP =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const { allowed, resetIn } = rateLimit(`check_phone_${clientIP}`, 20, 60)

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many requests. Please try again in ${resetIn} seconds.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 },
      )
    }

    let body: { phone?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON format' },
        { status: 400 },
      )
    }

    const rawPhone = body.phone
    if (!rawPhone || typeof rawPhone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'A valid mobile number is required.' },
        { status: 400 },
      )
    }

    const phone = normalizePhone(rawPhone)
    if (!/^01\d{9}$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Enter a valid Bangladeshi mobile number (01XXXXXXXXX).',
        },
        { status: 400 },
      )
    }

    await connectToDatabase()

    const [student, staff] = await Promise.all([
      Student.exists({ phone }),
      User.exists({ phone }),
    ])

    return NextResponse.json({
      success: true,
      exists: Boolean(student || staff),
    })
  } catch (error: any) {
    console.error('Check phone error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unable to check this mobile number.',
      },
      { status: 500 },
    )
  }
}
