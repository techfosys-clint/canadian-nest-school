import { comparePasswords, hashPassword, verifyToken } from '@/lib/auth/auth'
import { User } from '@/lib/db/models/User'
import { Student } from '@/lib/db/models/Student'
import { isValidBdPhone, normalizePhone } from '@/lib/phone'
import { connectToDatabase } from '@/lib/db/mongodb'
import { rateLimit } from '@/lib/rateLimit'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getSessionUser() {
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) return null
  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) return null
  const user = await User.findById(decoded.id).populate('profilePic')
  if (!user || !['admin', 'staff', 'instructor'].includes(user.role)) {
    return null
  }
  return user
}

export async function GET() {
  try {
    await connectToDatabase()
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    let profilePicUrl: string | null = null
    let profilePicId: string | undefined
    if (user.profilePic && typeof user.profilePic === 'object') {
      profilePicUrl = (user.profilePic as any).url || null
      profilePicId = (user.profilePic as any)._id?.toString()
    } else if (user.profilePic) {
      profilePicId = user.profilePic.toString()
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        designation: user.designation || '',
        bio: user.bio || '',
        profilePicId,
        profilePicUrl,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load profile.' },
      { status: 500 },
    )
  }
}

/**
 * Self-service profile update for admin/staff/instructor.
 * Instructors can edit their public bio + designation shown on course pages.
 */
export async function PUT(request: Request) {
  try {
    await connectToDatabase()
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const { allowed, resetIn } = rateLimit(
      `my_profile_${user._id}`,
      20,
      600,
    )
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${resetIn}s.` },
        { status: 429 },
      )
    }

    const body = await request.json()
    const { name, phone, designation, bio, profilePic, password, currentPassword } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
    }

    // Phone: optional for staff, but if given it must be a valid BD mobile
    // number that no other account (staff or student) already uses.
    let nextPhone: string | undefined = user.phone
    if (phone !== undefined) {
      const trimmed = typeof phone === 'string' ? phone.trim() : ''
      if (!trimmed) {
        nextPhone = undefined
      } else {
        const normalized = normalizePhone(trimmed)
        if (!isValidBdPhone(normalized)) {
          return NextResponse.json(
            { error: 'Enter a valid mobile number (01XXXXXXXXX).' },
            { status: 400 },
          )
        }
        if (normalized !== (user.phone ? normalizePhone(user.phone) : '')) {
          const [userTaken, studentTaken] = await Promise.all([
            User.exists({ phone: normalized, _id: { $ne: user._id } }),
            Student.exists({ phone: normalized }),
          ])
          if (userTaken || studentTaken) {
            return NextResponse.json(
              { error: 'This mobile number is already used by another account.' },
              { status: 409 },
            )
          }
        }
        nextPhone = normalized
      }
    }

    // Changing the password requires the current one.
    if (password && String(password).trim()) {
      const ok =
        typeof currentPassword === 'string' &&
        currentPassword.length > 0 &&
        (await comparePasswords(currentPassword, user.password || ''))
      if (!ok) {
        return NextResponse.json(
          { error: 'Current password is incorrect.' },
          { status: 400 },
        )
      }
    }

    user.name = name.trim()
    user.phone = nextPhone
    if (designation !== undefined) {
      user.designation = designation || undefined
    }
    if (bio !== undefined) {
      user.bio = typeof bio === 'string' ? bio : ''
    }
    if (profilePic !== undefined) {
      user.profilePic = profilePic || undefined
    }

    if (password && String(password).trim()) {
      if (String(password).trim().length < 6) {
        return NextResponse.json(
          { error: 'Password must be at least 6 characters.' },
          { status: 400 },
        )
      }
      user.password = await hashPassword(String(password).trim())
    }

    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Profile updated.',
    })
  } catch (error: any) {
    console.error('My profile update error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile.' },
      { status: 500 },
    )
  }
}
