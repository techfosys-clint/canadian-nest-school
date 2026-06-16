import React from 'react'
import { redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { User } from '@/lib/db/models/User'
import LoginFormClient from './LoginFormClient'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

export const metadata = {
  title: 'Administrative Sign In - Tutor Space Console',
  description: 'Access the Tutor Space administrative management console.',
}

export default async function AdminLoginPage() {
  await connectToDatabase()

  // 1. Check if any admin account exists. If not, redirect to setup wizard
  const adminExists = await User.findOne({ role: 'admin' }).lean()
  if (!adminExists) {
    // Generate a secure random 32-character hex token on the fly
    const token = crypto.randomBytes(16).toString('hex')

    // Write token to workspace-level temporary file
    const tokenPath = path.join(process.cwd(), 'lib', 'db', 'setup-token.json')
    await fs.mkdir(path.dirname(tokenPath), { recursive: true })
    await fs.writeFile(tokenPath, JSON.stringify({ token, createdAt: Date.now() }))

    redirect(`/admin/super-admin/${token}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-12 text-slate-700 font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 p-8 rounded-lg shadow-xl shadow-black/40 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-lg bg-[#615fff]/15 items-center justify-center text-[#615fff] font-bold text-lg border border-[#615fff]/30">
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
