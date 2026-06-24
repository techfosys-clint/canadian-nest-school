import crypto from 'crypto'

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export function buildOtpMessage(otp: string): string {
  return `[ Canadian Nest School ]\n\nYour verification code is: ${otp}\n\nPlease do not share this code with anyone. Valid for 5 minutes.`
}

async function callSmsGateway(endpoint: '/send-message' | '/resend-message', phone: string, message: string): Promise<boolean> {
  const baseUrl = process.env.SMS_GATEWAY_BASE_URL
  const clientId = process.env.SMS_GATEWAY_CLIENT_ID
  const apiKey = process.env.SMS_GATEWAY_API_KEY

  if (!baseUrl || !clientId || !apiKey) {
    console.error('SMS gateway credentials are not configured.')
    return false
  }

  try {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        key: apiKey,
        recipient: phone,
        message,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok || !data || data.response_code !== 200) {
      console.error('SMS gateway responded with an error:', res.status, data)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return false
  }
}

/**
 * Sends an SMS via the smsgateway.com.bd /send-message endpoint.
 */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  return callSmsGateway('/send-message', phone, message)
}

/**
 * Resends an SMS via the smsgateway.com.bd /resend-message endpoint,
 * which automatically routes through a fresh gateway (smart failover).
 */
export async function resendSms(phone: string, message: string): Promise<boolean> {
  return callSmsGateway('/resend-message', phone, message)
}
