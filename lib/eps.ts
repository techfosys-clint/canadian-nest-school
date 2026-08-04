import crypto from 'crypto'

interface EpsConfig {
  baseUrl: string
  username: string
  password: string
  storeId: string
  merchantId: string
  hashKey: string
}

function getEpsConfig(): EpsConfig {
  const baseUrl = process.env.EPS_BASE_URL
  const username = process.env.EPS_USERNAME
  const password = process.env.EPS_PASSWORD
  const storeId = process.env.EPS_STORE_ID
  const merchantId = process.env.EPS_MERCHANT_ID
  const hashKey = process.env.EPS_HASH_KEY

  if (!baseUrl || !username || !password || !storeId || !merchantId || !hashKey) {
    throw new Error(
      'EPS payment gateway is not configured. Set EPS_BASE_URL, EPS_USERNAME, EPS_PASSWORD, EPS_STORE_ID, EPS_MERCHANT_ID, EPS_HASH_KEY.',
    )
  }

  return { baseUrl, username, password, storeId, merchantId, hashKey }
}

/**
 * EPS hash mechanism (Integration Guide V5):
 * 1) Encode Hash Key as UTF-8
 * 2) HMAC-SHA512(key = hashKey, data = userName | merchantTransactionId | …)
 * 3) Return Base64 digest
 * Used as the `x-hash` header on GetToken / InitializeEPS / Verify.
 */
function generateHash(value: string, hashKey: string): string {
  return crypto
    .createHmac('sha512', Buffer.from(hashKey, 'utf8'))
    .update(Buffer.from(value, 'utf8'))
    .digest('base64')
}

const EPS_TIMEOUT_MS = 20_000

function epsSignal(): AbortSignal {
  return AbortSignal.timeout(EPS_TIMEOUT_MS)
}

let cachedToken: { token: string; expireAt: number } | null = null

function clearEpsTokenCache() {
  cachedToken = null
}

/** Strip control chars / truncate for EPS string fields. */
function sanitizeEpsText(value: string, maxLen: number): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

/**
 * Normalize BD mobile numbers for EPS (expects 01XXXXXXXXX).
 * Accepts +8801..., 8801..., 01..., or digits with spaces/dashes.
 */
function sanitizeBdPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('880') && digits.length >= 13) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('0') && digits.length >= 11) {
    return digits.slice(0, 11)
  }
  if (digits.length === 10 && digits.startsWith('1')) {
    return `0${digits}`
  }
  // Fallback placeholder — EPS rejects empty/invalid phones with opaque HTML errors.
  return '01700000000'
}

function sanitizeEmail(raw: string): string {
  const email = sanitizeEpsText(raw, 120).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'no-reply@canadiannestschool.com'
  }
  return email
}

/** EPS amounts should be finite BDT with at most 2 decimal places. */
function sanitizeAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid payment amount for EPS.')
  }
  return Math.round(amount * 100) / 100
}

async function getEpsToken(forceRefresh = false): Promise<string> {
  const config = getEpsConfig()

  if (
    !forceRefresh &&
    cachedToken &&
    Number.isFinite(cachedToken.expireAt) &&
    cachedToken.expireAt > Date.now() + 60_000
  ) {
    return cachedToken.token
  }

  let res: Response
  try {
    res = await fetch(`${config.baseUrl}/v1/Auth/GetToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hash': generateHash(config.username, config.hashKey),
      },
      body: JSON.stringify({
        userName: config.username,
        password: config.password,
      }),
      signal: epsSignal(),
    })
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error('EPS payment gateway did not respond in time. Please try again.')
    }
    throw err
  }

  const rawAuth = await res.text()
  let data: any
  try {
    data = JSON.parse(rawAuth)
  } catch {
    console.error(`EPS auth returned non-JSON (HTTP ${res.status}):`, rawAuth.slice(0, 500))
    throw new Error(
      'EPS payment gateway returned an unexpected response during authentication. Please try again.',
    )
  }

  if (!res.ok || !data.token) {
    throw new Error(data.errorMessage || 'Failed to authenticate with EPS payment gateway.')
  }

  const expireAt = new Date(data.expireDate).getTime()
  cachedToken = {
    token: data.token,
    expireAt: Number.isFinite(expireAt) ? expireAt : Date.now() + 5 * 60_000,
  }

  return cachedToken.token
}

export interface InitializeEpsPaymentParams {
  merchantTransactionId: string
  customerOrderId: string
  totalAmount: number
  successUrl: string
  failUrl: string
  cancelUrl: string
  customerName: string
  customerEmail: string
  customerPhone: string
  productName: string
}

export interface InitializeEpsPaymentResult {
  redirectUrl: string
  transactionId: string
}

async function postInitializeEps(
  token: string,
  params: InitializeEpsPaymentParams,
  transactionTypeId: number,
): Promise<Response> {
  const config = getEpsConfig()
  const totalAmount = sanitizeAmount(params.totalAmount)
  const customerPhone = sanitizeBdPhone(params.customerPhone)
  const customerName = sanitizeEpsText(params.customerName || 'Student', 100) || 'Student'
  const customerEmail = sanitizeEmail(params.customerEmail || '')
  const productName =
    sanitizeEpsText(params.productName || 'Online Course', 150) || 'Online Course'

  return fetch(`${config.baseUrl}/v1/EPSEngine/InitializeEPS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-hash': generateHash(params.merchantTransactionId, config.hashKey),
    },
    body: JSON.stringify({
      // Guide V5: merchantId + storeId are both mandatory.
      merchantId: config.merchantId,
      storeId: config.storeId,
      CustomerOrderId: params.customerOrderId,
      merchantTransactionId: params.merchantTransactionId,
      // Guide table lists 1=Web; sample body uses 10 — keep 10 (live-proven).
      transactionTypeId,
      financialEntityId: 0,
      transitionStatusId: 0,
      totalAmount,
      ipAddress: '127.0.0.1',
      version: '1',
      successUrl: params.successUrl,
      failUrl: params.failUrl,
      cancelUrl: params.cancelUrl,
      customerName,
      customerEmail,
      customerAddress: 'N/A',
      customerCity: 'Dhaka',
      customerState: 'Dhaka',
      customerPostcode: '1200',
      customerCountry: 'BD',
      customerPhone,
      productName,
      productProfile: 'general',
      productCategory: 'Online Course',
      NoOfItem: '1',
      ShippingMethod: 'NO',
    }),
    signal: epsSignal(),
  })
}

