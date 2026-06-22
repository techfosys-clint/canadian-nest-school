import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Category } from '@/lib/db/models/Category'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import CategoryFormClient from '../../CategoryFormClient'

export const metadata = {
  title: 'Edit Category - Canadian Nest School Admin',
  description: 'Edit a course catalog category.',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditCategoryPage({ params }: Props) {
  await connectToDatabase()
  const { id } = await params

  // Session verification
  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value

  if (!payloadToken) {
    redirect('/login')
  }

  const decoded = verifyToken(payloadToken)
  if (!decoded || !decoded.id) {
    redirect('/login')
  }

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) {
    redirect('/login')
  }

  // Fetch category
  const catDoc = await Category.findById(id).lean()
  if (!catDoc) notFound()

  const serializedCategory = {
    id: catDoc._id.toString(),
    name: catDoc.name,
    slug: catDoc.slug,
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CategoryFormClient initialData={serializedCategory} />
    </div>
  )
}
