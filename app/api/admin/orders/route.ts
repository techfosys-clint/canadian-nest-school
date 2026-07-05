import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Order } from '@/lib/db/models/Order'
import '@/lib/db/models/Student'
import '@/lib/db/models/Product'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function GET() {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'orders')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const orders = await Order.find({ paymentStatus: 'completed' })
      .populate('student', 'name email phone')
      .populate('items.product', 'title thumbnail slug')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ success: true, orders })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
