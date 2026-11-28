import { parseDeliveryAddress, formatDeliveryAddress } from '@/lib/shippingAddress';
 
import { verifyToken } from '@/lib/auth/auth';
import { Order } from '@/lib/db/models/Order';
import { Product } from '@/lib/db/models/Product';
import { Student } from '@/lib/db/models/Student';
import { User } from '@/lib/db/models/User';
import { connectToDatabase } from '@/lib/db/mongodb';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type OrderLineInput = { productId: string; quantity: number };

async function resolveUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const studentToken = cookieStore.get('student-token')?.value;
  const payloadToken = cookieStore.get('payload-token')?.value;

  if (studentToken) {
    const decoded = verifyToken(studentToken);
    if (decoded?.id) return decoded.id;
  }
  if (payloadToken) {
    const decoded = verifyToken(payloadToken);
    if (decoded?.id) return decoded.id;
  }
  return null;
}

function normalizeOrderLines(body: any): OrderLineInput[] | null {
  if (Array.isArray(body.items) && body.items.length > 0) {
    return body.items.map((line: any) => ({
      productId: String(line.productId),
      quantity: Math.max(1, Number(line.quantity) || 1),
    }));
  }

  if (body.productId) {
    return [
      {
        productId: String(body.productId),
        quantity: Math.max(1, Number(body.quantity) || 1),
      },
    ];
  }

  return null;
}

export async function GET() {
  try {
    await connectToDatabase();

    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 },
      );
    }

    const orders = await Order.find({
      student: userId,
      paymentStatus: 'completed',
    })
      .populate('items.product', 'title thumbnail slug productType')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
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
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error: any) {
    console.error('API Orders GET Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch orders.' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const userId = await resolveUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please login to order.' },
        { status: 401 },
      );
    }

    // Orders belong to student accounts (see the enrollments route).
    if (!(await Student.exists({ _id: userId }))) {
      return NextResponse.json(
        { success: false, error: 'Please log in with a student account to buy. Admin and staff accounts cannot make purchases.', code: 'STUDENT_ACCOUNT_REQUIRED' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { shippingName, shippingPhone, shippingAddress } = body;
    const lines = normalizeOrderLines(body);

    if (!lines?.length || !shippingName || !shippingPhone) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Cart items, name, and phone are required.',
        },
        { status: 400 },
      );
    }

    const orderItems: {
      product: any;
      title: string;
      price: number;
      quantity: number;
    }[] = [];
    let totalAmount = 0;
    let needsShipping = false;

    for (const line of lines) {
      const product = await Product.findById(line.productId);
      if (!product || product.status !== 'published') {
        return NextResponse.json(
          {
            success: false,
            error: `"${line.productId}" is not available.`,
          },
          { status: 404 },
        );
      }

      if (product.productType === 'ebook') {
        if (line.quantity !== 1) return NextResponse.json({ success: false, error: 'Choose one copy of each digital eBook.' }, { status: 400 });
      } else {
        needsShipping = true;
      }

      if (
        product.productType !== 'ebook' &&
        product.stock !== null &&
        product.stock !== undefined &&
        product.stock < line.quantity
      ) {
        return NextResponse.json(
          {
            success: false,
            error: `Not enough stock for "${product.title}".`,
          },
          { status: 400 },
        );
      }

      orderItems.push({
        product: product._id,
        title: product.title,
        price: product.price,
        quantity: line.quantity,
      });
      totalAmount += product.price * line.quantity;
    }

    const deliveryAddress = body.deliveryAddress === undefined ? null : parseDeliveryAddress(body.deliveryAddress);
    if (needsShipping && body.deliveryAddress !== undefined && !deliveryAddress) {
      return NextResponse.json({ success: false, error: 'Enter a complete Bangladesh delivery address and a valid four-digit postal code if provided.' }, { status: 400 });
    }
    const message = body.deliveryMessage;
    if (needsShipping && message !== undefined && (typeof message !== 'string' || message.trim().length > 500)) {
      return NextResponse.json({ success: false, error: 'Enter a delivery message of up to 500 characters.' }, { status: 400 });
    }

    const resolvedAddress = deliveryAddress ? formatDeliveryAddress(deliveryAddress) : shippingAddress;

    if (needsShipping && (typeof resolvedAddress !== 'string' || !resolvedAddress.trim())) {
      return NextResponse.json({ success: false, error: 'Enter a delivery address.' }, { status: 400 });
    }

    let student = await Student.findById(userId).lean();
    if (!student) {
      student = await User.findById(userId).lean();
    }
    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student account not found.' },
        { status: 404 },
      );
    }

    const merchantTransactionId = `ORD${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const pendingOrder = await Order.create({
      student: userId,
      items: orderItems,
      totalAmount,
      paymentStatus: 'pending',
      merchantTransactionId,
      shippingName,
      shippingPhone,
      shippingAddress: needsShipping ? resolvedAddress : 'Digital delivery',
      deliveryMessage: needsShipping && typeof message === 'string' ? message.trim() || undefined : undefined,
      deliveryAddress: needsShipping ? deliveryAddress ?? undefined : undefined,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const productName =
      orderItems.length === 1
        ? orderItems[0].title
        : `${orderItems[0].title} + ${orderItems.length - 1} more`;

    try {
      const { initializeEpsPayment } = await import('@/lib/eps');
      const { redirectUrl } = await initializeEpsPayment({
        merchantTransactionId,
        customerOrderId: pendingOrder._id.toString(),
        totalAmount,
        // Complete payment on the API callback (no login required), then redirect
        // to thank-you. Relying on thank-you alone dropped paid orders when the
        // session cookie was lost after EPS.
        successUrl: `${appUrl}/api/payments/eps/order-callback?orderId=${pendingOrder._id}&outcome=success`,
        failUrl: `${appUrl}/api/payments/eps/order-callback?orderId=${pendingOrder._id}&outcome=fail`,
        cancelUrl: `${appUrl}/api/payments/eps/order-callback?orderId=${pendingOrder._id}&outcome=cancel`,
        customerName: shippingName,
        customerEmail:
          (student as any).email || 'no-reply@canadiannestschool.com',
        customerPhone: shippingPhone,
        productName,
      });

      return NextResponse.json({
        success: true,
        message: 'Redirecting to payment gateway.',
        redirectUrl,
        orderId: pendingOrder._id.toString(),
      });
    } catch (epsError: any) {
      console.error('EPS Order Initialize Error:', epsError);
      pendingOrder.paymentStatus = 'failed';
      await pendingOrder.save();
      return NextResponse.json({
        success: false,
        error: epsError.message || 'Failed to start payment. Please try again.',
      });
    }
  } catch (error: any) {
    console.error('API Orders POST Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to place order. Please try again.',
    });
  }
}
