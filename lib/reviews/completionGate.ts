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

/** Certificate download unlocks once both review tracks are submitted (not idle).
 * Admin approval is optional moderation and no longer blocks the PDF.
 * Rejected reviews must be resubmitted before download.
 */
export function canDownloadCertificate(state: CompletionReviewState | null) {
  if (!state) return false
  if (
    state.courseReviewStatus === 'rejected' ||
    state.teacherReviewStatus === 'rejected'
  ) {
    return false
  }
  return hasSubmittedRequiredReviews(state)
}
