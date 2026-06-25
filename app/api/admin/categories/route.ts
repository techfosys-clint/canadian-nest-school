import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Category } from '@/lib/db/models/Category'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function GET() {
  try {
    await connectToDatabase()
    const categories = await Category.find().sort({ name: 1 }).lean()
    return NextResponse.json({ success: true, categories })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'categories')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const body = await request.json()
    
    // Support bulk insertion
    if (body.categories && Array.isArray(body.categories)) {
      const { categories } = body
      if (categories.length === 0) {
        return NextResponse.json({ error: 'No categories provided.' }, { status: 400 })
      }

      // Validate all items
      for (const cat of categories) {
        if (!cat.name?.trim() || !cat.slug?.trim()) {
          return NextResponse.json({ error: 'All categories must have a name and slug.' }, { status: 400 })
        }
      }

      // Check conflicts
      const names = categories.map((c: any) => c.name.trim())
      const slugs = categories.map((c: any) => c.slug.trim())

      const existing = await Category.find({
        $or: [
          { name: { $in: names } },
          { slug: { $in: slugs } }
        ]
      }).lean()

      if (existing.length > 0) {
        const conflictNames = existing.map((e: any) => e.name).join(', ')
        return NextResponse.json({ error: `Conflict: Some categories already exist: ${conflictNames}` }, { status: 400 })
      }

      const inserted = await Category.insertMany(
        categories.map((c: any) => ({
          name: c.name.trim(),
          slug: c.slug.trim()
        }))
      )

      return NextResponse.json({ success: true, categories: inserted }, { status: 201 })
    }

    // Support single insertion
    const { name, slug } = body
    if (!name || !slug) return NextResponse.json({ error: 'Name and slug are required.' }, { status: 400 })

    const existing = await Category.findOne({ $or: [{ name }, { slug }] }).lean()
    if (existing) return NextResponse.json({ error: 'Category name or slug already exists.' }, { status: 400 })

    const category = new Category({ name, slug })
    await category.save()
    return NextResponse.json({ success: true, category }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'categories')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id, name, slug } = await request.json()
    if (!id || !name || !slug) return NextResponse.json({ error: 'id, name and slug required.' }, { status: 400 })

    const category = await Category.findById(id)
    if (!category) return NextResponse.json({ error: 'Category not found.' }, { status: 404 })

    category.name = name
    category.slug = slug
    await category.save()
    return NextResponse.json({ success: true, category })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin'])
    if (!user) return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 })

    await Category.findByIdAndDelete(id)
    return NextResponse.json({ success: true, message: 'Category deleted.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
