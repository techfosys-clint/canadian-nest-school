import React from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth/auth'
import StaffRegisterFormClient from '../StaffRegisterFormClient'

export const metadata = {
  title: 'Register Faculty - Canadian Nest School Admin',
  description: 'Create new administrator, staff, or instructor profiles.',
}

export default async function RegisterFacultyPage() {
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value

  if (!payloadToken) {
    redirect('/admin/login')
  }

  const decoded = verifyToken(payloadToken)
  if (!decoded || !decoded.id || decoded.role !== 'admin') {
    redirect('/admin')
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <StaffRegisterFormClient />
    </div>
  )
}
