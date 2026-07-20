import type { CompletionReviewState } from '@/lib/reviews/completionGate'
import {
  canDownloadCertificate,
  hasSubmittedRequiredReviews,
} from '@/lib/reviews/completionGate'

export type CertCtaMode =
  | 'leave_reviews'
  | 'awaiting_approval'
  | 'download'
  | 'unknown'

export function getCertCtaMode(
  gate: CompletionReviewState | null | undefined,
): CertCtaMode {
  if (!gate) return 'unknown'
  if (!hasSubmittedRequiredReviews(gate)) return 'leave_reviews'
  if (!canDownloadCertificate(gate)) return 'awaiting_approval'
  return 'download'
}

export function certCtaLabel(mode: CertCtaMode, downloading = false): string {
  if (downloading) return 'Preparing PDF...'
  switch (mode) {
    case 'leave_reviews':
      return 'Leave Reviews'
    case 'awaiting_approval':
      return 'Check Review Status'
    case 'download':
      return 'Download Certificate'
    default:
      return 'Certificate'
  }
}
