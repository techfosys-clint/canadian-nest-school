import type { Metadata } from 'next'
import RegisterForm from '@/app/(app)/register/RegisterForm'


export const metadata: Metadata = {
  title: 'Sign Up - Canadian Nest School',
  description: 'Create a free Canadian Nest School account to unlock interactive premium e-learning courses.',
}

export default function RegisterPage() {
  return <RegisterForm />
}
