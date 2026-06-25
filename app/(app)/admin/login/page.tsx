import React from 'react'
import { redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import { SetupToken } from '@/lib/db/models/SetupToken'
import LoginFormClient from './LoginFormClient'
import crypto from 'crypto'

export const metadata = {
  title: 'Administrative Sign In - Canadian Nest School Console',
  description: 'Access the Canadian Nest School administrative management console.',
}

export default async function AdminLoginPage() {
  await connectToDatabase()

  // 1. Check if any admin account exists. If not, redirect to setup wizard
  const adminExists = await User.findOne({ role: 'admin' }).lean()
  if (!adminExists) {
    // Reuse an existing setup token if one was already issued, so previously
    // shared links keep working across redeploys/restarts instead of being
    // silently invalidated by a fresh visit to this page.
    let setupToken = await SetupToken.findOne().sort({ createdAt: -1 })

    if (!setupToken) {
      const token = crypto.randomBytes(16).toString('hex')
      setupToken = await SetupToken.create({ token })
    }

    redirect(`/admin/super-admin/${setupToken.token}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12 text-slate-700 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-lg shadow-xl shadow-black/40 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-lg bg-[#E61C24]/15 items-center justify-center text-[#E61C24] font-bold text-lg border border-[#E61C24]/30">
            T
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Administrative Portal</h1>
          <p className="text-base font-semibold text-slate-500">
            Sign in to access courses, syllabus, and e-learning configurations.
          </p>
        </div>

        {/* Client component containing form handling */}
        <LoginFormClient />
      </div>
    </div>
  )
}
