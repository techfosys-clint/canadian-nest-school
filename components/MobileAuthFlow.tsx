'use client';

import { generateEventId, pushToDataLayer } from '@/lib/gtm';
import { sendGTMEvent } from '@next/third-parties/google';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import {
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPhone,
  FiUser,
} from 'react-icons/fi';

export interface MobileAuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

type AuthStep = 'phone' | 'password' | 'otp' | 'register';

interface MobileAuthFlowProps {
  onSuccess: (user: MobileAuthUser) => void;
  /** Visual chrome: bordered card (checkout) or bare (login page column) */
  variant?: 'card' | 'bare';
  heading?: string;
  subheading?: string;
  /** GTM sign_up method label */
  signUpMethod?: string;
}

const inputClass =
  'w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white disabled:bg-zinc-50 disabled:text-zinc-500';

export default function MobileAuthFlow({
  onSuccess,
  variant = 'card',
  heading,
  subheading,
  signUpMethod = 'mobile_auth_flow',
}: MobileAuthFlowProps) {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const pushUserData = (user: MobileAuthUser) => {
    pushToDataLayer({
      event: 'user_data_ready',
      event_id: generateEventId(),
      user_data: {
        user_id: user.id,
        email: user.email,
        phone_number: user.phone || '',
        first_name: user.name ? user.name.split(' ')[0] : '',
        last_name:
          user.name && user.name.includes(' ')
            ? user.name.split(' ').slice(1).join(' ')
            : '',
        city: '',
        country: 'BD',
      },
    });
  };

  const resetToPhone = () => {
    setStep('phone');
    setPassword('');
    setOtp('');
    setName('');
    setEmail('');
    setRegPassword('');
    setCountdown(0);
    setError(null);
    setSuccess(null);
  };

  const sendOtp = async (targetPhone: string) => {
    setSendingOtp(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }
      setCountdown(60);
      setSuccess('OTP sent! Check your phone for the verification code.');
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
      throw err;
    } finally {
      setSendingOtp(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!phone.trim()) {
      setError('Please enter your mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to verify this mobile number.');
      }

      if (data.exists) {
        setStep('password');
        setSuccess(null);
      } else {
        await sendOtp(phone.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: phone.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid mobile number or password.');
      }

      pushUserData(data.user);
      setSuccess(`Welcome back, ${data.user.name}!`);
      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!otp.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Incorrect OTP.');
      }

      setSuccess(
        'Phone verified! Enter the student’s details below to finish signup.',
      );
      setStep('register');
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim() || !regPassword) {
      setError('Please fill in your name, email, and password.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: regPassword,
          phone: phone.trim(),
          role: 'student',
        }),
      });
      const regData = await regRes.json();

      if (!regRes.ok || !regData.success) {
        throw new Error(regData.error || 'Registration failed.');
      }

      const loginEmail = regData.user?.email || email.trim();
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: regPassword }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok || !loginData.success) {
        throw new Error(
          loginData.error ||
            'Account created, but sign-in failed. Please try signing in.',
        );
      }

      sendGTMEvent({
        event: 'sign_up',
        method: signUpMethod,
      });
      pushUserData(loginData.user);
      setSuccess(`Account created! Welcome, ${loginData.user.name}.`);
      onSuccess(loginData.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const stepCopy: Record<
    AuthStep,
    { title: string; description: string }
  > = {
    phone: {
      title: heading || 'Continue with mobile number',
      description:
        subheading ||
        'Enter your mobile number to sign in or create a student account.',
    },
    password: {
      title: 'Welcome back',
      description: `Enter the password for ${phone.trim()}.`,
    },
    otp: {
      title: 'Verify your number',
      description: `We sent a code to ${phone.trim()}. Enter it below.`,
    },
    register: {
      title: 'Complete student account',
      description:
        'Enter the student’s details below (not the parent’s) to finish creating the account.',
    },
  };

  const shellClass =
    variant === 'card'
      ? 'bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-6'
      : 'space-y-6';

  return (
    <div className={shellClass}>
      <div>
        <h3 className='text-xl font-bold text-zinc-800'>
          {stepCopy[step].title}
        </h3>
        <p className='text-base font-semibold text-zinc-500 mt-1'>
          {stepCopy[step].description}
        </p>
      </div>

      {error && (
        <div className='p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 font-semibold text-base'>
          {error}
        </div>
      )}

      {success && (
        <div className='p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-base'>
          {success}
        </div>
      )}

      {step === 'phone' && (
        <form onSubmit={handlePhoneSubmit} className='space-y-4'>
          <div className='space-y-1.5'>
            <label className='text-base font-bold text-zinc-700'>
              Mobile Number
            </label>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none'>
                <FiPhone className='text-zinc-400 h-5 w-5 mr-2' />
                <span className='text-zinc-500 font-bold text-base border-r border-zinc-200 pr-2'>
                  +88
                </span>
              </div>
              <input
                type='tel'
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder='01XXXXXXXXX'
                autoComplete='tel'
                className='w-full pl-22 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white'
              />
            </div>
          </div>

          <button
            type='submit'
            disabled={loading || sendingOtp}
            className='w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading || sendingOtp ? (
              <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
            ) : (
              <>
                <span>Continue</span>
                <FiArrowRight className='h-5 w-5' />
              </>
            )}
          </button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} className='space-y-4'>
          <div className='space-y-1.5'>
            <label className='text-base font-bold text-zinc-700'>Password</label>
            <div className='relative'>
              <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                <FiLock className='h-5 w-5' />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='••••••••'
                autoComplete='current-password'
                className='w-full pl-11 pr-11 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white'
              />
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors'
              >
                {showPassword ? (
                  <FiEyeOff className='h-5 w-5' />
                ) : (
                  <FiEye className='h-5 w-5' />
                )}
              </button>
            </div>
          </div>

          <div className='flex items-center justify-between text-base font-semibold'>
            <button
              type='button'
              onClick={resetToPhone}
              className='text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer'
            >
              Change number
            </button>
            <Link
              href='/forgot-password'
              className='text-[#E61C24] hover:text-[#CC181F] transition-colors font-bold'
            >
              Forgot password?
            </Link>
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading ? (
              <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
            ) : (
              <>
                <span>Sign In & Continue</span>
                <FiArrowRight className='h-5 w-5' />
              </>
            )}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className='space-y-4'>
          <div className='space-y-1.5'>
            <label className='text-base font-bold text-zinc-700'>
              Verification Code
            </label>
            <input
              type='text'
              inputMode='numeric'
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder='6-digit code'
              autoComplete='one-time-code'
              className='w-full px-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white'
            />
          </div>

          <div className='flex items-center justify-between text-base font-semibold'>
            <button
              type='button'
              onClick={resetToPhone}
              className='text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer'
            >
              Change number
            </button>
            <button
              type='button'
              onClick={() => sendOtp(phone.trim()).catch(() => {})}
              disabled={sendingOtp || countdown > 0}
              className='text-[#E61C24] hover:text-[#CC181F] transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            >
              {sendingOtp
                ? 'Sending…'
                : countdown > 0
                  ? `Resend in ${countdown}s`
                  : 'Resend OTP'}
            </button>
          </div>

          <button
            type='submit'
            disabled={verifyingOtp}
            className='w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {verifyingOtp ? (
              <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
            ) : (
              <>
                <span>Verify OTP</span>
                <FiCheck className='h-5 w-5' />
              </>
            )}
          </button>
        </form>
      )}

      {step === 'register' && (
        <form onSubmit={handleRegisterSubmit} className='space-y-4'>
          <div className='space-y-1.5'>
            <label className='text-base font-bold text-zinc-700'>
              Student Name
            </label>
            <div className='relative'>
              <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                <FiUser className='h-5 w-5' />
              </span>
              <input
                type='text'
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Student's full name"
                autoComplete='name'
                className={inputClass}
              />
            </div>
            <p className='text-base font-semibold text-zinc-500'>
              Use the learner’s name, not the parent’s.
            </p>
          </div>

          <div className='space-y-1.5'>
            <label className='text-base font-bold text-zinc-700'>
              Student Email
            </label>
            <div className='relative'>
              <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                <FiMail className='h-5 w-5' />
              </span>
              <input
                type='email'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='student@example.com'
                autoComplete='email'
                className={inputClass}
              />
            </div>
          </div>

          <div className='space-y-1.5'>
            <label className='text-base font-bold text-zinc-700'>
              Student Password (Min 6 chars)
            </label>
            <div className='relative'>
              <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                <FiLock className='h-5 w-5' />
              </span>
              <input
                type={showRegPassword ? 'text' : 'password'}
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder='••••••••'
                autoComplete='new-password'
                className='w-full pl-11 pr-11 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white'
              />
              <button
                type='button'
                onClick={() => setShowRegPassword(!showRegPassword)}
                className='absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 transition-colors'
              >
                {showRegPassword ? (
                  <FiEyeOff className='h-5 w-5' />
                ) : (
                  <FiEye className='h-5 w-5' />
                )}
              </button>
            </div>
          </div>

          <button
            type='button'
            onClick={resetToPhone}
            className='text-base font-semibold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer'
          >
            Change number
          </button>

          <button
            type='submit'
            disabled={loading}
            className='w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {loading ? (
              <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
            ) : (
              <>
                <span>Create Account & Continue</span>
                <FiArrowRight className='h-5 w-5' />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
