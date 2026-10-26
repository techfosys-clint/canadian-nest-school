import { verifyToken } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getStudentSubscriptionNotices } from '@/lib/subscriptions/access'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
