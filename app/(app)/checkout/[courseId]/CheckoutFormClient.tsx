'use client';
import { generateEventId, pushToDataLayer } from '@/lib/gtm';
import { parseJsonResponse } from '@/lib/safeJson';
import { sendGTMEvent } from '@next/third-parties/google';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPhone,
  FiTag,
  FiUser,
  FiZap,
} from 'react-icons/fi';

interface CourseData {
  id: string;
  title: string;
  summary: string;
  price: number;
  imageUrl: string;
  instructorName: string;
  categoryName: string;
  slug: string;
}

interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export default function CheckoutFormClient({ course }: { course: CourseData }) {
  // Auth states
  const [user, setUser] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('register');
  const [showPassword, setShowPassword] = useState(false);

  // Login form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Register form states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpVerified, setRegOtpVerified] = useState(false);
  const [sendingRegOtp, setSendingRegOtp] = useState(false);
  const [verifyingRegOtp, setVerifyingRegOtp] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Checkout states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // Pop-up free inline alert states
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState<string | null>(null);

  // Check login session on mount
  useEffect(() => {
    // Fire begin_checkout GTM event
    pushToDataLayer({
      event: 'begin_checkout',
      event_id: generateEventId(),
      ecommerce: {
        currency: 'BDT',
        value: course.price,
        coupon: '',
        items: [
          {
            item_id: course.id,
            item_name: course.title,
            item_category: course.categoryName,
            price: course.price,
            quantity: 1,
          },
        ],
      },
      user_data: user
        ? {
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
          }
        : undefined,
    });

    async function getSession() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setUser(data.user);

          pushToDataLayer({
            event: 'user_data_ready',
            event_id: generateEventId(),
            user_data: {
              user_id: data.user.id,
              email: data.user.email,
              phone_number: data.user.phone || '',
              first_name: data.user.name ? data.user.name.split(' ')[0] : '',
              last_name:
                data.user.name && data.user.name.includes(' ')
                  ? data.user.name.split(' ').slice(1).join(' ')
                  : '',
              city: '',
              country: 'BD',
            },
          });
        }
      } catch (err) {
        console.error('Session verify failed:', err);
      } finally {
        setLoadingSession(false);
      }
    }
    getSession();
  }, [course.categoryName, course.id, course.price, course.title, user]);

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!loginEmail || !loginPassword) {
      setAuthError('Please fill in both email and password.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        setAuthSuccess(
          `Welcome back, ${data.user.name}! Continue to complete your purchase.`,
        );

        pushToDataLayer({
          event: 'user_data_ready',
          event_id: generateEventId(),
          user_data: {
            user_id: data.user.id,
            email: data.user.email,
            phone_number: data.user.phone || '',
            first_name: data.user.name ? data.user.name.split(' ')[0] : '',
            last_name:
              data.user.name && data.user.name.includes(' ')
                ? data.user.name.split(' ').slice(1).join(' ')
                : '',
            city: '',
            country: 'BD',
          },
        });
      } else {
        throw new Error(data.message || 'Invalid email or password.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle OTP send for inline registration
  const handleSendRegOtp = async () => {
    if (!regPhone) {
      setAuthError('Please enter your mobile number first.');
      return;
    }
    setAuthError(null);
    setSendingRegOtp(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegOtpSent(true);
        setCountdown(60);
        setAuthSuccess(
          'OTP sent! Please check your phone for the verification code.',
        );
      } else {
        throw new Error(data.error || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send OTP.');
    } finally {
      setSendingRegOtp(false);
    }
  };

  // Handle OTP verify for inline registration
  const handleVerifyRegOtp = async () => {
    if (!regOtp) {
      setAuthError('Please enter the verification code sent to your phone.');
      return;
    }
    setAuthError(null);
    setVerifyingRegOtp(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: regPhone, otp: regOtp }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegOtpVerified(true);
        setAuthSuccess('Phone number verified successfully!');
      } else {
        throw new Error(data.error || 'Incorrect OTP.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Verification failed.');
    } finally {
      setVerifyingRegOtp(false);
    }
  };

  // Handle Registration submission + silent login
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    if (!regName || !regPhone || !regEmail || !regPassword) {
      setAuthError(
        'Please fill in your name, mobile number, email, and password.',
      );
      return;
    }
    if (!regOtpVerified) {
      setAuthError('Please verify your mobile number with the OTP code first.');
      return;
    }
    if (regPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    setAuthLoading(true);
    try {
      // 1. Create account
      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          role: 'student',
        }),
      });
      const regData = await regRes.json();

      if (!regRes.ok || !regData.success) {
        throw new Error(
          regData.error ||
            'Registration failed. Phone number might already be registered.',
        );
      }

      // 2. Perform silent login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regPhone, password: regPassword }),
      });
      const loginData = await loginRes.json();

      if (loginRes.ok && loginData.success) {
        sendGTMEvent({
          event: 'sign_up',
          method: 'checkout_inline',
        });
        setUser(loginData.user);
        setAuthSuccess(
          `Account created successfully! Welcome, ${loginData.user.name}.`,
        );

        pushToDataLayer({
          event: 'user_data_ready',
          event_id: generateEventId(),
          user_data: {
            user_id: loginData.user.id,
            email: loginData.user.email,
            phone_number: loginData.user.phone || '',
            first_name: loginData.user.name
              ? loginData.user.name.split(' ')[0]
              : '',
            last_name:
              loginData.user.name && loginData.user.name.includes(' ')
                ? loginData.user.name.split(' ').slice(1).join(' ')
                : '',
            city: '',
            country: 'BD',
          },
        });
      } else {
        throw new Error(
          'Registration succeeded, but login failed. Please sign in manually.',
        );
      }
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Coupon code verification
  const handleApplyCoupon = async () => {
    setCouponError('');
    setCouponSuccess('');
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, courseId: course.id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAppliedCoupon(data.coupon);
        setCouponCode(data.coupon.code);
        setCouponSuccess(`Coupon "${data.coupon.code}" applied successfully!`);
      } else {
        throw new Error(data.error || 'Invalid coupon.');
      }
    } catch (err: any) {
      setCouponError(err.message);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setCouponSuccess('');
  };

  // Recalculate prices
  const basePrice = course.price;
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (basePrice * appliedCoupon.discountValue) / 100;
    } else {
      discountAmount = appliedCoupon.discountValue;
    }
  }
  // Never show a discount larger than the course price
  discountAmount = Math.min(discountAmount, basePrice);
  const finalPrice = Math.max(0, basePrice - discountAmount);

  // Complete course purchase / checkout
  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setCheckoutSuccess(null);

    setPurchaseLoading(true);
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        }),
      });
      const data = await parseJsonResponse(response);

      if (response.ok && data.success && data.redirectUrl) {
        // Paid course — hand off to the EPS payment gateway. The purchase
        // event fires from the dashboard once the callback confirms payment.
        window.location.href = data.redirectUrl;
        return;
      }

      if (response.ok && data.success) {
        pushToDataLayer({
          event: 'purchase',
          event_id: generateEventId(),
          ecommerce: {
            transaction_id: data.enrollmentId || `txn_${Date.now()}`,
            currency: 'BDT',
            value: finalPrice,
            coupon: appliedCoupon ? appliedCoupon.code : '',
            items: [
              {
                item_id: course.id,
                item_name: course.title,
                item_category: course.categoryName,
                price: course.price,
                quantity: 1,
              },
            ],
          },
          user_data: user
            ? {
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
              }
            : undefined,
        });

        setCheckoutSuccess(
          `You have successfully purchased and enrolled in "${course.title}".`,
        );
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        throw new Error(data.error || 'Failed to complete transaction.');
      }
    } catch (err: any) {
      setCheckoutError(
        err.message || 'There was an issue processing your checkout.',
      );
    } finally {
      setPurchaseLoading(false);
    }
  };

  if (loadingSession) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-zinc-50'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
          <p className='text-base font-bold text-zinc-600'>
            Loading Checkout Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-6 pt-28 pb-16'>
      {/* Back button */}
      <Link
        href={`/courses/${course.slug}`}
        className='inline-flex items-center gap-2 text-base font-bold text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group'
      >
        <FiChevronLeft className='h-5 w-5 transition-transform group-hover:-translate-x-0.5' />
        <span>Return to Course Page</span>
      </Link>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start'>
        {/* LEFT COLUMN: AUTH WORKSPACE OR CHECKOUT BILLING */}
        <div className='lg:col-span-7 space-y-8 order-2 lg:order-1'>
          {!user ? (
            /* USER IS ANONYMOUS: SIGN IN OR SIGN UP WORKSPACE */
            <div className='bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-6'>
              {/* Tab Header */}
              <div className='flex border-b border-zinc-200'>
                <button
                  onClick={() => setAuthTab('login')}
                  className={`flex-1 pb-4 text-base font-bold transition-all border-b-2 text-center select-none ${
                    authTab === 'login'
                      ? 'border-[#E61C24] text-[#E61C24]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthTab('register')}
                  className={`flex-1 pb-4 text-base font-bold transition-all border-b-2 text-center select-none ${
                    authTab === 'register'
                      ? 'border-[#E61C24] text-[#E61C24]'
                      : 'border-transparent text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authTab === 'login' ? (
                /* INLINE LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className='space-y-4'>
                  <div>
                    <h3 className='text-xl font-bold text-zinc-800'>
                      Sign in to complete purchase
                    </h3>
                    <p className='text-sm font-semibold text-zinc-450 mt-1'>
                      Access your student credentials to log your enrollment.
                    </p>
                  </div>

                  {authError && (
                    <div className='p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-650 font-semibold text-base'>
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className='p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-base animate-pulse'>
                      {authSuccess}
                    </div>
                  )}

                  <div className='space-y-4 pt-2'>
                    <div className='space-y-1.5'>
                      <label className='text-base font-bold text-zinc-700'>
                        Email Address or Mobile Number
                      </label>
                      <div className='relative'>
                        <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                          <FiMail className='h-5 w-5' />
                        </span>
                        <input
                          type='text'
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder='you@example.com or 01XXXXXXXXX'
                          className='w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white'
                        />
                      </div>
                    </div>

                    <div className='space-y-1.5'>
                      <label className='text-base font-bold text-zinc-700'>
                        Password
                      </label>
                      <div className='relative'>
                        <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                          <FiLock className='h-5 w-5' />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder='••••••••'
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

                    <button
                      type='submit'
                      disabled={authLoading}
                      className='w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer mt-4'
                    >
                      {authLoading ? (
                        <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                      ) : (
                        <>
                          <span>Sign In & Continue</span>
                          <FiArrowRight className='h-5 w-5' />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* INLINE REGISTER FORM */
                <form onSubmit={handleRegisterSubmit} className='space-y-4'>
                  <div>
                    <h3 className='text-xl font-bold text-zinc-800'>
                      Register new student account
                    </h3>
                    <p className='text-sm font-semibold text-zinc-450 mt-1'>
                      Set up your credentials to manage courses and trace
                      progress.
                    </p>
                  </div>

                  {authError && (
                    <div className='p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-655 font-semibold text-base'>
                      {authError}
                    </div>
                  )}

                  {authSuccess && (
                    <div className='p-3.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-base animate-pulse'>
                      {authSuccess}
                    </div>
                  )}

                  <div className='space-y-4 pt-2'>
                    <div className='space-y-1.5'>
                      <label className='text-base font-bold text-zinc-700'>
                        Full Name
                      </label>
                      <div className='relative'>
                        <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                          <FiUser className='h-5 w-5' />
                        </span>
                        <input
                          type='text'
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder='John Doe'
                          className='w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white'
                        />
                      </div>
                    </div>

                    <div className='space-y-1.5'>
                      <label className='text-base font-bold text-zinc-700'>
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
                            type='tel'
                            required
                            disabled={regOtpVerified}
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder='01XXXXXXXXX'
                            className='w-full pl-22 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white disabled:bg-zinc-50 disabled:text-zinc-500'
                          />
                        </div>
                        <button
                          type='button'
                          onClick={handleSendRegOtp}
                          disabled={
                            sendingRegOtp || regOtpVerified || countdown > 0
                          }
                          className='px-4 min-w-35 flex items-center justify-center rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-base whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                        >
                          {sendingRegOtp ? (
                            <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                          ) : regOtpVerified ? (
                            <FiCheck className='h-5 w-5' />
                          ) : countdown > 0 ? (
                            `Resend in ${countdown}s`
                          ) : regOtpSent ? (
                            'Resend'
                          ) : (
                            'Send OTP'
                          )}
                        </button>
                      </div>
                    </div>

                    {regOtpSent && !regOtpVerified && (
                      <div className='space-y-1.5'>
                        <label className='text-base font-bold text-zinc-700'>
                          Verification Code
                        </label>
                        <div className='flex gap-2'>
                          <input
                            type='text'
                            inputMode='numeric'
                            value={regOtp}
                            onChange={(e) => setRegOtp(e.target.value)}
                            placeholder='6-digit code'
                            className='flex-1 px-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white'
                          />
                          <button
                            type='button'
                            onClick={handleVerifyRegOtp}
                            disabled={verifyingRegOtp}
                            className='px-4 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base whitespace-nowrap transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                          >
                            {verifyingRegOtp ? '...' : 'Verify'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className='space-y-1.5'>
                      <label className='text-base font-bold text-zinc-700'>
                        Email Address
                      </label>
                      <div className='relative'>
                        <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                          <FiMail className='h-5 w-5' />
                        </span>
                        <input
                          type='email'
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder='you@example.com'
                          className='w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base transition-all font-semibold text-zinc-800 placeholder-zinc-400 bg-white'
                        />
                      </div>
                    </div>

                    <div className='space-y-1.5'>
                      <label className='text-base font-bold text-zinc-700'>
                        Password (Min 6 chars)
                      </label>
                      <div className='relative'>
                        <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                          <FiLock className='h-5 w-5' />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder='••••••••'
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

                    <button
                      type='submit'
                      disabled={authLoading}
                      className='w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer mt-4'
                    >
                      {authLoading ? (
                        <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                      ) : (
                        <>
                          <span>Create Account & Sign In</span>
                          <FiArrowRight className='h-5 w-5' />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* USER IS AUTHENTICATED: COUPON + PURCHASE (no billing on course checkout) */
            <div className='space-y-6'>
              <form onSubmit={handleCompletePurchase} className='space-y-6'>
                {checkoutError && (
                  <div className='p-3.5 bg-rose-50 border border-rose-105 rounded-lg text-rose-650 font-semibold text-base'>
                    {checkoutError}
                  </div>
                )}

                {checkoutSuccess && (
                  <div className='p-4 bg-emerald-50 border border-emerald-150 rounded-lg text-emerald-800 text-center flex flex-col items-center gap-2'>
                    <FiCheckCircle className='h-7 w-7 text-emerald-500 animate-bounce' />
                    <span className='font-bold text-lg leading-tight'>
                      Purchase Confirmed!
                    </span>
                    <span className='text-base font-semibold text-emerald-700 leading-relaxed'>
                      {checkoutSuccess}
                    </span>
                    <span className='text-zinc-500 text-base font-semibold mt-1 animate-pulse'>
                      Redirecting you to active learning space...
                    </span>
                  </div>
                )}

                {/* Promo Code */}
                <div className='bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-4'>
                  <label className='text-base font-bold text-zinc-800 flex items-center gap-2'>
                    <FiTag className='text-[#E61C24]' />
                    Apply Coupon / Promo Code
                  </label>

                  <div className='flex gap-2'>
                    <input
                      type='text'
                      placeholder='e.g. SAVE20'
                      value={couponCode}
                      onChange={(e) => {
                        const next = e.target.value.toUpperCase();
                        setCouponCode(next);
                        if (
                          appliedCoupon &&
                          next.trim() !== appliedCoupon.code
                        ) {
                          setAppliedCoupon(null);
                          setCouponSuccess('');
                        }
                        setCouponError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      className='flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-200 focus:border-[#E61C24] outline-none text-base transition-all font-mono font-bold text-zinc-800'
                    />
                    {appliedCoupon ? (
                      <button
                        type='button'
                        onClick={handleRemoveCoupon}
                        className='px-5 rounded-lg border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 font-bold text-base transition-all cursor-pointer select-none'
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type='button'
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                        className='px-5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-base transition-all cursor-pointer flex items-center justify-center select-none'
                      >
                        {couponLoading ? (
                          <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    )}
                  </div>

                  {couponError && (
                    <div className='flex items-center gap-1.5 text-rose-500 text-base font-semibold'>
                      <FiAlertCircle className='h-4.5 w-4.5 shrink-0' />
                      <span>{couponError}</span>
                    </div>
                  )}

                  {couponSuccess && appliedCoupon && (
                    <div className='flex items-center gap-1.5 text-emerald-600 text-base font-semibold'>
                      <FiCheck className='h-4.5 w-4.5 shrink-0' />
                      <span>{couponSuccess}</span>
                    </div>
                  )}
                </div>

                <button
                  type='submit'
                  disabled={purchaseLoading}
                  className='w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer'
                >
                  {purchaseLoading ? (
                    <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  ) : (
                    <>
                      <FiZap className='h-5 w-5 fill-white' />
                      <span>
                        Complete Course Purchase (
                        {!finalPrice || finalPrice === 0
                          ? 'Free'
                          : `৳${finalPrice.toLocaleString('en-BD')}`}
                        )
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: STICKY COURSE SUMMARY CARD & COUPON APPLICATION */}
        <div className='lg:col-span-5 relative z-10 w-full order-1 lg:order-2 space-y-6 lg:sticky lg:top-32'>
          {/* Sticky Course details widget */}
          <div className='bg-white border border-zinc-200 rounded-lg overflow-hidden'>
            {/* Banner image */}
            {course.imageUrl && (
              <div className='aspect-16/10 overflow-hidden bg-zinc-50 border-b border-zinc-100 relative'>
                <Image
                  src={course.imageUrl}
                  alt={course.title}
                  className='w-full h-full object-cover'
                  width={610}
                  height={380}
                />
              </div>
            )}

            <div className='p-6 space-y-6'>
              {/* Category, Title, Instructor */}
              <div className='space-y-2'>
                {course.categoryName && (
                  <span className='inline-block px-3 py-1 bg-[#E61C24]/10 rounded-lg font-bold text-xs text-[#E61C24] uppercase tracking-wide'>
                    {course.categoryName}
                  </span>
                )}
                <h2 className='text-xl sm:text-2xl font-bold text-zinc-800 tracking-tight leading-snug'>
                  {course.title}
                </h2>
                <p className='text-base font-semibold text-zinc-500'>
                  Instructed by{' '}
                  <span className='font-bold text-zinc-800'>
                    {course.instructorName}
                  </span>
                </p>
              </div>

              {/* Price list breakdown */}
              <div className='border-t border-zinc-100 pt-5 space-y-3.5'>
                <p className='text-base font-bold text-zinc-800'>
                  Order Investment Summary
                </p>

                <div className='flex justify-between items-center text-base font-semibold text-zinc-600'>
                  <span>Base Course Price</span>
                  <span className='font-bold text-zinc-800'>
                    {!basePrice || basePrice === 0
                      ? 'Free'
                      : `৳${basePrice.toLocaleString('en-BD')}`}
                  </span>
                </div>

                {appliedCoupon && (
                  <div className='flex justify-between items-center text-base font-semibold text-emerald-600'>
                    <span className='flex items-center gap-1.5'>
                      <FiTag className='h-4 w-4' />
                      Promo code ({appliedCoupon.code})
                    </span>
                    <span className='font-bold'>
                      -৳{discountAmount.toLocaleString('en-BD')}
                    </span>
                  </div>
                )}

                <div className='border-t border-zinc-100 pt-3.5 flex justify-between items-center'>
                  <span className='text-base font-bold text-zinc-800'>
                    Total Investment
                  </span>
                  <span className='text-3xl font-bold text-[#E61C24]'>
                    {!finalPrice || finalPrice === 0
                      ? 'Free'
                      : `৳${finalPrice.toLocaleString('en-BD')}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
