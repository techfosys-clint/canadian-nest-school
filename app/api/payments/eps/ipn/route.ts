import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import {
  decryptEpsIpnData,
  getEpsIpnSecretKey,
  getEpsIpnSecretSource,
  ipnStatusLooksSuccessful,
  parseEpsIpnPayload,
} from '@/lib/payments/epsIpn'
import { healPaymentByMerchantTransactionId } from '@/lib/payments/healPendingEpsPayments'

export const dynamic = 'force-dynamic'

/**
 * POST /api/payments/eps/ipn
 *
 * EPS Instant Payment Notification receiver.
 * Register this URL in the EPS merchant panel (HTTPS):
 *   https://canadiannestschool.com/api/payments/eps/ipn
 *
 * Always re-verifies with CheckMerchantTransactionStatus before completing.
 * Set EPS_IPN_SECRET_KEY in Coolify (or falls back to EPS_HASH_KEY).
 *
 * @see https://www.eps.com.bd/ipn
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase()

    const secret = getEpsIpnSecretKey()
    const secretSource = getEpsIpnSecretSource()
    if (!secret) {
      console.error('EPS IPN: no EPS_IPN_SECRET_KEY / EPS_HASH_KEY configured')
      return NextResponse.json(
        { status: 'ERROR', message: 'IPN secret not configured' },
        { status: 500 },
      )
    }

    if (secretSource === 'EPS_HASH_KEY') {
      console.warn(
        'EPS IPN: using EPS_HASH_KEY fallback. Prefer EPS_IPN_SECRET_KEY from the EPS merchant IPN settings — hash key is for API HMAC and often causes ERR_OSSL_BAD_DECRYPT.',
      )
    }

    const body = await request.json().catch(() => ({}))
    const dataField =
      typeof body?.Data === 'string'
        ? body.Data
        : typeof body?.data === 'string'
          ? body.data
          : ''

    if (!dataField) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid payload' },
        { status: 400 },
      )
    }

    let decrypted: unknown
    try {
      decrypted = decryptEpsIpnData(dataField, secret)
    } catch (err) {
      console.error('EPS IPN decryption failed:', err)
      return NextResponse.json(
        { status: 'ERROR', message: 'Decryption failed or internal error' },
        { status: 400 },
      )
    }

    const payload = parseEpsIpnPayload(decrypted)
    console.info('EPS IPN received:', {
      merchantTransactionId: payload.merchantTransactionId,
      status: payload.status,
      transactionId: payload.transactionId,
    })

    if (!payload.merchantTransactionId) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid payload' },
        { status: 400 },
      )
    }

    // Always verify with EPS API — do not trust IPN status alone.
    const heal = await healPaymentByMerchantTransactionId(
      payload.merchantTransactionId,
    )

    if (heal.type === 'none') {
      console.warn(
        'EPS IPN: no enrollment/order for',
        payload.merchantTransactionId,
        'ipnStatus=',
        payload.status,
      )
    } else {
      console.info('EPS IPN heal:', heal)
    }

    // Acknowledge receipt so EPS does not keep retrying endlessly.
    // Even if still pending at verify time, OK — reconcile/heal can finish later.
    return NextResponse.json({
      status: 'OK',
      message: 'IPN received and saved successfully',
      processed: heal.type,
      result: heal.result || null,
      ipnSuccessHint: ipnStatusLooksSuccessful(payload.status),
    })
  } catch (error) {
    console.error('EPS IPN error:', error)
    return NextResponse.json(
      { status: 'ERROR', message: 'Decryption failed or internal error' },
      { status: 500 },
    )
  }
}
