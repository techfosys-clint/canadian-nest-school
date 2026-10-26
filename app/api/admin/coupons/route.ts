import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Coupon } from '@/lib/db/models/Coupon'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function GET() {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'coupons')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const coupons = await Coupon.find().populate('course', 'title').sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, coupons })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'coupons')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const body = await request.json()
    const {
      code,
      kind,
      discountType,
      discountValue,
      expirationDate,
      maxUses,
      isActive,
      course,
      extensionDays,
      overrideFee,
    } = body

    const couponKind =
      kind === 'subscription_extension' ? 'subscription_extension' : 'discount'

    if (!code) {
      return NextResponse.json({ error: 'code is required.' }, { status: 400 })
    }

    if (couponKind === 'discount') {
      if (!discountType || discountValue === undefined) {
        return NextResponse.json(
          { error: 'code, discountType and discountValue are required.' },
          { status: 400 },
        )
      }
    }

    const uppercaseCode = code.toUpperCase().trim()

    // Check conflict
    const existing = await Coupon.findOne({ code: uppercaseCode }).lean()
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists.' }, { status: 400 })
    }

    const coupon = new Coupon({
      code: uppercaseCode,
      kind: couponKind,
      discountType: discountType || 'fixed',
      discountValue:
        couponKind === 'subscription_extension'
          ? Number(discountValue) || 0
          : discountValue,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      maxUses: maxUses ? parseInt(maxUses, 10) : undefined,
      isActive: isActive !== undefined ? isActive : true,
      course: course || null,
      extensionDays:
        couponKind === 'subscription_extension'
          ? Math.max(0, Number(extensionDays) || 0)
          : 0,
      overrideFee:
        couponKind === 'subscription_extension' &&
        overrideFee !== undefined &&
        overrideFee !== null &&
        overrideFee !== ''
          ? Number(overrideFee)
          : undefined,
    })

    await coupon.save()
    return NextResponse.json({ success: true, coupon }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'coupons')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const body = await request.json()
    const {
      id,
      kind,
      discountType,
      discountValue,
      expirationDate,
      maxUses,
      isActive,
      course,
      extensionDays,
      overrideFee,
    } = body

    if (!id) {
      return NextResponse.json({ error: 'Coupon id is required.' }, { status: 400 })
    }

    const coupon = await Coupon.findById(id)
    if (!coupon) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 })
    }

    if (kind !== undefined) {
      coupon.kind =
        kind === 'subscription_extension' ? 'subscription_extension' : 'discount'
    }
    if (discountType !== undefined) coupon.discountType = discountType
    if (discountValue !== undefined) coupon.discountValue = discountValue
    if (expirationDate !== undefined) coupon.expirationDate = expirationDate ? new Date(expirationDate) : undefined
    if (maxUses !== undefined) coupon.maxUses = maxUses ? parseInt(maxUses, 10) : undefined
    if (isActive !== undefined) coupon.isActive = isActive
    if (course !== undefined) coupon.course = course || null
    if (extensionDays !== undefined) {
      coupon.extensionDays = Math.max(0, Number(extensionDays) || 0)
    }
    if (overrideFee !== undefined) {
      coupon.overrideFee =
        overrideFee === null || overrideFee === ''
          ? undefined
          : Number(overrideFee)
    }

    await coupon.save()
    return NextResponse.json({ success: true, coupon })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin'])
    if (!user) return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required.' }, { status: 400 })

    await Coupon.findByIdAndDelete(id)
    return NextResponse.json({ success: true, message: 'Coupon deleted successfully.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
