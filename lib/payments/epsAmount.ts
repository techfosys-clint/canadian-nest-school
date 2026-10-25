/**
 * Compare EPS CheckMerchantTransactionStatus TotalAmount to our expected
 * BDT amount. Tolerates minor float/string formatting differences.
 */
export function epsAmountsMatch(
  epsTotalAmount: string | number | null | undefined,
  expectedAmount: number,
): boolean {
  if (!Number.isFinite(expectedAmount)) return false

  const raw =
    typeof epsTotalAmount === 'number'
      ? epsTotalAmount
      : parseFloat(String(epsTotalAmount ?? '').replace(/,/g, '').trim())

  if (!Number.isFinite(raw)) return false

  return Math.abs(raw - expectedAmount) < 0.02
}
