import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Coupon } from '@/lib/db/models/Coupon'
import { releaseStalePendingCouponUses, isCouponExpired } from '@/lib/coupons'

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const { code, courseId } = await request.json()

    if (!code) {
      return NextResponse.json({ success: false, error: 'Coupon code is required.' }, { status: 400 })
    }

    const uppercaseCode = code.toUpperCase().trim()

    let coupon = await Coupon.findOne({ code: uppercaseCode })
    if (!coupon) {
      return NextResponse.json({ success: false, error: 'Invalid coupon code.' }, { status: 404 })
    }

    if (!coupon.isActive) {
      return NextResponse.json({ success: false, error: 'This coupon is no longer active.' }, { status: 400 })
    }

    if (isCouponExpired(coupon.expirationDate)) {
      return NextResponse.json({ success: false, error: 'This coupon has expired.' }, { status: 400 })
    }

    // Course-restricted coupon: only valid on its designated course
    if (coupon.course && (!courseId || coupon.course.toString() !== courseId.toString())) {
      return NextResponse.json({ success: false, error: 'This coupon is not valid for this course.' }, { status: 400 })
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      // Before declaring it exhausted, release any abandoned EPS sessions
      // (pending enrollments whose buyer never completed or cancelled
      // payment) that are still holding a usedCount slot.
      await releaseStalePendingCouponUses(uppercaseCode)
      coupon = await Coupon.findOne({ code: uppercaseCode })

      if (!coupon || (coupon.maxUses && coupon.usedCount >= coupon.maxUses)) {
        return NextResponse.json({ success: false, error: 'This coupon has reached its usage limit.' }, { status: 400 })
      }
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      }
    })
  } catch (error: any) {
    console.error('Coupon validation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to validate coupon.' }, { status: 500 })
  }
}
