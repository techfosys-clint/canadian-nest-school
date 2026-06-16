import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Coupon } from '@/lib/db/models/Coupon'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import CouponFormClient from '../../CouponFormClient'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  await connectToDatabase()
  const coupon = await Coupon.findById(id).select('code').lean()
  if (!coupon) return { title: 'Edit Coupon - Tutor Space' }
  return {
    title: `Edit Coupon: ${coupon.code} - Tutor Space Admin`,
  }
}

export default async function EditCouponPage({ params }: Props) {
  const { id } = await params
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  // Fetch coupon
  const couponDoc = await Coupon.findById(id).lean() as any
  if (!couponDoc) notFound()

  // Format coupon data for the client component
  const serializedCoupon = {
    id: couponDoc._id.toString(),
    code: couponDoc.code,
    discountType: couponDoc.discountType,
    discountValue: couponDoc.discountValue,
    expirationDate: couponDoc.expirationDate ? couponDoc.expirationDate.toISOString().split('T')[0] : '',
    maxUses: couponDoc.maxUses !== undefined ? couponDoc.maxUses : '',
    isActive: couponDoc.isActive,
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CouponFormClient initialCoupon={serializedCoupon} />
    </div>
  )
}
