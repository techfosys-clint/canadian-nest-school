import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Category } from '@/lib/db/models/Category'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import CategoriesPageClient from './CategoriesPageClient'

export const metadata = {
  title: 'Categories Management - Tutor Space Admin',
}

export default async function CategoriesPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const cats = await Category.find().sort({ name: 1 }).lean()
  const categories = cats.map((c: any) => ({ id: c._id.toString(), name: c.name, slug: c.slug }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <CategoriesPageClient initialCategories={categories} />
    </div>
  )
}
