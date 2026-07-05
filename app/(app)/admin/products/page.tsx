import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Product } from '@/lib/db/models/Product'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import ProductsPageClient from './ProductsPageClient'

export const metadata = {
  title: 'Shop Products - Canadian Nest School Admin',
}

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const productDocs = await Product.find().sort({ createdAt: -1 }).lean()
  const products = productDocs.map((p: any) => ({
    id: p._id.toString(),
    title: p.title,
    slug: p.slug,
    price: p.price,
    comparePrice: p.comparePrice,
    thumbnail: p.thumbnail || '',
    productType: p.productType,
    stock: p.stock === undefined ? null : p.stock,
    status: p.status,
  }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <ProductsPageClient initialProducts={products} />
    </div>
  )
}
