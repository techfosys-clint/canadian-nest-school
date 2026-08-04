import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { Media } from '@/lib/db/models/Media'
import { verifyToken, comparePasswords, hashPassword } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import fs from 'fs/promises'
import path from 'path'

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
    const { name, phone, profilePic, currentPassword, newPassword } = body

    // 2. Basic validation
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required.' },
        { status: 400 }
      )
    }

    // 3. Process new profile picture upload if base64 is provided
    let profilePicId: string | undefined = undefined
    if (profilePic && typeof profilePic === 'object' && profilePic.base64) {
      try {
        const base64Data = profilePic.base64.split(';base64,').pop() || profilePic.base64
        const buffer = Buffer.from(base64Data, 'base64')
        const userEmail = authUser.email || 'student'
        const rawFileName = profilePic.name || `${userEmail.replace(/[@.]/g, '_')}_profile.jpg`
        
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
      } catch (uploadError: any) {
        console.error('Failed to upload profile picture:', uploadError)
        return NextResponse.json(
          { success: false, error: 'Failed to save profile picture: ' + uploadError.message },
          { status: 500 }
        )
      }
    }

    // 4. Update details
    authUser.name = name
    if (phone !== undefined) {
      authUser.phone = phone || undefined
    }

    if (profilePicId) {
      authUser.profilePic = profilePicId
    }

    // 5. Handle password updates
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

    // 6. Resolve updated profile pic URL cleanly
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

