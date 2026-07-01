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
    throw new Error('EPS payment gateway is not configured. Set EPS_BASE_URL, EPS_USERNAME, EPS_PASSWORD, EPS_STORE_ID, EPS_MERCHANT_ID, EPS_HASH_KEY.')
  }

  return { baseUrl, username, password, storeId, merchantId, hashKey }
}

/**
 * EPS hash mechanism (per their integration guide):
 * HMACSHA512(hashKey, value) -> base64
 */
function generateHash(value: string, hashKey: string): string {
  return crypto.createHmac('sha512', Buffer.from(hashKey, 'utf8'))
    .update(Buffer.from(value, 'utf8'))
    .digest('base64')
}

const EPS_TIMEOUT_MS = 15_000

function epsSignal(): AbortSignal {
  return AbortSignal.timeout(EPS_TIMEOUT_MS)
}

let cachedToken: { token: string; expireAt: number } | null = null

async function getEpsToken(): Promise<string> {
  const config = getEpsConfig()

  if (cachedToken && cachedToken.expireAt > Date.now() + 60_000) {
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

  const data = await res.json()

  if (!res.ok || !data.token) {
    throw new Error(data.errorMessage || 'Failed to authenticate with EPS payment gateway.')
  }

  cachedToken = {
    token: data.token,
    expireAt: new Date(data.expireDate).getTime(),
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

export async function initializeEpsPayment(params: InitializeEpsPaymentParams): Promise<InitializeEpsPaymentResult> {
  const config = getEpsConfig()
  const token = await getEpsToken()

  let res: Response
  try {
    res = await fetch(`${config.baseUrl}/v1/EPSEngine/InitializeEPS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-hash': generateHash(params.merchantTransactionId, config.hashKey),
      },
      body: JSON.stringify({
        storeId: config.storeId,
        CustomerOrderId: params.customerOrderId,
        merchantTransactionId: params.merchantTransactionId,
        transactionTypeId: 1,
        financialEntityId: 0,
        transitionStatusId: 0,
        totalAmount: params.totalAmount,
        ipAddress: '127.0.0.1',
        version: '1',
        successUrl: params.successUrl,
        failUrl: params.failUrl,
        cancelUrl: params.cancelUrl,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerAddress: 'N/A',
        customerCity: 'N/A',
        customerState: 'N/A',
        customerPostcode: 'N/A',
        customerCountry: 'BD',
        customerPhone: params.customerPhone,
        productName: params.productName,
        productProfile: 'general',
        productCategory: 'Online Course',
      }),
      signal: epsSignal(),
    })
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error('EPS payment gateway did not respond in time. Please try again.')
    }
    throw err
  }

  const data = await res.json()

  if (!res.ok || !data.RedirectURL) {
    throw new Error(data.ErrorMessage || 'Failed to initialize EPS payment.')
  }

  return {
    redirectUrl: data.RedirectURL,
    transactionId: data.TransactionId,
  }
}

export interface EpsTransactionStatus {
  status: 'Success' | 'Failed' | 'Pending' | string
  totalAmount: string
  merchantTransactionId: string
}

export async function verifyEpsTransaction(merchantTransactionId: string): Promise<EpsTransactionStatus> {
  const config = getEpsConfig()
  const token = await getEpsToken()

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
      }
    )
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error('EPS payment gateway did not respond in time.')
    }
    throw err
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.ErrorMessage || 'Failed to verify EPS transaction.')
  }

  return {
    status: data.Status,
    totalAmount: data.TotalAmount,
    merchantTransactionId: data.MerchantTransactionId,
  }
}
