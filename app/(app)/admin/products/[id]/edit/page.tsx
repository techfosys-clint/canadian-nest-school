import React from 'react'
import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Product } from '@/lib/db/models/Product'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import ProductFormClient from '../../ProductFormClient'

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  await connectToDatabase()
  const product = await Product.findById(id).select('title').lean()
  if (!product) return { title: 'Edit Product - Canadian Nest School' }
  return {
    title: `Edit Product: ${(product as any).title} - Canadian Nest School Admin`,
  }
}

export const dynamic = 'force-dynamic'

export default async function EditProductPage({ params }: Props) {
  const { id } = await params
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const productDoc = await Product.findById(id).lean() as any
  if (!productDoc) notFound()

  const serializedProduct = {
    id: productDoc._id.toString(),
    title: productDoc.title,
    slug: productDoc.slug,
    shortDescription: productDoc.shortDescription || '',
    description: typeof productDoc.description === 'string' ? productDoc.description : '',
    price: productDoc.price,
    comparePrice: productDoc.comparePrice,
    thumbnail: productDoc.thumbnail || '',
    images: productDoc.images || [],
    productType: productDoc.productType,
    author: productDoc.author || '',
    sku: productDoc.sku || '',
    category: productDoc.category || '',
    stock: productDoc.stock === undefined ? null : productDoc.stock,
    status: productDoc.status,
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <ProductFormClient initialData={serializedProduct} />
    </div>
  )
}
