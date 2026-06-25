import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'
import { rateLimit } from '@/lib/rateLimit'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params

    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing.' }, { status: 401 })
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid.' }, { status: 401 })
    }

    const user = await User.findById(decoded.id).lean()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only.' }, { status: 403 })
    }

    // Don't allow an admin to delete their own account
    if (user._id.toString() === id) {
      return NextResponse.json({ error: 'Forbidden: You cannot delete your own admin account.' }, { status: 400 })
    }

    await User.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: 'Staff member successfully deleted.',
    })
  } catch (error: any) {
    console.error('Delete Staff API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete staff member.' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const { id } = await params

    // 1. Session verification
    const cookieStore = await cookies()
    const payloadToken = cookieStore.get('payload-token')?.value

    if (!payloadToken) {
      return NextResponse.json({ error: 'Unauthorized: Session missing.' }, { status: 401 })
    }

    const decoded = verifyToken(payloadToken)
    if (!decoded || !decoded.id) {
      return NextResponse.json({ error: 'Unauthorized: Session invalid.' }, { status: 401 })
    }

    const currentUser = await User.findById(decoded.id).lean()
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only.' }, { status: 403 })
    }

    const { allowed, resetIn } = rateLimit(`staff_update_${currentUser._id}`, 20, 600)
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Please try again in ${resetIn} seconds.` },
        { status: 429 }
      )
    }

    // 2. Parse request body
    const body = await request.json()
    const { name, email, phone, role, permissions, profilePic, password, designation } = body

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Name, email, and role are required fields.' }, { status: 400 })
    }

    // 3. Find the user to edit
    const staffToEdit = await User.findById(id)
    if (!staffToEdit) {
      return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 })
    }

    // Check duplicate email
    const emailLower = email.toLowerCase()
    if (emailLower !== staffToEdit.email) {
      const emailExists = await User.findOne({ email: emailLower })
      if (emailExists) {
        return NextResponse.json({ error: 'Email is already taken by another account.' }, { status: 400 })
      }
    }

    // 4. Update fields
    staffToEdit.name = name
    staffToEdit.email = emailLower
    staffToEdit.phone = phone || undefined
    staffToEdit.role = role
    staffToEdit.permissions = role === 'admin' ? ['courses', 'lessons', 'reviews', 'categories', 'faqs', 'blogs', 'media'] : (permissions || [])
    staffToEdit.profilePic = profilePic || undefined
    staffToEdit.designation = designation || undefined

    if (password && password.trim().length >= 6) {
      const { hashPassword } = await import('@/lib/auth/auth')
      staffToEdit.password = await hashPassword(password)
    } else if (password && password.trim().length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 })
    }

    await staffToEdit.save()

    return NextResponse.json({
      success: true,
      message: 'Staff member successfully updated.',
      user: {
        id: staffToEdit._id.toString(),
        name: staffToEdit.name,
        email: staffToEdit.email,
        role: staffToEdit.role,
      }
    })

  } catch (error: any) {
    console.error('Update Staff API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update staff member.' }, { status: 500 })
  }
}
