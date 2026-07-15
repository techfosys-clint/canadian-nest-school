import React from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Order } from '@/lib/db/models/Order'
import '@/lib/db/models/Student'
import '@/lib/db/models/Product'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import OrdersPageClient from './OrdersPageClient'

export const metadata = {
  title: 'Shop Orders - Canadian Nest School Admin',
}

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  await connectToDatabase()

  const cookieStore = await cookies()
  const payloadToken = cookieStore.get('payload-token')?.value
  if (!payloadToken) redirect('/login')

  const decoded = verifyToken(payloadToken)
  if (!decoded?.id) redirect('/login')

  const sessionUser = await User.findById(decoded.id).lean()
  if (!sessionUser || !['admin', 'staff'].includes(sessionUser.role)) redirect('/login')

  const orderDocs = await Order.find({ paymentStatus: 'completed' })
    .populate('student', 'name email phone')
    .populate('items.product', 'title thumbnail slug')
    .sort({ createdAt: -1 })
    .lean()

  const orders = orderDocs.map((o: any) => ({
    id: o._id.toString(),
    studentName: o.student?.name || 'Unknown',
    studentEmail: o.student?.email || '',
    items: (o.items || []).map((i: any) => ({
      title: i.title,
      price: i.price,
      quantity: i.quantity,
    })),
    totalAmount: o.totalAmount,
    orderStatus: o.orderStatus,
    shippingName: o.shippingName,
    shippingPhone: o.shippingPhone,
    shippingAddress: o.shippingAddress,
    createdAt: o.createdAt ? o.createdAt.toISOString() : '',
  }))

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <OrdersPageClient initialOrders={orders} />
    </div>
  )
}
