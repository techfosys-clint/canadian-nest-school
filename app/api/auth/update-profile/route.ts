import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { Media } from '@/lib/db/models/Media'
import { verifyToken, comparePasswords, hashPassword } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { OtpVerification } from '@/lib/db/models/OtpVerification'
import { hashOtp } from '@/lib/sms'
import { isValidBdPhone, normalizePhone } from '@/lib/phone'
import { parseProfileImage } from '@/lib/profileImage'

/** Checks the SMS code sent to `phone` for a phone-number change. */
async function checkPhoneOtp(
  phone: string,
  otp: unknown,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (typeof otp !== 'string' || !otp.trim()) {
    return { ok: false, error: 'Enter the code sent to your new mobile number.', status: 400 }
  }

  const record = await OtpVerification.findOne({ phone })
  if (!record || record.expiresAt < new Date()) {
    return { ok: false, error: 'The code has expired. Please request a new one.', status: 400 }
  }
  if (record.attempts >= 5) {
    return { ok: false, error: 'Too many incorrect attempts. Please request a new code.', status: 429 }
  }

  const provided = Buffer.from(hashOtp(otp.trim()))
  const stored = Buffer.from(record.otpHash)
  const isMatch = provided.length === stored.length && crypto.timingSafeEqual(provided, stored)
  if (!isMatch) {
    record.attempts += 1
    await record.save()
    return { ok: false, error: 'Incorrect code. Please try again.', status: 400 }
  }

  return { ok: true }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    
    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let authUser: any = null
    let role = 'student'

    // 1. Authenticate user session using JWT tokens
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded && decoded.id) {
        authUser = await Student.findById(decoded.id).populate('profilePic')
        role = 'student'
      }
    }

    if (!authUser && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded && decoded.id) {
        authUser = await User.findById(decoded.id).populate('profilePic')
        role = authUser?.role || 'staff'
      }
    }

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in first.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, phone, phoneOtp, profilePic, currentPassword, newPassword } = body

    // 2. Basic validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required.' },
        { status: 400 }
      )
    }

    // 3. Phone change: a different number must be confirmed with the SMS code
    //    sent by /api/auth/change-phone/send-otp. Checked before anything is
    //    saved so a failed check leaves the profile untouched.
    let newPhone: string | undefined
    let usedOtpPhone: string | undefined
    if (phone !== undefined) {
      const currentPhone = authUser.phone ? normalizePhone(authUser.phone) : ''
      const requested = typeof phone === 'string' && phone.trim() ? normalizePhone(phone) : ''

      if (!requested) {
        if (role === 'student') {
          return NextResponse.json(
            { success: false, error: 'Mobile number is required.' },
            { status: 400 }
          )
        }
      } else if (requested !== currentPhone) {
        if (!isValidBdPhone(requested)) {
          return NextResponse.json(
            { success: false, error: 'Enter a valid mobile number (01XXXXXXXXX).' },
            { status: 400 }
          )
        }

        const [studentTaken, userTaken] = await Promise.all([
          Student.exists({ phone: requested, _id: { $ne: authUser._id } }),
          User.exists({ phone: requested, _id: { $ne: authUser._id } }),
        ])
        if (studentTaken || userTaken) {
          return NextResponse.json(
            { success: false, error: 'This mobile number is already used by another account.' },
            { status: 409 }
          )
        }

        const otpCheck = await checkPhoneOtp(requested, phoneOtp)
        if (!otpCheck.ok) {
          return NextResponse.json(
            { success: false, error: otpCheck.error, code: 'PHONE_OTP_REQUIRED' },
            { status: otpCheck.status }
          )
        }
        newPhone = requested
        usedOtpPhone = requested
      } else if (authUser.phone !== currentPhone) {
        // Same number, just stored in a non-standard format: normalize it.
        newPhone = currentPhone
      }
    }

    // 4. Process new profile picture upload if base64 is provided
    let profilePicId: string | undefined = undefined
    if (profilePic && typeof profilePic === 'object' && profilePic.base64) {
      // Type comes from the file's real bytes; the client's name/MIME is ignored.
      const parsed = parseProfileImage(profilePic.base64)
      if (!parsed.ok) {
        return NextResponse.json(
          { success: false, error: parsed.error },
          { status: 400 }
        )
      }

      try {
        const buffer = parsed.buffer
        const userEmail = authUser.email || 'student'
        const base = String(userEmail).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'student'
        const fileName = `${base}_profile_${Date.now()}${parsed.ext}`
        const mimeType = parsed.mimeType

        // R2/S3 when configured; local disk fallback on VPS (Coolify)
        const { uploadToStorage, isS3Configured } = await import(
          '@/lib/storage'
        )
        if (
          process.env.VERCEL &&
          !isS3Configured
        ) {
          return NextResponse.json(
            {
              success: false,
              error:
                'Photo storage is not configured. Add S3/R2 environment variables and redeploy.',
            },
            { status: 500 },
          )
        }

        const fileUrl = await uploadToStorage(
          buffer,
          fileName,
          'media',
          mimeType,
        )

        // Create Media Document in MongoDB
        const mediaDoc = await Media.create({
          filename: fileName,
          mimeType: mimeType,
          filesize: buffer.length,
          alt: `${name} Profile Picture`,
          url: fileUrl || `/media/${fileName}`,
        })
        profilePicId = mediaDoc._id.toString()
      } catch (uploadError: any) {
        console.error('Failed to upload profile picture:', uploadError)
        return NextResponse.json(
          { success: false, error: 'Failed to save profile picture: ' + uploadError.message },
          { status: 500 }
        )
      }
    }

    // 5. Update details
    authUser.name = name
    if (newPhone) {
      authUser.phone = newPhone
    }

    if (profilePicId) {
      authUser.profilePic = profilePicId
    }

    // 6. Handle password updates
    if (currentPassword && newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 6 characters long.' },
          { status: 400 }
        )
      }

      const isMatch = await comparePasswords(currentPassword, authUser.password || '')
      if (!isMatch) {
        return NextResponse.json(
          { success: false, error: 'Incorrect current password. Please try again.' },
          { status: 400 }
        )
      }

      authUser.password = await hashPassword(newPassword)
    }

    await authUser.save()

    // The code has done its job; don't let it be reused.
    if (usedOtpPhone) {
      await OtpVerification.deleteOne({ phone: usedOtpPhone })
    }

    // 7. Resolve updated profile pic URL cleanly
    let profilePicUrl = null
    if (authUser.profilePic) {
      const resolvedMedia = await Media.findById(authUser.profilePic)
      profilePicUrl = resolvedMedia?.url || null
    }

    const safeUser = {
      id: authUser._id.toString(),
      name: authUser.name,
      email: authUser.email,
      phone: authUser.phone,
      profilePic: profilePicUrl,
      role: role,
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully.',
      user: safeUser,
    })

  } catch (error: any) {
    console.error('Profile Update Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred during profile update.' },
      { status: 500 }
    )
  }
}

