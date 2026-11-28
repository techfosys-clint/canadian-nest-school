import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { ContactMessage } from '@/lib/db/models/ContactMessage'
import { sendContactMessageEmail } from '@/lib/email'

const LIMITS = { name: 120, email: 200, subject: 200, message: 5000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Simple per-IP throttle so the form can't be used to flood the inbox.
// In-memory, so it resets on restart and is per server instance.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 5
const recent = new Map<string, number[]>()

function isThrottled(ip: string) {
  const now = Date.now()
  const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  if (hits.length >= MAX_PER_WINDOW) {
    recent.set(ip, hits)
    return true
  }
  hits.push(now)
  recent.set(ip, hits)
  return false
}

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Honeypot: real visitors never see or fill this field. Pretend success.
  if (clean(body.website, 200)) {
    return NextResponse.json({ success: true })
  }

  const name = clean(body.name, LIMITS.name)
  const email = clean(body.email, LIMITS.email).toLowerCase()
  const subject = clean(body.subject, LIMITS.subject)
  const message = clean(body.message, LIMITS.message)
  const locale = body.locale === 'en' ? 'en' : 'bn'

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  if (isThrottled(ip)) {
    return NextResponse.json(
      { error: 'Too many messages. Please try again later.' },
      { status: 429 },
    )
  }

  try {
    await connectToDatabase()
    const doc = await ContactMessage.create({ name, email, subject, message, locale })

    // The message is already saved, so an email failure doesn't fail the
    // request; the admin Messages page shows which ones weren't emailed.
    const emailSent = await sendContactMessageEmail({
      name,
      email,
      subject,
      message,
      receivedAt: doc.createdAt,
    })
    if (emailSent) {
      await ContactMessage.updateOne({ _id: doc._id }, { $set: { emailSent: true } })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to save contact message:', error)
    return NextResponse.json({ error: 'Failed to send message.' }, { status: 500 })
  }
}
