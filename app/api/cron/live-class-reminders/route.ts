import { NextResponse } from 'next/server'
import { checkAndSendLiveClassReminders } from '@/lib/email'

export const dynamic = 'force-dynamic'

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  return (
    authHeader === `Bearer ${cronSecret}` ||
    request.headers.get('x-cron-secret') === cronSecret
  )
}

/**
 * Live class reminders. Call every ~10 minutes from a scheduler (Coolify
 * scheduled task, cron-job.org, etc.) with `Authorization: Bearer $CRON_SECRET`.
 * Emails the instructors and enrolled students of classes starting within
 * the next 2 hours; each class is reminded only once.
 */
async function run(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const summary = await checkAndSendLiveClassReminders()
  return NextResponse.json({ success: true, ...summary })
}

export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}
