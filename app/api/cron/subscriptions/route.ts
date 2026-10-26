import { formatBdDate } from '@/lib/bdTime';
import { Course } from '@/lib/db/models/Course';
import { Enrollment } from '@/lib/db/models/Enrollment';
import { SmsReminderSettings } from '@/lib/db/models/SmsReminderSettings';
import { Student } from '@/lib/db/models/Student';
import { SubscriptionSmsLog } from '@/lib/db/models/SubscriptionSmsLog';
import { User } from '@/lib/db/models/User';
import { connectToDatabase } from '@/lib/db/mongodb';
import { sendSms } from '@/lib/sms';
import {
  addDays,
  bdStartOfToday,
  buildFeeReminderSms,
  daysBetweenBd,
  getSubscriptionAccessSnapshot,
} from '@/lib/subscriptions/billing';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAuthorizedCron(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;
  const authHeader = request.headers.get('authorization');
  return (
    authHeader === `Bearer ${cronSecret}` ||
    request.headers.get('x-cron-secret') === cronSecret
  );
}

/**
 * Daily job: send monthly-fee SMS reminders + auto-block overdue enrollments.
 * Secure with Authorization: Bearer $CRON_SECRET
 */
async function run(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  await connectToDatabase();

  const now = new Date();
  const todayStart = bdStartOfToday(now);

  // ── Auto-block ──────────────────────────────────────────────
  const monthlyEnrollments = await Enrollment.find({
    paymentStatus: 'completed',
    billingType: 'monthly',
    paidUntil: { $exists: true },
    accessStatus: { $ne: 'blocked' },
  })
    .select('_id course paidUntil accessStatus billingType paymentStatus')
    .lean();

  let blocked = 0;
  const courseCache = new Map<string, any>();

  for (const e of monthlyEnrollments as any[]) {
    const courseId = e.course?.toString?.() || String(e.course);
    let course = courseCache.get(courseId);
    if (!course) {
      course = await Course.findById(courseId)
        .select(
          'billingType noticeStartOffsetDays noticeEndOffsetDays blockOffsetDays title monthlyFee',
        )
        .lean();
      if (course) courseCache.set(courseId, course);
    }
    if (!course) continue;

    const snapshot = getSubscriptionAccessSnapshot(e, course, now);
    if (snapshot.isBlocked) {
      await Enrollment.updateOne(
        { _id: e._id },
        { $set: { accessStatus: 'blocked' } },
      );
      blocked += 1;
    }
  }

  // ── SMS reminders ───────────────────────────────────────────
  let settings = await SmsReminderSettings.findOne().lean();
  if (!settings) {
    const created = await SmsReminderSettings.create({});
    settings = created.toObject() as any;
  }

  let smsSent = 0;
  let smsSkipped = 0;

  if (settings?.enabled) {
    const rawOffsets = (settings.offsetDaysBeforeEnd || [5, 3, 1])
      .map((n: number) => Math.max(0, Number(n)))
      .filter((n: number) => Number.isFinite(n));
    const offsets = [...new Set<number>(rawOffsets)].sort((a, b) => b - a);

    const maxPerPeriod = Math.max(
      0,
      Number(settings.maxMessagesPerPeriod ?? 3),
    );

    const candidates = await Enrollment.find({
      paymentStatus: 'completed',
      billingType: 'monthly',
      paidUntil: { $exists: true },
      accessStatus: { $ne: 'blocked' },
    })
      .populate({
        path: 'course',
        select: 'title monthlyFee billingType',
      })
      .lean();

    for (const e of candidates as any[]) {
      const course = e.course;
      if (!course || !e.paidUntil) continue;

      const paidUntil = new Date(e.paidUntil);
      const daysUntil = daysBetweenBd(todayStart, paidUntil);

      // Match exact offset day (e.g. 5 days before end).
      if (!offsets.includes(daysUntil)) continue;

      const alreadyForPeriod = await SubscriptionSmsLog.countDocuments({
        enrollment: e._id,
        periodEnd: paidUntil,
      });
      if (alreadyForPeriod >= maxPerPeriod) {
        smsSkipped += 1;
        continue;
      }

      const alreadyThisOffset = await SubscriptionSmsLog.findOne({
        enrollment: e._id,
        periodEnd: paidUntil,
        offsetDays: daysUntil,
      }).lean();
      if (alreadyThisOffset) {
        smsSkipped += 1;
        continue;
      }

      const student: any =
        (await Student.findById(e.student).select('name phone').lean()) ||
        (await User.findById(e.student).select('name phone').lean());
      const phone = student?.phone;
      if (!phone) {
        smsSkipped += 1;
        continue;
      }

      const message = buildFeeReminderSms({
        studentName: student?.name || 'Student',
        courseTitle: course.title || 'your course',
        paidUntilLabel: formatBdDate(paidUntil),
        amount: Number(course.monthlyFee || 0),
      });

      const ok = await sendSms(phone, message);
      if (!ok) {
        smsSkipped += 1;
        continue;
      }

      try {
        await SubscriptionSmsLog.create({
          enrollment: e._id,
          periodEnd: paidUntil,
          offsetDays: daysUntil,
          phone,
          sentAt: new Date(),
        });
        smsSent += 1;
      } catch {
        // Unique index race — treat as already sent
        smsSkipped += 1;
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Subscription cron finished.',
    summary: {
      blocked,
      smsSent,
      smsSkipped,
      ranAt: now.toISOString(),
      // keep unused import referenced for clarity in future extensions
      nextWindowHint: addDays(todayStart, 1).toISOString(),
    },
  });
}

export async function GET(request: Request) {
  try {
    return await run(request);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cron failed.';
    console.error('Subscription cron error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    return await run(request);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cron failed.';
    console.error('Subscription cron error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
