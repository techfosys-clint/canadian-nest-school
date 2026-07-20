import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getAuthorizedUser } from '@/lib/auth/auth'
import { reconcileEpsPayments } from '@/lib/payments/reconcileEpsPayments'

/**
 * Re-check pending/recently-failed EPS payments against the gateway and
 * complete any that actually succeeded. Call from:
 * - Admin UI ("Sync EPS payments")
 * - An external cron with Authorization: Bearer $CRON_SECRET
 */
async function runReconcile(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const isCron =
    !!cronSecret &&
    (authHeader === `Bearer ${cronSecret}` ||
      request.headers.get('x-cron-secret') === cronSecret)

  if (!isCron) {
    // Admins always; staff need orders permission (reconcile touches shop + courses).
    const user = await getAuthorizedUser(['admin', 'staff'], 'orders')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
  }

  await connectToDatabase()
  const summary = await reconcileEpsPayments()

  return NextResponse.json({
    success: true,
    message: 'EPS payment reconciliation finished.',
    summary,
  })
}

export async function GET(request: Request) {
  try {
    return await runReconcile(request)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reconcile failed.'
    console.error('EPS reconcile error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    return await runReconcile(request)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reconcile failed.'
    console.error('EPS reconcile error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
