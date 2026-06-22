import type { Metadata } from 'next'
import LoginForm from '@/app/(app)/login/LoginForm'


export const metadata: Metadata = {
  title: 'Sign In - Canadian Nest School',
  description: 'Access your Canadian Nest School account to manage courses and interactive learning sessions.',
}

export default function LoginPage() {
  return <LoginForm />
}
