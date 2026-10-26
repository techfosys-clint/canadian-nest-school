'use client';
import MobileAuthFlow, {
  type MobileAuthUser,
} from '@/components/MobileAuthFlow';
import { generateEventId, pushToDataLayer } from '@/lib/gtm';
import { parseJsonResponse } from '@/lib/safeJson';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiTag,
  FiZap,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface CourseData {
  id: string;
  title: string;
  summary: string;
  price: number;
  billingType?: 'one_time' | 'monthly';
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
  const router = useRouter();

  // Auth states
  const [user, setUser] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Soft-handle legacy EPS fail redirects (?enrollment=failed) — send people
  // to the dashboard confirming flow instead of a hard "purchase failed" feel.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('enrollment') !== 'failed') return;

    const enrollmentId = params.get('enrollmentId');
    Swal.fire({
      icon: 'info',
      title: 'Checking your payment',
      html: 'If you completed payment at the gateway, we are confirming it now. You will be taken to your dashboard.',
      confirmButtonColor: '#E61C24',
      timer: 2500,
      showConfirmButton: true,
    }).then(() => {
      const q = enrollmentId
        ? `?enrollment=confirming&enrollmentId=${encodeURIComponent(enrollmentId)}`
        : '?enrollment=confirming';
      router.replace(`/dashboard${q}`);
    });
  }, [router]);

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

  const handleAuthSuccess = (authUser: MobileAuthUser) => {
    setUser(authUser);
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
            <MobileAuthFlow
              onSuccess={handleAuthSuccess}
              heading='Sign in to complete purchase'
              subheading='Enter your mobile number to continue checkout.'
              signUpMethod='checkout_inline'
            />
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
                        {course.billingType === 'monthly'
                          ? 'Start monthly subscription ('
                          : 'Complete Course Purchase ('}
                        {!finalPrice || finalPrice === 0
                          ? 'Free'
                          : `৳${finalPrice.toLocaleString('en-BD')}`}
                        {course.billingType === 'monthly' &&
                        finalPrice &&
                        finalPrice > 0
                          ? '/mo'
                          : ''}
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
                  <span>
                    {course.billingType === 'monthly'
                      ? 'First month fee'
                      : 'Base Course Price'}
                  </span>
                  <span className='font-bold text-zinc-800'>
                    {!basePrice || basePrice === 0
                      ? 'Free'
                      : `৳${basePrice.toLocaleString('en-BD')}${
                          course.billingType === 'monthly' ? '/mo' : ''
                        }`}
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
