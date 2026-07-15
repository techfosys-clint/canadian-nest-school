import React from 'react'
import { notFound } from 'next/navigation'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Product } from '@/lib/db/models/Product'
import ProductDetailClient from './ProductDetailClient'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  await connectToDatabase()
  const product = await Product.findOne({ slug, status: 'published' }).lean()
  if (!product) return { title: 'Product - Canadian Nest School' }
  return {
    title: `${(product as any).title} - Canadian Nest School Shop`,
    description: (product as any).shortDescription || `Buy ${(product as any).title} from Canadian Nest School.`,
  }
}

export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  await connectToDatabase()

  const product = await Product.findOne({ slug, status: 'published' }).lean() as any
  if (!product) notFound()

  const serializedProduct = {
    id: product._id.toString(),
    title: product.title,
    slug: product.slug,
    shortDescription: product.shortDescription || '',
    description: typeof product.description === 'string' ? product.description : '',
    price: product.price,
    comparePrice: product.comparePrice || null,
    thumbnail: product.thumbnail || '',
    images: product.images || [],
    productType: product.productType,
    author: product.author || '',
    sku: product.sku || '',
    category: product.category || '',
    inStock: product.stock === null || product.stock === undefined || product.stock > 0,
    stock: product.stock === undefined ? null : product.stock,
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 pt-28 pb-16">
      <ProductDetailClient product={serializedProduct} />
    </div>
  )
}
