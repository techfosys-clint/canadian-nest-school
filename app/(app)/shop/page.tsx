import { Product } from '@/lib/db/models/Product'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getLocale } from '@/lib/i18n/getLocale'
import { getMessages } from '@/lib/i18n/getMessages'
import ShopPageClient from './ShopPageClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const locale = await getLocale()
  const t = getMessages(locale).shop
  return {
    title: t.metaTitle,
    description: t.metaDescription,
  }
}

export default async function ShopPage() {
  await connectToDatabase()

  const productDocs = await Product.find({ status: 'published' })
    .sort({ createdAt: -1 })
    .lean()

  const products = productDocs.map((p: any) => ({
    id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    shortDescription: p.shortDescription || '',
    price: p.price,
    comparePrice: p.comparePrice || null,
    thumbnail: p.thumbnail || '',
    productType: p.productType,
    author: p.author || '',
    category: p.category || '',
    inStock: p.stock === null || p.stock === undefined || p.stock > 0,
  }))

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean)),
  ) as string[]

  return <ShopPageClient products={products} categories={categories} />
}
