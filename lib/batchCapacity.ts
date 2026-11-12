import type { IBatch } from './db/models/Batch'

/**
 * A batch with maxStudents > 0 stops accepting new joins once it's full.
 * maxStudents = 0 means unlimited.
 */
export function isBatchAcceptingStudents(
  batch: Pick<IBatch, 'maxStudents' | 'students'>,
): boolean {
  if (!batch.maxStudents || batch.maxStudents <= 0) return true
  return (batch.students?.length || 0) < batch.maxStudents
}

/** True when now is within the admin-configured join window. */
export function isBatchJoinWindowOpen(
  batch: Pick<IBatch, 'joinOpensAt' | 'joinClosesAt'>,
  now: Date = new Date(),
): boolean {
  if (!batch.joinOpensAt || !batch.joinClosesAt) return false
  const t = now.getTime()
  return (
    t >= new Date(batch.joinOpensAt).getTime() &&
    t <= new Date(batch.joinClosesAt).getTime()
  )
}

/**
 * Student may select/join this batch at checkout when:
 * - join window is open
 * - seats available (capacity gate)
 * - batch is not completed
 */
export function canStudentJoinBatch(
  batch: Pick<
    IBatch,
    | 'maxStudents'
    | 'students'
    | 'joinOpensAt'
    | 'joinClosesAt'
    | 'status'
  >,
  now: Date = new Date(),
): boolean {
  if (batch.status === 'completed') return false
  return isBatchJoinWindowOpen(batch, now) && isBatchAcceptingStudents(batch)
}
