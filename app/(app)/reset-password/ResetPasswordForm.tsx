'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import {
  FiArrowLeft,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

function ResetPasswordFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Reset Link',
        text: 'The password reset token is missing. Please request a new link.',
        confirmButtonColor: '#E61C24',
        background: '#1a1a1a',
        color: '#ffffff',
        customClass: {
          popup: 'rounded-lg',
          confirmButton:
            'rounded-lg text-base font-bold px-6 py-2.5 bg-[#E61C24]',
        },
      });
      return;
    }

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please enter identical passwords.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Password Updated!',
          text: 'Your password has been successfully reset. Redirecting to login...',
          timer: 2000,
          showConfirmButton: false,
          background: '#1a1a1a',
          color: '#ffffff',
          customClass: {
            popup: 'rounded-lg',
          },
        });

        // Push user to general login page
        router.push('/login');
      } else {
        throw new Error(
          data.message || 'Failed to reset password. Link might be expired.',
        );
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full space-y-8 font-sans'>
      {/* Mobile Top Header (Displays only on small screens) */}
      <div className='flex items-center justify-between md:hidden mb-6'>
        <Link href='/' className='flex items-center group'>
          <Image
            src='/logo.png'
            alt='Canadian Nest School'
            className='h-11 w-auto object-contain'
            width={100}
            height={100}
          />
        </Link>
        <span className='px-2.5 py-0.5 text-base font-bold text-[#E61C24] bg-[#E61C24]/10 rounded-lg border border-[#E61C24]/20 uppercase'>
          Reset
        </span>
      </div>

      {/* Form Header */}
      <div className='space-y-2'>
        <p className='text-[#E61C24] text-base font-bold uppercase tracking-wider'>
          Security Update
        </p>
        <h2 className='text-3xl font-bold tracking-tight text-zinc-900 font-display'>
          New Password
        </h2>
        <p className='text-zinc-550 font-semibold text-base leading-relaxed'>
          Set your new password to secure and regain access to your dashboard.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className='space-y-5'>
        {error && (
          <div className='p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-base'>
            {error}
          </div>
        )}

        {/* New Password input */}
        <div className='flex flex-col gap-1.5'>
          <label
            htmlFor='password'
            className='text-base font-bold text-zinc-700'
          >
            New Password
          </label>
          <div className='relative'>
            <FiLock className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5' />
            <input
              id='password'
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              className='w-full pl-11 pr-11 py-3.5 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-4 focus:ring-[#E61C24]/10 outline-none text-base font-semibold text-zinc-900 bg-white transition-all placeholder-zinc-400'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer flex items-center justify-center'
            >
              {showPassword ? (
                <FiEyeOff className='h-5 w-5' />
              ) : (
                <FiEye className='h-5 w-5' />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password input */}
        <div className='flex flex-col gap-1.5'>
          <label
            htmlFor='confirmPassword'
            className='text-base font-bold text-zinc-700'
          >
            Confirm Password
          </label>
          <div className='relative'>
            <FiLock className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5' />
            <input
              id='confirmPassword'
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder='••••••••'
              className='w-full pl-11 pr-11 py-3.5 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-4 focus:ring-[#E61C24]/10 outline-none text-base font-semibold text-zinc-900 bg-white transition-all placeholder-zinc-400'
            />
            <button
              type='button'
              onClick={() => setShowPassword(!showPassword)}
              className='absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer flex items-center justify-center'
            >
              {showPassword ? (
                <FiEyeOff className='h-5 w-5' />
              ) : (
                <FiEye className='h-5 w-5' />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type='submit'
          disabled={loading}
          className='w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 transition-all duration-200 cursor-pointer disabled:opacity-50'
        >
          {loading ? (
            <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
          ) : (
            <>
              <span>Update Password</span>
              <FiArrowRight className='h-5 w-5' />
            </>
          )}
        </button>
      </form>

      {/* Footer info link */}
      <div className='pt-6 border-t border-zinc-100 flex items-center justify-center'>
        <Link
          href='/login'
          className='inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-800 text-base font-bold transition-colors'
        >
          <FiArrowLeft className='h-4.5 w-4.5' />
          <span>Cancel & Back</span>
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordForm() {
  return (
    <div className='min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden font-sans'>
      {/* ─── LEFT PANE: BRAND EXPERIENCE & MARKETING COVER (MD+ only) ─── */}
      <aside className='hidden md:flex md:w-1/2 flex-col justify-between bg-[#070b19] p-12 text-white relative select-none'>
        {/* Subtle Glowing Blur Blob */}
        <div className='absolute top-1/4 left-10 w-80 h-80 bg-[#E61C24]/15 rounded-full blur-3xl pointer-events-none' />

        {/* Top Brand Logo */}
        <div className='relative z-10'>
          <Link
            href='/'
            className='inline-flex items-center group bg-white px-3 py-1.5 rounded-lg shadow-sm w-fit'
          >
            <Image
              src='/logo.png'
              alt='Canadian Nest School'
              className='h-13 w-auto object-contain'
              width={100}
              height={100}
            />
          </Link>
        </div>

        {/* Middle Hero Slogan */}
        <div className='relative z-10 my-auto py-12 space-y-6'>
          <span className='px-3.5 py-1 text-base font-bold text-[#E61C24] bg-[#E61C24]/10 rounded-lg border border-[#E61C24]/20 uppercase tracking-wider w-fit block'>
            Reset Password
          </span>
          <h1 className='text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight font-display'>
            Manage your <br />
            <span className='text-[#E61C24]'>Learning Journey</span>
          </h1>
          <p className='text-zinc-400 font-semibold text-lg leading-relaxed max-w-md'>
            Experience the next generation of online learning. Secure,
            intuitive, and designed specifically for modern students.
          </p>
        </div>

        {/* Bottom Footer Info */}
        <div className='relative z-10 flex items-center justify-between border-t border-zinc-800/40 pt-6'>
          <p className='text-zinc-500 font-bold text-base'>
            &copy; 2026 Canadian Nest School. All rights reserved.
          </p>
        </div>
      </aside>

      {/* ─── RIGHT PANE: INTERACTIVE NEW PASSWORD FORM ─── */}
      <main className='flex-1 w-full md:w-1/2 flex items-center justify-center bg-white p-8 sm:p-12 md:p-16 relative'>
        <div className='w-full max-w-md'>
          <Suspense
            fallback={
              <div className='flex flex-col items-center justify-center gap-4'>
                <div className='h-10 w-10 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
                <p className='text-base font-bold text-zinc-400'>
                  Loading Recovery Wizard...
                </p>
              </div>
            }
          >
            <ResetPasswordFormContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
