import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { SetupToken } from '@/lib/db/models/SetupToken'
import RegisterFormClient from './RegisterFormClient'

export const metadata = {
  title: 'Root Setup Wizard - Canadian Nest School Console',
  description: 'Setup the root administrator account for Canadian Nest School.',
}

type PageParams = { token: string }

type Props = {
  params: Promise<PageParams>
}

export default async function SuperAdminRegisterPage({ params }: Props) {
  // Turbopack Next.js 16 requirements: await params!
  const resolvedParams = await params
  const { token } = resolvedParams

  await connectToDatabase()

  // 1. Look up the active setup token from MongoDB
  const setupToken = await SetupToken.findOne().sort({ createdAt: -1 }).lean()

  // 2. If token is incorrect or none exists, return 404 immediately so it is hidden
  if (!setupToken || token !== setupToken.token) {
    notFound()
  }

  // 3. Check if an admin account already exists
  const adminExists = await User.findOne({ role: 'admin' }).lean()

  // 4. If an admin exists, block access and redirect to login
  if (adminExists) {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12 text-slate-700 font-sans">
      <div className="w-full max-w-lg bg-white border border-slate-200 p-8 rounded-lg shadow-xl shadow-black/40 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-lg bg-[#E61C24]/15 items-center justify-center text-[#E61C24] font-bold text-lg border border-[#E61C24]/30">
            T
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">First-Time Setup Wizard</h1>
          <p className="text-base font-semibold text-slate-500">
            No administrator account detected. Configure the root administrator account to unlock the management console.
          </p>
        </div>

        {/* Client setup form */}
        <RegisterFormClient />
      </div>
    </div>
  )
}
