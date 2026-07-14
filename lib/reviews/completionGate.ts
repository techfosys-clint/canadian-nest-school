export type ReviewFlowStatus = 'idle' | 'pending' | 'approved' | 'rejected'

export interface CompletionReviewState {
  courseReviewStatus: ReviewFlowStatus
  teacherReviewStatus: ReviewFlowStatus
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
