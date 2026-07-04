import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { Course } from '@/lib/db/models/Course'
import { verifyToken } from '@/lib/auth/auth'
import CouponFormClient from '../CouponFormClient'

export const metadata = {
  title: 'Create Coupon - Canadian Nest School Admin',
}

export const dynamic = 'force-dynamic'

export default async function NewCouponPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const courseDocs = await Course.find().select('title').sort({ title: 1 }).lean() as any[]
  const courses = courseDocs.map((c) => ({ id: c._id.toString(), title: c.title }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CouponFormClient courses={courses} />
    </div>
  )
}
