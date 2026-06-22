import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Blog } from '@/lib/db/models/Blog'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import BlogFormClient from '../../BlogFormClient'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  await connectToDatabase()
  const blog = await Blog.findById(id).select('title').lean()
  if (!blog) return { title: 'Edit Blog - Canadian Nest School' }
  return {
    title: `Edit: ${blog.title} - Canadian Nest School Admin`,
  }
}

export default async function EditBlogPage({ params }: Props) {
  const { id } = await params
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  // Fetch blog post
  const blogDoc = await Blog.findById(id)
    .populate({ path: 'coverImage', select: 'url' })
    .lean() as any

  if (!blogDoc) notFound()

  // Serialize blog data
  const serializedBlog = {
    id: blogDoc._id.toString(),
    title: blogDoc.title,
    content: typeof blogDoc.content === 'string' ? blogDoc.content : JSON.stringify(blogDoc.content),
    coverImageUrl: blogDoc.coverImage?.url || '',
    tags: blogDoc.tags || [],
    seo: {
      metaTitle: blogDoc.seo?.metaTitle || '',
      metaDescription: blogDoc.seo?.metaDescription || '',
      keywords: blogDoc.seo?.keywords || '',
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <BlogFormClient initialBlog={serializedBlog} />
    </div>
  )
}
