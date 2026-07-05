import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Order } from '@/lib/db/models/Order'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'orders')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await params
    const order = await Order.findById(id)
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 })

    const { orderStatus } = await request.json()
    if (!['processing', 'shipped', 'delivered', 'cancelled'].includes(orderStatus)) {
      return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 })
    }

    order.orderStatus = orderStatus
    await order.save()

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
