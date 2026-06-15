import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import RegisterFormClient from './RegisterFormClient'

import fs from 'fs/promises'
import path from 'path'

export const metadata = {
  title: 'Root Setup Wizard - Tutor Space Console',
  description: 'Setup the root administrator account for Tutor Space.',
}

type PageParams = { token: string }

type Props = {
  params: Promise<PageParams>
}

export default async function SuperAdminRegisterPage({ params }: Props) {
  // Turbopack Next.js 16 requirements: await params!
  const resolvedParams = await params
  const { token } = resolvedParams

  // 1. Read the active setup token from the local file system
  let activeToken = ''
  try {
    const tokenPath = path.join(process.cwd(), 'lib', 'db', 'setup-token.json')
    const fileData = await fs.readFile(tokenPath, 'utf-8')
    const parsed = JSON.parse(fileData)
    activeToken = parsed.token
  } catch (e) {
    // File not found or corrupt
  }

  // 2. If token is incorrect or empty, return 404 immediately so it is hidden
  if (!activeToken || token !== activeToken) {
    notFound()
  }

  await connectToDatabase()

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
          <div className="inline-flex h-12 w-12 rounded-lg bg-[#615fff]/15 items-center justify-center text-[#615fff] font-bold text-lg border border-[#615fff]/30">
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
