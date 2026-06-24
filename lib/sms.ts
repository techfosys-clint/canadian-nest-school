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

/**
 * Sends an SMS via the smsgateway.com.bd API.
 * TODO: confirm exact endpoint path and parameter names against the provider's API docs.
 */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  const baseUrl = process.env.SMS_GATEWAY_BASE_URL
  const clientId = process.env.SMS_GATEWAY_CLIENT_ID
  const apiKey = process.env.SMS_GATEWAY_API_KEY

  if (!baseUrl || !clientId || !apiKey) {
    console.error('SMS gateway credentials are not configured.')
    return false
  }

  try {
    const res = await fetch(`${baseUrl}/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        api_key: apiKey,
        to: phone,
        message,
      }),
    })

    if (!res.ok) {
      console.error('SMS gateway responded with an error status:', res.status, await res.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to send SMS:', error)
    return false
  }
}
