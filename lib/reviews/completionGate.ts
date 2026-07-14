export type ReviewFlowStatus = 'idle' | 'pending' | 'approved' | 'rejected'

export interface CompletionReviewState {
  courseReviewStatus: ReviewFlowStatus
  teacherReviewStatus: ReviewFlowStatus
  step?: 1 | 2 | 3
}

export function getCompletionStorageKey(userId: string, courseId: string) {
  return `cns-complete-flow-${userId}-${courseId}`
}

export function readCompletionReviewState(
  userId: string,
  courseId: string,
): CompletionReviewState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(getCompletionStorageKey(userId, courseId))
    if (!raw) return null
    return JSON.parse(raw) as CompletionReviewState
  } catch {
    return null
  }
}

/** Student must submit both course + teacher reviews before certificate access */
export function hasSubmittedRequiredReviews(state: CompletionReviewState | null) {
  if (!state) return false
  return state.courseReviewStatus !== 'idle' && state.teacherReviewStatus !== 'idle'
}

/** Certificate download unlocks only after both reviews are accepted */
export function canDownloadCertificate(state: CompletionReviewState | null) {
  if (!state) return false
  return state.courseReviewStatus === 'approved' && state.teacherReviewStatus === 'approved'
}
