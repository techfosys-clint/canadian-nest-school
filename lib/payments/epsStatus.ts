/**
 * Normalize EPS CheckMerchantTransactionStatus values into a small set
 * we can act on. Anything unrecognized stays "pending" so we never
 * permanently fail a payment that might still settle.
 */
export type NormalizedEpsStatus = 'success' | 'failed' | 'pending'

export function normalizeEpsStatus(
  status: string | null | undefined,
): NormalizedEpsStatus {
  const s = (status || '').trim().toLowerCase()

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

  return 'pending'
}
