import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { Student } from '@/lib/db/models/Student'
import { Enrollment } from '@/lib/db/models/Enrollment'
import '@/lib/db/models/Course'
import '@/lib/db/models/Media'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAuthorizedUser(['admin'])
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await connectToDatabase()

    const { id } = await params
    const url = new URL(req.url)
    const type = url.searchParams.get('type') // 'student' | 'user'

    // Resolve the account from whichever collection it lives in. If `type`
    // isn't provided (e.g. someone opens the URL directly), fall back to
    // trying both so the page still works.
    let account: any = null
    let resolvedType: 'student' | 'user' | null = null

    if (type === 'student') {
      account = await Student.findById(id).select('-password').populate('profilePic').lean()
      resolvedType = 'student'
    } else if (type === 'user') {
      account = await User.findById(id).select('-password').populate('profilePic').lean()
      resolvedType = 'user'
    } else {
      account = await Student.findById(id).select('-password').populate('profilePic').lean()
      if (account) {
        resolvedType = 'student'
      } else {
        account = await User.findById(id).select('-password').populate('profilePic').lean()
        if (account) resolvedType = 'user'
      }
    }

    if (!account || !resolvedType) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const role = resolvedType === 'student' ? 'student' : (account.role || 'staff')

    // Enrollments only apply to student accounts (the buyers).
    let enrollments: any[] = []
    if (resolvedType === 'student') {
      const docs = await Enrollment.find({ student: id })
        .populate({ path: 'course', select: 'title slug price thumbnail' })
        .sort({ createdAt: -1 })
        .lean()

      enrollments = docs.map((e: any) => ({
        id: e._id.toString(),
        courseTitle: e.course?.title || 'Deleted course',
        courseSlug: e.course?.slug || '',
        pricePaid: e.pricePaid ?? 0,
        paymentStatus: e.paymentStatus,
        paymentReference: e.paymentReference || e.merchantTransactionId || '',
        couponCode: e.couponCode || '',
        createdAt: e.createdAt ? e.createdAt.toISOString() : '',
      }))
    }

    const detail = {
      id: account._id.toString(),
      type: resolvedType,
      role,
      name: account.name || '',
      email: account.email || '',
      phone: account.phone || '',
      profilePic: account.profilePic?.url || null,
      status: account.status || 'active',
      designation: account.designation || '',
      permissions: account.permissions || [],
      isSuperAdmin: !!account.isSuperAdmin,
      createdAt: account.createdAt ? account.createdAt.toISOString() : '',
      updatedAt: account.updatedAt ? account.updatedAt.toISOString() : '',
      enrollments,
    }

    return NextResponse.json({ success: true, user: detail })
  } catch (err: any) {
    console.error('Error fetching user detail:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
