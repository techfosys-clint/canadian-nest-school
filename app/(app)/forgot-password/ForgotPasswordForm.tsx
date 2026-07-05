'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  FiArrowLeft,
  FiArrowRight,
  FiLock,
  FiMail,
  FiPhone,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

const swalTheme = {
  confirmButtonColor: '#E61C24',
  background: '#1a1a1a',
  color: '#ffffff',
  customClass: {
    popup: 'rounded-lg',
    confirmButton: 'rounded-lg text-base font-bold px-6 py-2.5 bg-[#E61C24]',
  },
};

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [method, setMethod] = useState<'email' | 'phone'>('phone');

  // Email flow state
  const [email, setEmail] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // Phone + OTP flow state
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Email',
        text: 'Please enter your email address.',
        ...swalTheme,
      });
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setEmailSubmitted(true);
        Swal.fire({
          icon: 'success',
          title: 'Reset Email Sent',
          text: 'If that email exists in our system, we have sent password reset instructions.',
          ...swalTheme,
        });
      } else {
        throw new Error(data.error || 'Failed to send reset link.');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Reset Failed',
        text: err.message || 'Something went wrong.',
        ...swalTheme,
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    if (!phone) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Phone Number',
        text: 'Please enter your mobile number.',
        ...swalTheme,
      });
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch('/api/auth/forgot-password-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        setCountdown(60);
        Swal.fire({
          icon: 'success',
          title: 'OTP Sent',
          text: 'Please check your phone for the verification code.',
          ...swalTheme,
        });
      } else {
        throw new Error(data.error || 'Failed to send OTP.');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Failed to Send OTP',
        text: err.message || 'Something went wrong.',
        ...swalTheme,
      });
    } finally {
      setSendingOtp(false);
    }
  };

  const handlePhoneResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp) {
      Swal.fire({
        icon: 'error',
        title: 'Missing OTP',
        text: 'Please enter the verification code sent to your phone.',
        ...swalTheme,
      });
      return;
    }
    if (newPassword.length < 6) {
      Swal.fire({
        icon: 'error',
        title: 'Weak Password',
        text: 'Password must be at least 6 characters long.',
        ...swalTheme,
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Passwords Do Not Match',
        text: 'Please make sure both password fields match.',
        ...swalTheme,
      });
      return;
    }

    setResettingPassword(true);
    try {
      const res = await fetch('/api/auth/forgot-password-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, password: newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Password Reset!',
          text: 'Your password has been reset successfully.',
          ...swalTheme,
        });
        router.push('/dashboard');
      } else {
        throw new Error(data.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Reset Failed',
        text: err.message || 'Something went wrong.',
        ...swalTheme,
      });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <div className='min-h-screen w-full flex flex-col md:flex-row bg-white overflow-hidden font-sans'>
      {/* ─── LEFT PANE: BRAND EXPERIENCE & MARKETING COVER (MD+ only) ─── */}
      <aside className='hidden md:flex md:w-1/2 flex-col justify-between bg-[#070b19] p-12 text-white relative select-none'>
        <div className='absolute top-1/4 left-10 w-80 h-80 bg-[#E61C24]/15 rounded-full blur-3xl pointer-events-none' />

        <div className='relative z-10'>
          <Link
            href='/'
            className='inline-flex items-center group bg-white px-3 py-1.5 rounded-lg shadow-sm w-fit'
          >
            <Image
              src='/logo.png'
              alt='Canadian Nest School'
              className='h-12 w-auto object-contain'
              width={100}
              height={100}
            />
          </Link>
        </div>

        <div className='relative z-10 my-auto py-12 space-y-6'>
          <span className='px-3.5 py-1 text-base font-bold text-[#E61C24] bg-[#E61C24]/10 rounded-lg border border-[#E61C24]/20 uppercase tracking-wider w-fit block'>
            Forgot Password
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

        <div className='relative z-10 flex items-center justify-between border-t border-zinc-800/40 pt-6'>
          <p className='text-zinc-500 font-bold text-base'>
            &copy; 2026 Canadian Nest School. All rights reserved.
          </p>
        </div>
      </aside>

      {/* ─── RIGHT PANE: INTERACTIVE FORGOT PASSWORD FORM ─── */}
      <main className='flex-1 w-full md:w-1/2 flex items-center justify-center bg-white p-8 sm:p-12 md:p-16 relative'>
        <div className='w-full max-w-md space-y-8'>
          <div className='flex items-center justify-between md:hidden mb-6'>
            <Link href='/' className='flex items-center group'>
              <Image
                src='/logo.png'
                alt='Canadian Nest School'
                className='h-10 w-auto object-contain'
                width={100}
                height={100}
              />
            </Link>
            <span className='px-2.5 py-0.5 text-base font-bold text-[#E61C24] bg-[#E61C24]/10 rounded-lg border border-[#E61C24]/20 uppercase'>
              Forgot Password
            </span>
          </div>

          <div className='space-y-2'>
            <p className='text-[#E61C24] text-base font-bold uppercase tracking-wider'>
              Reset Access
            </p>
            <h2 className='text-3xl font-bold tracking-tight text-zinc-900 font-display'>
              Recover Password
            </h2>
            <p className='text-zinc-550 font-semibold text-base leading-relaxed'>
              Choose how you&apos;d like to verify your identity to reset your
              password.
            </p>
          </div>

          {/* Method Switcher */}
          <div className='flex gap-2 p-1 bg-zinc-100 rounded-lg w-fit'>
            <button
              type='button'
              onClick={() => setMethod('phone')}
              className={`px-4 py-2 rounded-lg text-base font-bold transition-all cursor-pointer ${
                method === 'phone'
                  ? 'bg-white text-[#E61C24] shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Mobile Number
            </button>
            <button
              type='button'
              onClick={() => setMethod('email')}
              className={`px-4 py-2 rounded-lg text-base font-bold transition-all cursor-pointer ${
                method === 'email'
                  ? 'bg-white text-[#E61C24] shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              Email
            </button>
          </div>

          {/* EMAIL FLOW */}
          {method === 'email' &&
            (!emailSubmitted ? (
              <form onSubmit={handleEmailSubmit} className='space-y-6'>
                <div className='flex flex-col gap-1.5'>
                  <label
                    htmlFor='email'
                    className='text-base font-bold text-zinc-700'
                  >
                    Email Address
                  </label>
                  <div className='relative'>
                    <FiMail className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5' />
                    <input
                      id='email'
                      type='email'
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder='you@example.com'
                      className='w-full bg-white border border-zinc-200 focus:border-[#E61C24] focus:ring-4 focus:ring-[#E61C24]/10 text-zinc-900 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all placeholder-zinc-400'
                    />
                  </div>
                </div>

                <button
                  type='submit'
                  disabled={emailLoading}
                  className='w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 transition-all duration-200 cursor-pointer disabled:opacity-50'
                >
                  {emailLoading ? (
                    <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <FiArrowRight className='h-5 w-5' />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className='space-y-6 text-center'>
                <div className='bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 rounded-lg p-4 text-base font-semibold leading-relaxed text-left'>
                  📩 A password recovery link has been dispatched to{' '}
                  <strong>{email}</strong>. Please check your inbox and spam
                  folders to proceed!
                </div>
                <button
                  onClick={() => setEmailSubmitted(false)}
                  className='text-base font-bold text-[#E61C24] hover:text-[#CC181F] transition-colors cursor-pointer'
                >
                  Didn&apos;t receive it? Request another link
                </button>
              </div>
            ))}

          {/* PHONE + OTP FLOW */}
          {method === 'phone' && (
            <form onSubmit={handlePhoneResetSubmit} className='space-y-5'>
              <div className='flex flex-col gap-1.5'>
                <label
                  htmlFor='phone'
                  className='text-base font-bold text-zinc-700'
                >
                  Mobile Number
                </label>
                <div className='flex gap-2'>
                  <div className='relative flex-1'>
                    <div className='absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none'>
                      <FiPhone className='text-zinc-400 h-5 w-5 mr-2' />
                      <span className='text-zinc-500 font-bold text-base border-r border-zinc-200 pr-2'>
                        +88
                      </span>
                    </div>
                    <input
                      id='phone'
                      type='tel'
                      required
                      disabled={otpSent}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder='01XXXXXXXXX'
                      className='w-full bg-white border border-zinc-200 focus:border-[#E61C24] focus:ring-4 focus:ring-[#E61C24]/10 text-zinc-900 rounded-lg pl-[5.5rem] pr-4 py-3.5 text-base font-semibold outline-none transition-all placeholder-zinc-400 disabled:bg-zinc-50 disabled:text-zinc-500'
                    />
                  </div>
                  <button
                    type='button'
                    onClick={handleSendPhoneOtp}
                    disabled={sendingOtp || countdown > 0}
                    className='px-4 min-w-[140px] flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-base whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                  >
                    {sendingOtp ? (
                      <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    ) : countdown > 0 ? (
                      `Resend in ${countdown}s`
                    ) : otpSent ? (
                      'Resend'
                    ) : (
                      'Send OTP'
                    )}
                  </button>
                </div>
              </div>

              {otpSent && (
                <>
                  <div className='flex flex-col gap-1.5'>
                    <label
                      htmlFor='otp'
                      className='text-base font-bold text-zinc-700'
                    >
                      Verification Code
                    </label>
                    <input
                      id='otp'
                      type='text'
                      inputMode='numeric'
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder='6-digit code'
                      className='w-full bg-white border border-zinc-200 focus:border-[#E61C24] focus:ring-4 focus:ring-[#E61C24]/10 text-zinc-900 rounded-lg px-4 py-3.5 text-base font-semibold outline-none transition-all placeholder-zinc-400'
                    />
                  </div>

                  <div className='flex flex-col gap-1.5'>
                    <label
                      htmlFor='newPassword'
                      className='text-base font-bold text-zinc-700'
                    >
                      New Password
                    </label>
                    <div className='relative'>
                      <FiLock className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5' />
                      <input
                        id='newPassword'
                        type='password'
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder='Minimum 6 characters'
                        className='w-full bg-white border border-zinc-200 focus:border-[#E61C24] focus:ring-4 focus:ring-[#E61C24]/10 text-zinc-900 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all placeholder-zinc-400'
                      />
                    </div>
                  </div>

                  <div className='flex flex-col gap-1.5'>
                    <label
                      htmlFor='confirmPassword'
                      className='text-base font-bold text-zinc-700'
                    >
                      Confirm New Password
                    </label>
                    <div className='relative'>
                      <FiLock className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 h-5 w-5' />
                      <input
                        id='confirmPassword'
                        type='password'
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder='Retype new password'
                        className='w-full bg-white border border-zinc-200 focus:border-[#E61C24] focus:ring-4 focus:ring-[#E61C24]/10 text-zinc-900 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all placeholder-zinc-400'
                      />
                    </div>
                  </div>

                  <button
                    type='submit'
                    disabled={resettingPassword}
                    className='w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 transition-all duration-200 cursor-pointer disabled:opacity-50'
                  >
                    {resettingPassword ? (
                      <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Footer Back Links */}
          <div className='pt-6 border-t border-zinc-100 flex items-center justify-center'>
            <Link
              href='/login'
              className='inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-800 text-base font-bold transition-colors'
            >
              <FiArrowLeft className='h-4.5 w-4.5' />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
