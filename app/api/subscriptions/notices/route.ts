import { getLearningSession } from '@/lib/auth/learningSession'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getStudentSubscriptionNotices } from '@/lib/subscriptions/access'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectToDatabase()

    const userId = (await getLearningSession())?.account.id
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized.' },
        { status: 401 },
      )
    }

    try {
      const { healStudentPendingSubscriptionPayments } = await import(
        '@/lib/payments/healPendingSubscriptionPayments'
      )
      await healStudentPendingSubscriptionPayments(userId)
    } catch (healErr) {
      console.error('Subscription heal on notices failed:', healErr)
    }

    const notices = await getStudentSubscriptionNotices(userId)
    return NextResponse.json({ success: true, notices })
  } catch (error: any) {
    console.error('Subscription notices error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load subscription notices.' },
      { status: 500 },
    )
  }
}
