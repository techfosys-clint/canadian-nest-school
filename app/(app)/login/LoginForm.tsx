'use client';

import MobileAuthFlow, {
  type MobileAuthUser,
} from '@/components/MobileAuthFlow';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import Swal from 'sweetalert2';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);

  const handleSuccess = (user: MobileAuthUser) => {
    setRedirecting(true);

    const redirectParam = searchParams.get('redirect');
    const safeRedirect =
      redirectParam &&
      redirectParam.startsWith('/') &&
      !redirectParam.startsWith('//')
        ? redirectParam
        : null;

    Swal.fire({
      icon: 'success',
      title: 'Welcome!',
      text: 'You have signed in successfully.',
      timer: 1200,
      showConfirmButton: false,
    });

    setTimeout(() => {
      if (safeRedirect) {
        router.push(safeRedirect);
      } else if (
        user.role === 'admin' ||
        user.role === 'instructor' ||
        user.role === 'staff'
      ) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    }, 1200);
  };

  return (
    <div className='min-h-screen flex bg-white font-sans'>
      {/* Left Side: Premium Navy Branding Column (Hidden on Mobile) */}
      <div className='hidden lg:flex w-1/2 bg-[#0A163A] text-white flex-col justify-between p-16 relative overflow-hidden select-none'>
        <div className='absolute -top-32 -left-32 w-96 h-96 bg-[#E61C24]/10 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-32 -right-32 w-96 h-96 bg-[#CC181F]/10 rounded-full blur-3xl pointer-events-none' />

        <Link
          href='/'
          className='flex items-center group bg-white px-3 py-1.5 rounded-lg shadow-sm z-10 self-start'
        >
          <Image
            src='/logo.png'
            alt='Canadian Nest School'
            className='h-12 w-auto object-contain'
            width={100}
            height={100}
          />
        </Link>

        <div className='flex flex-col gap-6 z-10 my-auto'>
          <div className='inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-white/5 border border-white/10 text-base font-bold text-[#E61C24] uppercase tracking-wider self-start'>
            Student Portal
          </div>
          <h1 className='text-4xl sm:text-5xl font-bold font-display tracking-tight leading-tight text-white'>
            Manage your <br />
            <span className='text-transparent bg-clip-text bg-linear-to-r from-[#E61C24] to-[#FF4D55]'>
              Learning Journey
            </span>
          </h1>
          <p className='text-zinc-400 text-lg max-w-md font-medium leading-relaxed'>
            Experience the next generation of online learning. Secure,
            intuitive, and designed specifically for modern students.
          </p>
        </div>

        <div className='text-zinc-500 text-base font-semibold z-10'>
          &copy; 2026 Canadian Nest School. All rights reserved.
        </div>
      </div>

      {/* Right Side: Form Workspace Column */}
      <div className='w-full lg:w-1/2 min-h-screen bg-white flex items-center justify-center p-8 sm:p-12 relative overflow-y-auto'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className='w-full max-w-md bg-transparent p-0 relative z-10'
        >
          <div className='flex justify-start lg:hidden mb-8'>
            <Link href='/' className='flex items-center group'>
              <Image
                src='/logo.png'
                alt='Canadian Nest School'
                className='h-12 w-auto object-contain'
                width={100}
                height={100}
              />
            </Link>
          </div>

          <div className='flex flex-col items-start mb-8'>
            <span className='text-base font-bold text-[#E61C24] uppercase tracking-wider mb-2'>
              Welcome
            </span>
            <h2 className='text-3xl font-bold text-zinc-900 tracking-tight font-display'>
              Sign in or create account
            </h2>
          </div>

          {redirecting ? (
            <div className='flex flex-col items-center gap-4 py-12'>
              <div className='h-10 w-10 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
              <p className='text-base font-bold text-zinc-600'>
                Taking you to your account...
              </p>
            </div>
          ) : (
            <MobileAuthFlow
              variant='bare'
              onSuccess={handleSuccess}
              heading='Continue with mobile number'
              subheading='We will sign you in if you already have an account, or help you create one.'
              signUpMethod='login_page'
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
