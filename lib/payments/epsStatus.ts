/**
 * Normalize EPS CheckMerchantTransactionStatus values into a small set
 * we can act on. Anything unrecognized stays "pending" so we never
 * permanently fail a payment that might still settle.
 *
 * `not_found` = EPS has no record for this merchantTransactionId (HTTP 404 /
 * abandoned checkout). Callers may leave the local row pending, or release
 * coupons after a stale window — never treat as paid.
 */
export type NormalizedEpsStatus = 'success' | 'failed' | 'pending' | 'not_found'

export function normalizeEpsStatus(
  status: string | null | undefined,
): NormalizedEpsStatus {
  const s = (status || '').trim().toLowerCase().replace(/[\s_-]+/g, '')

  if (
    s === 'success' ||
    s === 'successful' ||
    s === 'paid' ||
    s === 'completed' ||
    s === 'complete'
  ) {
    return 'success'
  }

  if (
    s === 'failed' ||
    s === 'fail' ||
    s === 'failure' ||
    s === 'cancelled' ||
    s === 'canceled' ||
    s === 'cancel' ||
    s === 'declined' ||
    s === 'rejected'
  ) {
    return 'failed'
  }

  if (s === 'notfound' || s === 'unknown' || s === 'doesnotexist') {
    return 'not_found'
  }

  return 'pending'
}
