import crypto from 'crypto'
import { normalizeEpsStatus } from '@/lib/payments/epsStatus'

/**
 * Decrypt EPS IPN payload: `IV:CipherText` (both base64), AES-256-CBC.
 * Secret from EPS_IPN_SECRET_KEY, or EPS_HASH_KEY as fallback.
 */
export function getEpsIpnSecretKey(): string | null {
  const raw =
    process.env.EPS_IPN_SECRET_KEY?.trim() ||
    process.env.EPS_HASH_KEY?.trim() ||
    ''
  if (!raw) return null
  return raw.replace(/^['"]|['"]$/g, '')
}

function aes256KeyFromSecret(secret: string): Buffer {
  const utf8 = Buffer.from(secret, 'utf8')
  if (utf8.length === 32) return utf8
  // EPS secrets are often not exactly 32 bytes — derive a stable AES key.
  return crypto.createHash('sha256').update(utf8).digest()
}

export function decryptEpsIpnData(dataField: string, secret: string): unknown {
  const parts = dataField.split(':')
  if (parts.length < 2) {
    throw new Error('Invalid IPN Data format (expected IV:CipherText).')
  }
  const iv = Buffer.from(parts[0], 'base64')
  const cipherText = Buffer.from(parts.slice(1).join(':'), 'base64')
  const key = aes256KeyFromSecret(secret)

  if (iv.length !== 16) {
    throw new Error(`Invalid IPN IV length: ${iv.length}`)
  }

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  const decrypted = Buffer.concat([
    decipher.update(cipherText),
    decipher.final(),
  ])
  const text = decrypted.toString('utf8').replace(/^\uFEFF/, '').trim()
  return JSON.parse(text)
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
