import type { Metadata } from 'next'
import ResetPasswordForm from '@/app/(app)/reset-password/ResetPasswordForm'


export const metadata: Metadata = {
  title: 'Reset Password - Canadian Nest School',
  description: 'Enter your new password to regain full access to your Canadian Nest School learning account.',
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}
