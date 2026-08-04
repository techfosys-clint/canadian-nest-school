import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { Student } from '@/lib/db/models/Student'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function GET(req: NextRequest) {
  try {
    const adminUser = await getAuthorizedUser(['admin'])
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await connectToDatabase()

    const users = await User.find({}).select('-password').populate('profilePic').lean()
    const students = await Student.find({}).select('-password').populate('profilePic').lean()

    const combined = [
      ...users.map((u: any) => ({
        ...u,
        type: 'user',
        _id: u._id.toString(),
        profilePic: u.profilePic?.url || null,
        // Ensure status defaults to active for legacy users
        status: u.status || 'active',
      })),
      ...students.map((s: any) => ({
        ...s,
        type: 'student',
        role: 'student', // Map role implicitly
        _id: s._id.toString(),
        profilePic: s.profilePic?.url || null,
      })),
    ].sort((a, b) => {
      // Sort by newest first
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateB - dateA
    })

    return NextResponse.json(combined)
  } catch (err: any) {
    console.error('Error fetching users db:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminUser = await getAuthorizedUser(['admin'])
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id, type, status } = await req.json()

    if (!id || !type || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await connectToDatabase()

    let updated
    if (type === 'student') {
      updated = await Student.findByIdAndUpdate(id, { status }, { returnDocument: 'after' }).select('-password')
    } else if (type === 'user') {
      // Prevent suspending super admin?
      const targetUser = await User.findById(id)
      if (targetUser && targetUser.isSuperAdmin && status === 'suspended') {
         return NextResponse.json({ error: 'Cannot suspend super admin account' }, { status: 403 })
      }
      updated = await User.findByIdAndUpdate(id, { status }, { returnDocument: 'after' }).select('-password')
    } else {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
    }

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, user: updated })
  } catch (err: any) {
    console.error('Error updating user status:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminUser = await getAuthorizedUser(['admin'])
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const type = url.searchParams.get('type')

    if (!id || !type) {
      return NextResponse.json({ error: 'Missing id or type' }, { status: 400 })
    }

    await connectToDatabase()

    if (type === 'student') {
      const deleted = await Student.findByIdAndDelete(id)
      if (!deleted) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    } else if (type === 'user') {
      const targetUser = await User.findById(id)
      if (targetUser && targetUser.isSuperAdmin) {
        return NextResponse.json({ error: 'Cannot delete super admin account' }, { status: 403 })
      }
      const deleted = await User.findByIdAndDelete(id)
      if (!deleted) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    } else {
      return NextResponse.json({ error: 'Invalid user type' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error deleting user:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
