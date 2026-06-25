/**
 * Normalizes a Bangladeshi phone number to a single canonical format
 * (01XXXXXXXXX) so the same real number always produces the same string —
 * used as a DB lookup key and rate-limit key. Without this, "01XXXXXXXXX",
 * "+8801XXXXXXXXX" and "8801XXXXXXXXX" are treated as different numbers,
 * letting someone bypass per-phone OTP rate limits or register duplicate
 * accounts for the same real number just by varying the format.
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/[^\d]/g, '')

  if (digits.startsWith('880')) {
    digits = digits.slice(2)
  }

  if (!digits.startsWith('0')) {
    digits = '0' + digits
  }

  return digits
}
