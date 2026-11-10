import type { IBatch } from './db/models/Batch'

/**
 * A batch with maxStudents > 0 stops accepting new joins once it's full,
 * unless reactivateDate has passed — at which point it reopens regardless
 * of how many students are already in it (the cap is a one-time gate, not a
 * hard ceiling once reactivated).
 */
export function isBatchAcceptingStudents(
  batch: Pick<IBatch, 'maxStudents' | 'students' | 'reactivateDate'>,
): boolean {
  if (!batch.maxStudents || batch.maxStudents <= 0) return true
  if ((batch.students?.length || 0) < batch.maxStudents) return true
  if (batch.reactivateDate && new Date() >= new Date(batch.reactivateDate))
    return true
  return false
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
    | 'reactivateDate'
    | 'joinOpensAt'
    | 'joinClosesAt'
    | 'status'
  >,
  now: Date = new Date(),
): boolean {
  if (batch.status === 'completed') return false
  return isBatchJoinWindowOpen(batch, now) && isBatchAcceptingStudents(batch)
}