export async function initializeEpsPayment(
  params: InitializeEpsPaymentParams,
): Promise<InitializeEpsPaymentResult> {
  // Keep the historically working transactionTypeId (10). Retry once with a
  // fresh token when EPS returns opaque HTML / auth failures.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getEpsToken(attempt === 2)

    let res: Response
    try {
      res = await postInitializeEps(token, params, 10)
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new Error('EPS payment gateway did not respond in time. Please try again.')
      }
      throw err
    }

    const rawInit = await res.text()
    let data: any
    try {
      data = JSON.parse(rawInit)
    } catch {
      console.error(
        `EPS initialize returned non-JSON (HTTP ${res.status}, attempt ${attempt}):`,
        rawInit.slice(0, 500),
      )
      // Retry once on opaque HTML/empty gateway responses (502/503/WAF/expired token pages).
      if (
        attempt === 1 &&
        (res.status >= 500 || res.status === 401 || res.status === 403 || !rawInit.trim())
      ) {
        clearEpsTokenCache()
        continue
      }
      throw new Error(
        'EPS payment gateway returned an unexpected response during payment initialization. Please try again.',
      )
    }

    if (res.status === 401 || res.status === 403) {
      console.error(`EPS initialize auth failure (HTTP ${res.status}, attempt ${attempt}):`, data)
      if (attempt === 1) {
        clearEpsTokenCache()
        continue
      }
    }

    if (!res.ok || !data.RedirectURL) {
      const message =
        data.ErrorMessage ||
        data.errorMessage ||
        data.Message ||
        'Failed to initialize EPS payment.'
      throw new Error(message)
    }

    return {
      redirectUrl: data.RedirectURL,
      transactionId: data.TransactionId,
    }
  }

  throw new Error(
    'EPS payment gateway returned an unexpected response during payment initialization. Please try again.',
  )
}

export interface EpsTransactionStatus {
  status: 'Success' | 'Failed' | 'Pending' | string
  totalAmount: string
  merchantTransactionId: string
}

export async function verifyEpsTransaction(
  merchantTransactionId: string,
): Promise<EpsTransactionStatus> {
  const config = getEpsConfig()

  for (let attempt = 1; attempt <= 2; attempt++) {
    const token = await getEpsToken(attempt === 2)

    let res: Response
    try {
      res = await fetch(
        `${config.baseUrl}/v1/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'x-hash': generateHash(merchantTransactionId, config.hashKey),
          },
          signal: epsSignal(),
        },
      )
    } catch (err: any) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
        throw new Error('EPS payment gateway did not respond in time.')
      }
      throw err
    }

    const rawVerify = await res.text()

    // EPS returns 404 (often empty/HTML) when the merchantTransactionId was
    // never recorded or the checkout session expired. Treat as not-found so
    // heal/reconcile can leave the enrollment pending instead of throwing.
    if (res.status === 404) {
      console.warn(
        `EPS verify: transaction not found (HTTP 404) for ${merchantTransactionId}`,
      )
      return {
        status: 'NotFound',
        totalAmount: '',
        merchantTransactionId,
      }
    }

    let data: any
    try {
      data = JSON.parse(rawVerify)
    } catch {
      console.error(
        `EPS verify returned non-JSON (HTTP ${res.status}, attempt ${attempt}):`,
        rawVerify.slice(0, 500),
      )
      if (
        attempt === 1 &&
        (res.status >= 500 || res.status === 401 || res.status === 403 || !rawVerify.trim())
      ) {
        clearEpsTokenCache()
        continue
      }
      throw new Error(
        'EPS payment gateway returned an unexpected response during verification. Please try again.',
      )
    }

    if (!res.ok) {
      if (attempt === 1 && (res.status === 401 || res.status === 403)) {
        clearEpsTokenCache()
        continue
      }
      throw new Error(data.ErrorMessage || 'Failed to verify EPS transaction.')
    }

    return {
      status: data.Status,
      totalAmount: data.TotalAmount,
      merchantTransactionId: data.MerchantTransactionId || merchantTransactionId,
    }
  }

  throw new Error(
    'EPS payment gateway returned an unexpected response during verification. Please try again.',
  )
}
