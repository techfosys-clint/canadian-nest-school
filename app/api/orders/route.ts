import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Order } from '@/lib/db/models/Order'
import { Product } from '@/lib/db/models/Product'
import { Student } from '@/lib/db/models/Student'
import { User } from '@/lib/db/models/User'
import { verifyToken } from '@/lib/auth/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let userId: string | null = null
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded?.id) userId = decoded.id
    }
    if (!userId && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded?.id) userId = decoded.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 })
    }

    const orders = await Order.find({ student: userId, paymentStatus: 'completed' })
      .populate('items.product', 'title thumbnail slug')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      orders: orders.map((o: any) => ({
        id: o._id.toString(),
        items: o.items,
        totalAmount: o.totalAmount,
        orderStatus: o.orderStatus,
        shippingName: o.shippingName,
        shippingPhone: o.shippingPhone,
        shippingAddress: o.shippingAddress,
        createdAt: o.createdAt,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error: any) {
    console.error('API Orders GET Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch orders.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const cookieStore = await cookies()
    const studentToken = cookieStore.get('student-token')?.value
    const payloadToken = cookieStore.get('payload-token')?.value

    let userId: string | null = null
    if (studentToken) {
      const decoded = verifyToken(studentToken)
      if (decoded?.id) userId = decoded.id
    }
    if (!userId && payloadToken) {
      const decoded = verifyToken(payloadToken)
      if (decoded?.id) userId = decoded.id
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized. Please login to order.' }, { status: 401 })
    }

    const body = await request.json()
    const { productId, quantity, shippingName, shippingPhone, shippingAddress } = body

    if (!productId || !shippingName || !shippingPhone || !shippingAddress) {
      return NextResponse.json({ success: false, error: 'Product, name, phone, and shipping address are required.' }, { status: 400 })
    }

    const qty = Math.max(1, Number(quantity) || 1)

    const product = await Product.findById(productId)
    if (!product || product.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Product not found or unavailable.' }, { status: 404 })
    }

    if (product.stock !== null && product.stock !== undefined && product.stock < qty) {
      return NextResponse.json({ success: false, error: 'Not enough stock available for this item.' }, { status: 400 })
    }

    const totalAmount = product.price * qty

    let student = await Student.findById(userId).lean()
    if (!student) {
      student = await User.findById(userId).lean()
    }
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student account not found.' }, { status: 404 })
    }

    const merchantTransactionId = `ORD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    const pendingOrder = await Order.create({
      student: userId,
      items: [{ product: product._id, title: product.title, price: product.price, quantity: qty }],
      totalAmount,
      paymentStatus: 'pending',
      merchantTransactionId,
      shippingName,
      shippingPhone,
      shippingAddress,
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
      const { initializeEpsPayment } = await import('@/lib/eps')
      const { redirectUrl } = await initializeEpsPayment({
        merchantTransactionId,
        customerOrderId: pendingOrder._id.toString(),
        totalAmount,
        successUrl: `${appUrl}/api/payments/eps/order-callback?orderId=${pendingOrder._id}&outcome=success`,
        failUrl: `${appUrl}/api/payments/eps/order-callback?orderId=${pendingOrder._id}&outcome=fail`,
        cancelUrl: `${appUrl}/api/payments/eps/order-callback?orderId=${pendingOrder._id}&outcome=cancel`,
        customerName: shippingName,
        customerEmail: (student as any).email || 'no-reply@canadiannestschool.com',
        customerPhone: shippingPhone,
        productName: product.title,
      })

      return NextResponse.json({
        success: true,
        message: 'Redirecting to payment gateway.',
        redirectUrl,
        orderId: pendingOrder._id.toString(),
      })
    } catch (epsError: any) {
      console.error('EPS Order Initialize Error:', epsError)
      pendingOrder.paymentStatus = 'failed'
      await pendingOrder.save()
      return NextResponse.json(
        { success: false, error: epsError.message || 'Failed to start payment. Please try again.' }
      )
    }
  } catch (error: any) {
    console.error('API Orders POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to place order. Please try again.' }
    )
  }
}
