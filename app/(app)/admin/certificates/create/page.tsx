import React from 'react'
import { redirect } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import { getAuthorizedUser } from '@/lib/auth/auth'
import CreateCertificateClient from './CreateCertificateClient'

export const metadata = {
  title: 'Create Certificate - Canadian Nest School Admin',
  description: 'Generate a completion certificate PDF for offline students.',
}

export const dynamic = 'force-dynamic'

export default async function CreateCertificatePage() {
  await connectToDatabase()

  const user = await getAuthorizedUser(['admin', 'staff'], 'certificates')
  if (!user) redirect('/login')

  const courseDocs = await Course.find()
    .select('title level summary')
    .sort({ title: 1 })
    .lean()

  const courses = courseDocs.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    level: c.level || 'all',
    summary: c.summary || '',
  }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CreateCertificateClient courses={courses} />
    </div>
  )
}
