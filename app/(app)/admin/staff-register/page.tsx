import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth/auth'
import { FiUserPlus } from 'react-icons/fi'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import StaffListPageClient from './StaffListPageClient'

export const metadata = {
  title: 'Staff Registry - Canadian Nest School Admin',
  description: 'Register and manage administrative, teaching, and support accounts.',
}

export const dynamic = 'force-dynamic'

export default async function StaffRegisterPage() {
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value

  if (!payloadToken) {
    redirect('/admin/login')
  }

  const decoded = verifyToken(payloadToken)
  if (!decoded || !decoded.id || decoded.role !== 'admin') {
    // Only Root Admin is allowed to register new staff accounts
    redirect('/admin')
  }

  await connectToDatabase()
  const staffDocs = await User.find({})
    .populate('profilePic')
    .sort({ createdAt: -1 })
    .lean()

  // Serialize MongoDB documents for client component
  const staff = staffDocs.map((member: any) => ({
    id: member._id.toString(),
    name: member.name,
    email: member.email,
    phone: member.phone || '',
    role: member.role,
    designation: member.designation || '',
    permissions: member.permissions || [],
    profilePic: member.profilePic ? { id: member.profilePic._id.toString(), url: member.profilePic.url } : undefined,
    createdAt: member.createdAt ? new Date(member.createdAt).toISOString() : '',
  }))

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <FiUserPlus className="text-[#E61C24] h-6 w-6" />
            Staff & Faculty Registry
          </h1>
          <p className="text-base font-semibold text-slate-500 mt-1">
            Register and manage administrative, teaching, and support accounts.
          </p>
        </div>
      </div>

      {/* Render the Client-Side Staff List */}
      <StaffListPageClient initialStaff={staff} />
    </div>
  )
}
