import type { CompletionReviewState } from '@/lib/reviews/completionGate'
import {
  canDownloadCertificate,
  hasSubmittedRequiredReviews,
} from '@/lib/reviews/completionGate'

export type CertCtaMode =
  | 'leave_reviews'
  | 'resubmit_reviews'
  | 'download'
  | 'unknown'

export function getCertCtaMode(
  gate: CompletionReviewState | null | undefined,
): CertCtaMode {
  if (!gate) return 'unknown'
  if (
    gate.courseReviewStatus === 'rejected' ||
    gate.teacherReviewStatus === 'rejected'
  ) {
    return 'resubmit_reviews'
  }
  if (!hasSubmittedRequiredReviews(gate)) return 'leave_reviews'
  if (canDownloadCertificate(gate)) return 'download'
  return 'unknown'
}

export function certCtaLabel(mode: CertCtaMode, downloading = false): string {
  if (downloading) return 'Preparing PDF...'
  switch (mode) {
    case 'leave_reviews':
      return 'Leave Reviews'
    case 'resubmit_reviews':
      return 'Resubmit Reviews'
    case 'download':
      return 'Download Certificate'
    default:
      return 'Certificate'
  }
}
