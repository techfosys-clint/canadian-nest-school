import type { Metadata } from 'next'
import ForgotPasswordForm from '@/app/(app)/forgot-password/ForgotPasswordForm'


export const metadata: Metadata = {
  title: 'Forgot Password - Canadian Nest School',
  description: 'Reset your password for your Canadian Nest School account to regain access to your dashboard.',
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
