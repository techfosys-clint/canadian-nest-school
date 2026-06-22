import React from 'react'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Blog } from '@/lib/db/models/Blog'
import BlogsPageClient from './BlogsPageClient'

export const metadata = {
  title: 'Blog & Articles - Canadian Nest School',
  description: 'Explore professional guides, tech deep-dives, industry tutorials, and educational updates curated by our senior expert instructors.',
}

export default async function BlogsPage() {
  await connectToDatabase()

  // Fetch all blogs from the database
  const blogsDocs = await Blog.find()
    .populate({
      path: 'author',
      select: 'name profilePic',
      populate: { path: 'profilePic', select: 'url' }
    })
    .populate({ path: 'coverImage', select: 'url alt' })
    .sort({ publishedDate: -1, createdAt: -1 })
    .lean()

  // Clean serialization to satisfy Client Component constraints
  const blogs = JSON.parse(JSON.stringify(
    (blogsDocs as any[]).map(b => ({
      id: b._id.toString(),
      title: b.title || '',
      content: typeof b.content === 'string' ? b.content : JSON.stringify(b.content || {}),
      authorName: b.author?.name || 'Unknown Author',
      authorProfilePicUrl: b.author?.profilePic?.url || '',
      coverImageUrl: b.coverImage?.url || '',
      publishedDate: b.publishedDate ? b.publishedDate.toISOString() : b.createdAt ? b.createdAt.toISOString() : '',
      tags: (b.tags || []).map((t: any) => ({
        tag: typeof t === 'string' ? t : (t?.tag || '')
      })),
    }))
  ))

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#0A163A] font-sans relative overflow-hidden pt-20">
      {/* Render the dynamic Client Component with search and live filters */}
      <BlogsPageClient initialBlogs={blogs} />
    </div>
  )
}
