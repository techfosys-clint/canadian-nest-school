/* eslint-disable @typescript-eslint/no-explicit-any */
import { verifyToken } from '@/lib/auth/auth'
import { Order } from '@/lib/db/models/Order'
import { Product } from '@/lib/db/models/Product'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { connectToDatabase } from '@/lib/db/mongodb'
import { completePaidOrder } from '@/lib/orders/completePaidOrder'
import mongoose from 'mongoose'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import OrderThankYouClient from './OrderThankYouClient'

export const metadata = {
  title: 'Order Confirmed - Canadian Nest Shop',
  description: 'Thank you for your purchase from Canadian Nest School.',
}

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ orderId?: string; outcome?: string }>
}

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const studentToken = cookieStore.get('student-token')?.value
  const payloadToken = cookieStore.get('payload-token')?.value

  if (studentToken) {
    const decoded = verifyToken(studentToken)
    if (decoded?.id) return decoded.id
  }
  if (payloadToken) {
    const decoded = verifyToken(payloadToken)
    if (decoded?.id) return decoded.id
  }
  return null
}

export default async function OrderThankYouPage({ searchParams }: Props) {
  const { orderId, outcome } = await searchParams

  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    redirect('/shop')
  }

  if (outcome === 'fail' || outcome === 'cancel') {
    redirect('/shop?order=failed')
  }

  const userId = await getUserId()
  if (!userId) {
    redirect(
      `/login?redirect=${encodeURIComponent(`/shop/order/thank-you?orderId=${orderId}`)}`,
    )
  }

  await connectToDatabase()

  const order = await Order.findOne({
    _id: orderId,
    student: userId,
  })

  if (!order) {
    notFound()
  }

  if (order.paymentStatus === 'pending') {
    const result = await completePaidOrder(order)
    if (result === 'failed') {
      redirect('/shop?order=failed')
    }
    if (result === 'pending') {
      redirect('/shop?order=error')
    }
  }

  if (order.paymentStatus === 'failed') {
    redirect('/shop?order=failed')
  }

  if (order.paymentStatus !== 'completed') {
    notFound()
  }

  const orderLean = order.toObject()

  const productIds = orderLean.items.map((item: any) => item.product)
  const products = await Product.find({ _id: { $in: productIds } })
    .select('thumbnail')
    .lean()
  const thumbnailByProductId = new Map(
    products.map((p: any) => [p._id.toString(), p.thumbnail || '']),
  )

  let customerName: string | undefined
  const student = await Student.findById(userId).select('name').lean()
  if (student) {
    customerName = student.name
  } else {
    const user = await User.findById(userId).select('name').lean()
    customerName = user?.name
  }

  const serializedOrder = {
    id: orderLean._id.toString(),
    items: orderLean.items.map((item: any) => ({
      title: item.title,
      price: item.price,
      quantity: item.quantity,
      thumbnail: thumbnailByProductId.get(item.product.toString()) || '',
    })),
    totalAmount: orderLean.totalAmount,
    shippingName: orderLean.shippingName,
    shippingPhone: orderLean.shippingPhone,
    shippingAddress: orderLean.shippingAddress,
    merchantTransactionId: orderLean.merchantTransactionId,
    createdAt: orderLean.createdAt.toISOString(),
  }

  return (
    <OrderThankYouClient order={serializedOrder} customerName={customerName} />
  )
}
