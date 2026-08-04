import crypto from 'crypto'
import { normalizeEpsStatus } from '@/lib/payments/epsStatus'

/**
 * Decrypt EPS IPN payload: `IV:CipherText` (both base64), AES-256-CBC + PKCS7.
 * @see https://www.eps.com.bd/ipn
 *
 * Prefer EPS_IPN_SECRET_KEY from the EPS merchant/IPN panel. Falling back to
 * EPS_HASH_KEY is unreliable — that key is for HMAC API signing and is often
 * a different value (and often base64) than the IPN AES secret.
 */
export function getEpsIpnSecretKey(): string | null {
  const raw =
    process.env.EPS_IPN_SECRET_KEY?.trim() ||
    process.env.EPS_HASH_KEY?.trim() ||
    ''
  if (!raw) return null
  return raw.replace(/^['"]|['"]$/g, '')
}

export function getEpsIpnSecretSource(): 'EPS_IPN_SECRET_KEY' | 'EPS_HASH_KEY' | null {
  if (process.env.EPS_IPN_SECRET_KEY?.trim()) return 'EPS_IPN_SECRET_KEY'
  if (process.env.EPS_HASH_KEY?.trim()) return 'EPS_HASH_KEY'
  return null
}

/** Build candidate AES-256 keys (32 bytes) from the configured secret string. */
function candidateAes256Keys(secret: string): { label: string; key: Buffer }[] {
  const out: { label: string; key: Buffer }[] = []
  const seen = new Set<string>()

  const push = (label: string, key: Buffer) => {
    if (key.length !== 32) return
    const id = key.toString('hex')
    if (seen.has(id)) return
    seen.add(id)
    out.push({ label, key })
  }

  const utf8 = Buffer.from(secret, 'utf8')
  if (utf8.length === 32) push('utf8-32', utf8)
  if (utf8.length > 32) push('utf8-trunc32', utf8.subarray(0, 32))
  if (utf8.length < 32 && utf8.length > 0) {
    const padded = Buffer.alloc(32)
    utf8.copy(padded)
    push('utf8-zeropad32', padded)
  }
  push('sha256-utf8', crypto.createHash('sha256').update(utf8).digest())

  // Hash keys from EPS are often base64 (e.g. end with "=").
  try {
    const b64 = Buffer.from(secret, 'base64')
    if (b64.length === 32) push('base64-32', b64)
    if (b64.length > 32) push('base64-trunc32', b64.subarray(0, 32))
    if (b64.length > 0 && b64.length < 32) {
      const padded = Buffer.alloc(32)
      b64.copy(padded)
      push('base64-zeropad32', padded)
    }
    if (b64.length > 0) {
      push('sha256-base64', crypto.createHash('sha256').update(b64).digest())
    }
  } catch {
    // ignore invalid base64
  }

  return out
}

function tryDecryptWithKey(
  cipherText: Buffer,
  iv: Buffer,
  key: Buffer,
): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  const decrypted = Buffer.concat([
    decipher.update(cipherText),
    decipher.final(),
  ])
  return decrypted.toString('utf8').replace(/^\uFEFF/, '').trim()
}

export function decryptEpsIpnData(dataField: string, secret: string): unknown {
  const parts = dataField.split(':')
  if (parts.length < 2) {
    throw new Error('Invalid IPN Data format (expected IV:CipherText).')
  }
  const iv = Buffer.from(parts[0], 'base64')
  const cipherText = Buffer.from(parts.slice(1).join(':'), 'base64')

  if (iv.length !== 16) {
    throw new Error(`Invalid IPN IV length: ${iv.length} (expected 16)`)
  }
  if (cipherText.length === 0 || cipherText.length % 16 !== 0) {
    throw new Error(
      `Invalid IPN ciphertext length: ${cipherText.length} (must be multiple of 16)`,
    )
  }

  const candidates = candidateAes256Keys(secret)
  let lastErr: unknown

  for (const { label, key } of candidates) {
    try {
      const text = tryDecryptWithKey(cipherText, iv, key)
      const parsed = JSON.parse(text)
      if (label !== 'utf8-32' && label !== 'base64-32') {
        console.info(`EPS IPN decrypted with key strategy: ${label}`)
      }
      return parsed
    } catch (err) {
      lastErr = err
    }
  }

  const source = getEpsIpnSecretSource()
  console.error(
    'EPS IPN decryption failed with all key strategies.',
    `secretSource=${source ?? 'none'}`,
    `candidatesTried=${candidates.map((c) => c.label).join(',')}`,
    'Set EPS_IPN_SECRET_KEY in Coolify to the IPN Secret Key from the EPS merchant panel (do not assume EPS_HASH_KEY works).',
  )
  throw lastErr instanceof Error
    ? lastErr
    : new Error('EPS IPN decryption failed (bad key or corrupt payload).')
}

export type EpsIpnPayload = {
  merchantTransactionId?: string
  status?: string
  transactionId?: string
  amount?: number | string
  raw: Record<string, unknown>
}

export function parseEpsIpnPayload(decrypted: unknown): EpsIpnPayload {
  const obj =
    decrypted && typeof decrypted === 'object'
      ? (decrypted as Record<string, unknown>)
      : {}

  const merchantTransactionId = String(
    obj.merchant_transaction_id ??
      obj.MerchantTransactionId ??
      obj.merchantTransactionId ??
      '',
  ).trim()

  const status = String(
    obj.status ?? obj.Status ?? obj.transaction_status ?? '',
  ).trim()

  const transactionId = String(
    obj.transaction_id ?? obj.TransactionId ?? obj.eps_transaction_id ?? '',
  ).trim()

  return {
    merchantTransactionId: merchantTransactionId || undefined,
    status: status || undefined,
    transactionId: transactionId || undefined,
    amount: (obj.amount ?? obj.TotalAmount ?? obj.total_amount) as
      | number
      | string
      | undefined,
    raw: obj,
  }
}

export function ipnStatusLooksSuccessful(status?: string): boolean {
  return normalizeEpsStatus(status) === 'success'
}
