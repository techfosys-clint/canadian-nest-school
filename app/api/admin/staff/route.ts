import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    await connectToDatabase()

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
    if (!user || !['admin', 'staff', 'instructor'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    // Retrieve all faculty & staff members (roles: admin, staff, instructor)
    const staff = await User.find({
      role: { $in: ['admin', 'staff', 'instructor'] }
    }).select('name email role profilePic').sort({ name: 1 }).lean()

    return NextResponse.json({
      success: true,
      staff: staff.map(u => ({
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        profilePic: u.profilePic
      }))
    })

  } catch (error: any) {
    console.error('GET Staff API Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch staff.' }, { status: 500 })
  }
}
