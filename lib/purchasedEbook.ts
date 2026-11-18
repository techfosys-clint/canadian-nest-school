import { getLearningSession } from '@/lib/auth/learningSession'
import { Order } from '@/lib/db/models/Order'
import { Product } from '@/lib/db/models/Product'
import { connectToDatabase } from '@/lib/db/mongodb'
import { isValidObjectId } from 'mongoose'

export async function getPurchasedEbook(id: string) {
  if (!isValidObjectId(id)) return null
  await connectToDatabase()
  const session = await getLearningSession()
  if (!session) return null
  const order = await Order.exists({
    student: session.account.id,
    'items.product': id,
    paymentStatus: 'completed',
    orderStatus: { $ne: 'cancelled' },
  })
  if (!order) return null
  const ebook = await Product.findOne({ _id: id, productType: 'ebook' }).select('title +ebookPages').lean()
  return ebook ? { ...ebook, orderId: String(order._id) } : null
}
