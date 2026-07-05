import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Product } from '@/lib/db/models/Product'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { revalidatePath } from 'next/cache'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'products')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await params
    const product = await Product.findById(id).lean()
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })

    return NextResponse.json({ success: true, product })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'products')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await params
    const product = await Product.findById(id)
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })

    const body = await request.json()
    const {
      title, slug, shortDescription, description, price, comparePrice,
      thumbnail, images, productType, author, sku, category, stock, status, seo,
    } = body

    if (slug && slug !== product.slug) {
      const existing = await Product.findOne({ slug, _id: { $ne: id } }).lean()
      if (existing) {
        return NextResponse.json({ error: 'A product with this slug already exists.' }, { status: 400 })
      }
      product.slug = slug
    }

    if (title !== undefined) product.title = title
    if (shortDescription !== undefined) product.shortDescription = shortDescription
    if (description !== undefined) product.description = description
    if (price !== undefined) product.price = price
    if (comparePrice !== undefined) product.comparePrice = comparePrice || undefined
    if (thumbnail !== undefined) product.thumbnail = thumbnail
    if (images !== undefined) product.images = images
    if (productType !== undefined) product.productType = productType
    if (author !== undefined) product.author = author
    if (sku !== undefined) product.sku = sku
    if (category !== undefined) product.category = category
    if (stock !== undefined) product.stock = stock === '' ? null : Number(stock)
    if (status !== undefined) product.status = status
    if (seo !== undefined) product.seo = seo

    await product.save()

    try {
      revalidatePath('/shop')
      revalidatePath(`/shop/${product.slug}`)
    } catch {}

    return NextResponse.json({ success: true, product })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'products')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await params
    const product = await Product.findById(id)
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })

    await Product.findByIdAndDelete(id)

    try {
      revalidatePath('/shop')
    } catch {}

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
