import { BD_TIME_ZONE } from '@/lib/bdTime'
import { Counter } from '@/lib/db/models/Counter'
import { Student } from '@/lib/db/models/Student'

/** Bangladesh calendar year for CNS-YYYY-##### prefixes. */
export function bdCalendarYear(date: Date = new Date()): number {
  const y = date.toLocaleDateString('en-CA', { timeZone: BD_TIME_ZONE }).slice(0, 4)
  return Number(y) || date.getUTCFullYear()
}

function formatStudentId(year: number, seq: number): string {
  return `CNS-${year}-${String(seq).padStart(4, '0')}`
}

function counterKey(year: number): string {
  return `student_roll_${year}`
}

/**
 * Atomically allocates the next lifelong roll number for a year.
 * Format: CNS-YYYY-0001
 */
export async function allocateStudentId(
  year: number = bdCalendarYear(),
): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    counterKey(year),
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  const seq = Math.max(1, Number(counter?.seq || 1))
  return formatStudentId(year, seq)
}

/**
 * Ensures a student document has a permanent studentId.
 * Never regenerates an existing ID.
 */
export async function ensureStudentId(
  student: { _id: any; studentId?: string | null; createdAt?: Date },
): Promise<string> {
  if (student.studentId) return student.studentId

  const year = bdCalendarYear(
    student.createdAt ? new Date(student.createdAt) : new Date(),
  )

  // Claim only if still empty (race-safe).
  for (let attempt = 0; attempt < 5; attempt++) {
    const studentId = await allocateStudentId(year)
    const updated = await Student.findOneAndUpdate(
      {
        _id: student._id,
        $or: [{ studentId: { $exists: false } }, { studentId: null }, { studentId: '' }],
      },
      { $set: { studentId } },
      { new: true },
    ).select('studentId')

    if (updated?.studentId) {
      student.studentId = updated.studentId
      return updated.studentId
    }

    const fresh = await Student.findById(student._id).select('studentId').lean()
    if (fresh?.studentId) {
      student.studentId = fresh.studentId
      return fresh.studentId
    }
  }

  throw new Error('Failed to allocate permanent student ID.')
}

/**
 * Backfills studentId for every student missing one (oldest first).
 * Safe to re-run. Syncs year counters to at least the highest used seq.
 */
export async function backfillStudentIds(): Promise<{
  assigned: number
  skipped: number
}> {
  // Align counters with any IDs already present.
  const withIds = await Student.find({
    studentId: { $exists: true, $nin: [null, ''] },
  })
    .select('studentId')
    .lean()

  const maxByYear = new Map<number, number>()
  for (const s of withIds as any[]) {
    const match = String(s.studentId || '').match(/^CNS-(\d{4})-(\d+)$/i)
    if (!match) continue
    const year = Number(match[1])
    const seq = Number(match[2])
    if (!Number.isFinite(year) || !Number.isFinite(seq)) continue
    maxByYear.set(year, Math.max(maxByYear.get(year) || 0, seq))
  }

  for (const [year, maxSeq] of maxByYear) {
    const key = counterKey(year)
    const existing = await Counter.findById(key).lean()
    const current = Number(existing?.seq || 0)
    if (current < maxSeq) {
      await Counter.findByIdAndUpdate(
        key,
        { $set: { seq: maxSeq } },
        { upsert: true },
      )
    }
  }

  const missing = await Student.find({
    $or: [{ studentId: { $exists: false } }, { studentId: null }, { studentId: '' }],
  })
    .sort({ createdAt: 1 })
    .select('_id createdAt studentId')

  let assigned = 0
  for (const student of missing) {
    await ensureStudentId(student)
    assigned += 1
  }

  return { assigned, skipped: withIds.length }
}
