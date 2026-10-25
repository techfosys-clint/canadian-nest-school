import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginForm from '@/app/(app)/login/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In - Canadian Nest School',
  description:
    'Access your Canadian Nest School account to manage courses and interactive learning sessions.',
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center bg-white'>
          <div className='h-10 w-10 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
