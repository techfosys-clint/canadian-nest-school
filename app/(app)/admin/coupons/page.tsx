import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Coupon } from '@/lib/db/models/Coupon'
import '@/lib/db/models/Course'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import CouponsPageClient from './CouponsPageClient'

export const metadata = {
  title: 'Coupons Management - Canadian Nest School Admin',
}

export const dynamic = 'force-dynamic'

export default async function CouponsPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const couponsDocs = await Coupon.find().populate('course', 'title').sort({ createdAt: -1 }).lean()
  const coupons = couponsDocs.map((c: any) => ({
    id: c._id.toString(),
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    expirationDate: c.expirationDate ? c.expirationDate.toISOString().split('T')[0] : '',
    isActive: c.isActive,
    maxUses: c.maxUses !== undefined ? c.maxUses : '',
    usedCount: c.usedCount || 0,
    courseTitle: c.course && typeof c.course === 'object' ? c.course.title : '',
  }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CouponsPageClient initialCoupons={coupons} />
    </div>
  )
}
