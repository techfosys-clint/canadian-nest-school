import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Blog } from '@/lib/db/models/Blog'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function GET() {
  try {
    await connectToDatabase()
    const blogs = await Blog.find()
      .populate({ path: 'author', select: 'name email' })
      .populate({ path: 'coverImage', select: 'url alt' })
      .sort({ createdAt: -1 })
      .lean()
    return NextResponse.json({ success: true, blogs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'blogs')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { title, content, tags, coverImage, publishedDate, seo } = await request.json()
    if (!title || !content) return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 })

    const blog = new Blog({
      title, content, author: user._id,
      tags: tags || [],
      coverImage: coverImage || undefined,
      publishedDate: publishedDate ? new Date(publishedDate) : new Date(),
      seo: seo || {},
    })
    await blog.save()
    return NextResponse.json({ success: true, blog }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'blogs')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id, title, content, tags, coverImage, publishedDate, seo } = await request.json()
    if (!id) return NextResponse.json({ error: 'Blog ID required.' }, { status: 400 })

    const blog = await Blog.findById(id)
    if (!blog) return NextResponse.json({ error: 'Blog not found.' }, { status: 404 })

    if (title) blog.title = title
    if (content) blog.content = content
    if (tags) blog.tags = tags
    if (coverImage !== undefined) blog.coverImage = coverImage
    if (publishedDate) blog.publishedDate = new Date(publishedDate)
    if (seo) blog.seo = seo
    await blog.save()

    return NextResponse.json({ success: true, blog })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'blogs')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await request.json()
    await Blog.findByIdAndDelete(id)
    return NextResponse.json({ success: true, message: 'Blog deleted.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
