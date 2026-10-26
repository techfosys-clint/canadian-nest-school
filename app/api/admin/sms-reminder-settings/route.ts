import { getAuthorizedUser } from '@/lib/auth/auth'
import { SmsReminderSettings } from '@/lib/db/models/SmsReminderSettings'
import { connectToDatabase } from '@/lib/db/mongodb'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getOrCreateSettings() {
  let settings = await SmsReminderSettings.findOne()
  if (!settings) {
    settings = await SmsReminderSettings.create({})
  }
  return settings
}

export async function GET() {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'coupons')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const settings = await getOrCreateSettings()
    return NextResponse.json({
      success: true,
      settings: {
        id: settings._id.toString(),
        enabled: settings.enabled,
        offsetDaysBeforeEnd: settings.offsetDaysBeforeEnd,
        maxMessagesPerPeriod: settings.maxMessagesPerPeriod,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin'], 'coupons')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 401 })
    }

    const body = await request.json()
    const settings = await getOrCreateSettings()

    if (typeof body.enabled === 'boolean') {
      settings.enabled = body.enabled
    }
    if (Array.isArray(body.offsetDaysBeforeEnd)) {
      const parsed: number[] = body.offsetDaysBeforeEnd
        .map((n: unknown) => Math.max(0, Number(n)))
        .filter((n: number) => Number.isFinite(n))
      settings.offsetDaysBeforeEnd = Array.from(new Set(parsed)).sort(
        (a, b) => b - a,
      )
    }
    if (body.maxMessagesPerPeriod !== undefined) {
      settings.maxMessagesPerPeriod = Math.max(
        0,
        Number(body.maxMessagesPerPeriod) || 0,
      )
    }

    await settings.save()

    return NextResponse.json({
      success: true,
      settings: {
        id: settings._id.toString(),
        enabled: settings.enabled,
        offsetDaysBeforeEnd: settings.offsetDaysBeforeEnd,
        maxMessagesPerPeriod: settings.maxMessagesPerPeriod,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
