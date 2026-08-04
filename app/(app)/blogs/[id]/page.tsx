import React from 'react'
import { notFound } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Blog } from '@/lib/db/models/Blog'
import BlogDetailsClient from './BlogDetailsClient'

type Props = {
  params: Promise<{ id: string }>
}

// ─── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  await connectToDatabase()
  
  try {
    const blog = await Blog.findById(id).lean()
    if (!blog) return { title: 'Article Not Found - Canadian Nest School' }
    
    return {
      title: `${blog.title} - Canadian Nest School`,
      description: blog.seo?.metaDescription || `${blog.title} educational article on Canadian Nest School.`,
      keywords: blog.seo?.keywords || '',
    }
  } catch {
    return { title: 'Blog Details - Canadian Nest School' }
  }
}

// ─── Page Component ────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function BlogDetailsPage({ params }: Props) {
  const { id } = await params
  await connectToDatabase()

  let blogDoc: any = null
  try {
    blogDoc = await Blog.findById(id)
      .populate({
        path: 'author',
        select: 'name profilePic role',
        populate: { path: 'profilePic', select: 'url' }
      })
      .populate({ path: 'coverImage', select: 'url alt' })
      .lean()
  } catch {
    // Cast or query error leads to 404
  }

  if (!blogDoc) {
    notFound()
  }

  // Fetch 3 recommended/other articles
  const recommendedDocs = await Blog.find({ _id: { $ne: id } })
    .populate({ path: 'author', select: 'name' })
    .populate({ path: 'coverImage', select: 'url' })
    .sort({ publishedDate: -1, createdAt: -1 })
    .limit(3)
    .lean()

  // Clean serialization to satisfy Client Component constraints
  const blog = JSON.parse(JSON.stringify({
    id: blogDoc._id.toString(),
    title: blogDoc.title || '',
    content: blogDoc.content || '',
    publishedDate: blogDoc.publishedDate ? blogDoc.publishedDate.toISOString() : '',
    createdAt: blogDoc.createdAt ? blogDoc.createdAt.toISOString() : '',
    tags: (blogDoc.tags || []).map((t: any) => ({
      tag: typeof t === 'string' ? t : (t?.tag || '')
    })),
    coverImageUrl: blogDoc.coverImage?.url || '',
    authorName: blogDoc.author?.name || 'Canadian Nest School Expert',
    authorRole: blogDoc.author?.role || 'Staff',
    authorProfilePicUrl: blogDoc.author?.profilePic?.url || ''
  }))

  const recommendedBlogs = JSON.parse(JSON.stringify(
    (recommendedDocs as any[]).map(b => ({
      id: b._id.toString(),
      title: b.title || '',
      content: b.content || '',
      authorName: b.author?.name || 'Canadian Nest School Expert',
      coverImageUrl: b.coverImage?.url || '',
      publishedDate: b.publishedDate ? b.publishedDate.toISOString() : b.createdAt ? b.createdAt.toISOString() : '',
    }))
  ))

  return (
    <BlogDetailsClient blog={blog} recommendedBlogs={recommendedBlogs} />
  )
}
