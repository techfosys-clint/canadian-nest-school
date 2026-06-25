import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import StaffEditFormClient from './StaffEditFormClient'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  await connectToDatabase()
  const member = await User.findById(id).select('name').lean()
  if (!member) return { title: 'Edit Faculty - Canadian Nest School' }
  return {
    title: `Edit: ${member.name} - Canadian Nest School Admin`,
  }
}

export const dynamic = 'force-dynamic'

export default async function EditStaffPage({ params }: Props) {
  const { id } = await params
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/admin/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id || decoded.role !== 'admin') redirect('/admin')

  // Fetch the faculty member
  const staffDoc = await User.findById(id)
    .populate('profilePic')
    .lean() as any

  if (!staffDoc) notFound()

  // Serialize staff data for the client form
  const serializedStaff = {
    id: staffDoc._id.toString(),
    name: staffDoc.name,
    email: staffDoc.email,
    phone: staffDoc.phone || '',
    role: staffDoc.role,
    designation: staffDoc.designation || '',
    permissions: staffDoc.permissions || [],
    profilePicId: staffDoc.profilePic?._id?.toString() || '',
    profilePicUrl: staffDoc.profilePic?.url || '',
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <StaffEditFormClient initialStaff={serializedStaff} />
    </div>
  )
}
