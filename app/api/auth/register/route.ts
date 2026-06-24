import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { Media } from '@/lib/db/models/Media'
import { OtpVerification } from '@/lib/db/models/OtpVerification'
import { hashPassword, verifyToken } from '@/lib/auth/auth'
import { rateLimit } from '@/lib/rateLimit'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    // Rate limiting — max 3 registration attempts per IP per hour
    const clientIP = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown'
    const { allowed, resetIn } = rateLimit(`reg_${clientIP}`, 3, 3600)

    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many registration attempts. Please try again in ${resetIn} seconds.`,
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

    const { name, email, password, phone, profilePic, role, permissions, designation } = body
    let targetRole = role || 'student'

    // 1. Basic validation
    if (!name || !password) {
      return NextResponse.json(
        { success: false, error: 'Name and password are required fields.' },
        { status: 400 }
      )
    }

    if (targetRole === 'student' && !phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required.' },
        { status: 400 }
      )
    }

    if (targetRole !== 'student' && !email) {
      return NextResponse.json(
        { success: false, error: 'Email is required.' },
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

    // 2. Check for duplicate email/phone across collections
    const emailLower = email ? email.toLowerCase() : undefined

    if (emailLower) {
      const existingStudent = await Student.findOne({ email: emailLower })
      const existingUser = await User.findOne({ email: emailLower })

      if (existingStudent || existingUser) {
        return NextResponse.json(
          { success: false, error: 'Email is already registered.' },
          { status: 400 }
        )
      }
    }

    if (targetRole === 'student') {
      const existingPhone = await Student.findOne({ phone })
      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: 'Phone number is already registered.' },
          { status: 400 }
        )
      }

      // 2b. Require a verified OTP for this phone number before registering
      const otpRecord = await OtpVerification.findOne({ phone })
      if (!otpRecord || !otpRecord.verified || otpRecord.expiresAt < new Date()) {
        return NextResponse.json(
          { success: false, error: 'Phone number is not verified. Please verify the OTP first.' },
          { status: 400 }
        )
      }
    }

    // 3. Role Security Verification
    const sensitiveRoles = ['admin', 'staff', 'instructor']

    if (sensitiveRoles.includes(targetRole)) {
      const adminCount = await User.countDocuments({ role: 'admin' })

      // If no admin exists in the system yet, allow creating the first admin
      if (adminCount > 0) {
        const adminSecretHeader = request.headers.get('x-admin-secret')
        const isSecretValid = adminSecretHeader && adminSecretHeader === process.env.ADMIN_REGISTRATION_SECRET

        if (!isSecretValid) {
          // Fallback: check if currently logged-in user is an Admin
          const cookieStore = await cookies()
          const token = cookieStore.get('payload-token')?.value
          const decoded = token ? verifyToken(token) : null
          const isCurrentAdmin = decoded && decoded.role === 'admin'

          if (!isCurrentAdmin) {
            return NextResponse.json(
              {
                success: false,
                error: 'Forbidden: You do not have permissions to register users with sensitive roles. Provide a valid x-admin-secret header or authenticate as Admin.',
              },
              { status: 403 }
            )
          }
        }
      }
    }


    // 4. Process profile picture if provided (either pre-existing ID string or base64 object)
    let profilePicId: string | undefined = undefined
    if (profilePic && typeof profilePic === 'string') {
      profilePicId = profilePic
    } else if (profilePic && typeof profilePic === 'object' && profilePic.base64) {
      try {
        const base64Data = profilePic.base64.split(';base64,').pop() || profilePic.base64
        const buffer = Buffer.from(base64Data, 'base64')
        const rawFileName = profilePic.name || `${emailLower.replace(/[@.]/g, '_')}_profile.jpg`
        
        // Ensure a unique filename using timestamp
        const ext = path.extname(rawFileName) || '.jpg'
        const base = path.basename(rawFileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_')
        const fileName = `${base}_${Date.now()}${ext}`
        const mimeType = profilePic.mimeType || 'image/jpeg'

        // Save file to public/media folder
        const mediaDir = path.join(process.cwd(), 'public', 'media')
        await fs.mkdir(mediaDir, { recursive: true })
        const filePath = path.join(mediaDir, fileName)
        await fs.writeFile(filePath, buffer)

        // Create Media Document in MongoDB
        const mediaDoc = await Media.create({
          filename: fileName,
          mimeType: mimeType,
          filesize: buffer.length,
          alt: `${name} Profile Picture`,
          url: `/media/${fileName}`,
        })
        profilePicId = mediaDoc._id.toString()
      } catch (uploadError) {
        console.error('Failed to upload profile picture:', uploadError)
      }
    }

    // 5. Hash Password & Register User in appropriate collection
    const hashedPassword = await hashPassword(password)
    let newUser: any

    if (targetRole === 'student') {
      newUser = await Student.create({
        name,
        email: emailLower,
        password: hashedPassword,
        phone,
        profilePic: profilePicId || undefined,
        status: 'active',
      })

      // OTP is single-use — remove it now that registration is complete
      await OtpVerification.deleteOne({ phone })
    } else {
      newUser = await User.create({
        name,
        email: emailLower,
        password: hashedPassword,
        phone: phone || undefined,
        profilePic: profilePicId || undefined,
        role: targetRole,
        designation: designation || undefined,
        permissions: permissions || [],
      })

      // Send onboarding email notification to new staff member
      try {
        const { sendStaffRegistrationEmail } = await import('@/lib/email')
        await sendStaffRegistrationEmail(emailLower, name, targetRole, password)
      } catch (emailErr) {
        console.error('Failed to send registration email to staff:', emailErr)
      }
    }

    // 6. Resolve profile pic URL for response
    let profilePicUrl = null
    if (profilePicId) {
      const media = await Media.findById(profilePicId)
      profilePicUrl = media?.url || null
    }

    const safeUser = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      profilePic: profilePicUrl,
      role: targetRole === 'student' ? 'student' : newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    }

    return NextResponse.json({
      success: true,
      message: `${targetRole.charAt(0).toUpperCase() + targetRole.slice(1)} registered successfully.`,
      user: safeUser,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Registration Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An error occurred during registration.',
      },
      { status: 400 }
    )
  }
}
