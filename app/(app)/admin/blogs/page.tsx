import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Blog } from '@/lib/db/models/Blog'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import BlogsPageClient from './BlogsPageClient'

export const metadata = {
  title: 'Blog Management - Canadian Nest School Admin',
}

export default async function BlogsPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const blogsDocs = await Blog.find()
    .populate({ path: 'author', select: 'name' })
    .populate({ path: 'coverImage', select: 'url alt' })
    .sort({ createdAt: -1 })
    .lean()

  const blogs = JSON.parse(JSON.stringify(
    (blogsDocs as any[]).map(b => ({
      id: b._id.toString(),
      title: b.title || '',
      content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content || {}),
      authorName: b.author?.name || 'Unknown',
      coverImageUrl: b.coverImage?.url || '',
      publishedDate: b.publishedDate ? b.publishedDate.toISOString() : '',
      tags: (b.tags || []).map((t: any) => ({
        tag: typeof t === 'string' ? t : (t?.tag || '')
      })),
    }))
  ))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <BlogsPageClient initialBlogs={blogs} />
    </div>
  )
}
