'use client';
import MobileAuthFlow, {
  type MobileAuthUser,
} from '@/components/MobileAuthFlow';
import { generateEventId, pushToDataLayer } from '@/lib/gtm';
import { parseJsonResponse } from '@/lib/safeJson';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiCheck,
  FiCheckCircle,
  FiChevronLeft,
  FiTag,
  FiZap,
} from 'react-icons/fi';
import { expectedBatchPayments, firstBatchPaymentDue, paymentPlanLabels, type PaymentPlan } from '@/lib/subscriptions/plans';
import Swal from 'sweetalert2';

interface CourseData {
  id: string;
  title: string;
  summary: string;
  plans: PaymentPlan[];
  requiresBatch?: boolean;
  imageUrl: string;
  instructorName: string;
  categoryName: string;
  slug: string;
}

interface OpenBatchInfo {
  id: string;
  name: string;
  startDate: string;
  firstClassAt?: string;
  classSchedule?: string;
  orientationDate?: string;
  endDate: string;
  joinClosesAt: string;
  seatsLeft: number | null;
}

interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
}

export default function CheckoutFormClient({ course, initialSelection }: { course: CourseData; initialSelection: { plan?: string; batch?: string; lang?: string } }) {
  const router = useRouter();
  const bn = initialSelection.lang !== 'en';
  const label = (en: string, bangla: string) => bn ? bangla : en;
  const language = bn ? 'bn-BD' : 'en-BD';
  const money = (amount: number) => '৳' + amount.toLocaleString(language);
  const date = (value: string | Date, time = false) => new Intl.DateTimeFormat(language, {
    timeZone: 'Asia/Dhaka', dateStyle: 'medium', ...(time ? { timeStyle: 'short' } : {}),
  }).format(new Date(value));
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const authPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (showSignIn) authPanel.current?.scrollIntoView({ block: 'start' }); }, [showSignIn]);
  const [selection, setSelection] = useState(initialSelection);
  const plan = course.plans.find(option => option.type === selection.plan) ??
    (course.plans.length === 1 ? course.plans[0] : undefined);
  const price = plan?.price ?? 0;
  const billingType = plan?.type;
  const isFree = course.plans.length === 1 && course.plans[0].price === 0;

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

  /** Every batch whose join window is currently open. */
  const [openBatches, setOpenBatches] = useState<OpenBatchInfo[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState(selection.batch ?? '');
  const [batchesLoading, setBatchesLoading] = useState(!!course.requiresBatch);

  const selectedBatch =
    openBatches.find((b) => b.id === selectedBatchId) || null;

  useEffect(() => {
    if (!course.requiresBatch) {
      setBatchesLoading(false);
      return;
    }
    let cancelled = false;
    setBatchesLoading(true);
    fetch(`/api/courses/${course.id}/open-batches`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list: OpenBatchInfo[] = data.batches || [];
        setOpenBatches(list);
        setSelectedBatchId((current) =>
          list.some((b) => b.id === current) ? current : list.length === 1 ? list[0].id : '',
        );
      })
      .catch(() => {
        if (!cancelled) {
          setOpenBatches([]);
          setSelectedBatchId('');
        }
      })
      .finally(() => {
        if (!cancelled) setBatchesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [course.id, course.requiresBatch]);

  // Check login session on mount
  useEffect(() => {
    // Fire begin_checkout GTM event
    pushToDataLayer({
      event: 'begin_checkout',
      event_id: generateEventId(),
      ecommerce: {
        currency: 'BDT',
        value: price,
        coupon: '',
        items: [
          {
            item_id: course.id,
            item_name: course.title,
            item_category: course.categoryName,
            price: price,
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
  }, [course.categoryName, course.id, price, course.title, user]);

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
  const basePrice = price;
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

  const periodSuffix =
    billingType === 'monthly'
      ? '/mo'
      : billingType === 'two_month'
        ? ' / 2 months'
        : billingType === 'quarterly'
        ? ' / 3 months'
        : '';

  // Complete course purchase / checkout
  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setCheckoutSuccess(null);

    if (course.requiresBatch && !selectedBatch) {
      setCheckoutError(
        openBatches.length > 1
          ? 'Choose the batch you want to join before paying.'
          : 'Enrollment is closed. No batch join window is open right now. Please check back when the admin opens a batch.',
      );
      return;
    }

    if (!plan) {
      setCheckoutError('Choose a payment option.');
      return;
    }
    if (!user) {
      setShowSignIn(true);
      return;
    }
    if (billingType !== 'one_time' && !termsAccepted) return;
    setPurchaseLoading(true);
    try {
      const response = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: course.id,
          batchId: selectedBatch?.id,
          paymentPlan: plan.type,
          acceptPaymentTerms: termsAccepted,
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
                price: price,
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

  const renderCoupon = (placement: 'mobile' | 'desktop') => !isFree && plan && (
    <div className='border-t border-zinc-100 pt-3'>
                  <label htmlFor={`checkout-coupon-${placement}`} className='flex items-center gap-2 text-base font-semibold text-zinc-700'>
                    <FiTag className='text-[#E61C24]' aria-hidden='true' />
                    {label('Apply Coupon / Promo Code', 'কুপন বা প্রোমো কোড ব্যবহার করুন')}
                  </label>

                  <div className='mt-3 flex gap-2'>
                    <input
                      type='text'
                      id={`checkout-coupon-${placement}`}
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
                      className='min-w-0 flex-1 px-3.5 py-2.5 rounded-lg border border-zinc-200 focus:border-[#E61C24] outline-none text-base transition-all font-mono font-bold text-zinc-800'
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
  );

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
        href={`${bn ? '' : '/en'}/courses/${course.slug}`}
        className='inline-flex items-center gap-2 text-base font-bold text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group'
      >
        <FiChevronLeft className='h-5 w-5 transition-transform group-hover:-translate-x-0.5' />
        <span>{label('Return to Course Page', 'কোর্স পেজে ফিরে যান')}</span>
      </Link>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start'>
        {/* LEFT COLUMN: AUTH WORKSPACE OR CHECKOUT BILLING */}
        <div className='lg:col-span-7 space-y-8'>
          {!user && showSignIn && (
            <div ref={authPanel} className='scroll-mt-28'><MobileAuthFlow
              onSuccess={handleAuthSuccess}
              heading={label('Sign in to continue', 'পরবর্তী ধাপে যেতে সাইন ইন করুন')}
              subheading={label('Enter your mobile number.', 'আপনার মোবাইল নম্বর দিন।')}
              locale={bn ? 'bn' : 'en'}
              signUpMethod='checkout_inline'
            /></div>
          )}
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

                {course.requiresBatch && (
                  <div className='space-y-3 border border-zinc-200/80 rounded-lg p-4 bg-zinc-50'>
                    {batchesLoading ? (
                      <p className='text-base font-semibold text-zinc-500'>
                        Checking batch availability…
                      </p>
                    ) : openBatches.length === 0 ? (
                      <p className='text-base font-semibold text-rose-600'>
                        Enrollment is closed. No batch join window is open
                        right now.
                      </p>
                    ) : (
                      <>
                        <p className='text-base font-bold text-zinc-800'>
                          {openBatches.length > 1
                            ? label('Choose your batch', 'ব্যাচ নির্বাচন করুন')
                            : label('Joining', 'নির্বাচিত ব্যাচ')}
                        </p>
                        <div className='space-y-2'>
                          {openBatches.map((batch) => {
                            const selected = batch.id === selectedBatchId;
                            return (
                              <label
                                key={batch.id}
                                className={`flex items-start justify-between gap-3 rounded-lg border p-4 cursor-pointer focus-within:ring-2 focus-within:ring-red-200 ${
                                  selected
                                    ? 'border-[#E61C24]/60 bg-red-50'
                                    : 'border-zinc-200/80 bg-white'
                                }`}
                              >
                                <input
                                  type='radio'
                                  name='checkout-batch'
                                  value={batch.id}
                                  checked={selected}
                                  onChange={() => { setSelectedBatchId(batch.id); setTermsAccepted(false); }}
                                  className='sr-only'
                                />
                                <span className='min-w-0'>
                                  <span className='block text-base font-bold text-zinc-800'>
                                    {batch.name}
                                  </span>
                                  <span className='block text-base font-semibold text-zinc-500'>
                                    {date(batch.startDate)}{' '}
                                    –{' '}
                                    {date(batch.endDate)}
                                    {batch.firstClassAt && ` · ${label('First class', 'প্রথম ক্লাস')} ${date(batch.firstClassAt, true)}`}
                                    {batch.classSchedule && ` · ${batch.classSchedule}`}
                                    {batch.orientationDate && ` · ${label('Orientation', 'ওরিয়েন্টেশন')} ${date(batch.orientationDate, true)}`}
                                    {batch.joinClosesAt
                                      ? ` · ${label('Enrollment closes', 'ভর্তির শেষ সময়')} ${date(batch.joinClosesAt, true)}`
                                      : ''}
                                    {batch.seatsLeft !== null
                                      ? ` · ${batch.seatsLeft} seat${batch.seatsLeft === 1 ? '' : 's'} left`
                                      : ''}
                                  </span>
                                </span>
                                {selected && <FiCheck aria-hidden='true' className='mt-1 h-5 w-5 shrink-0 text-[#E61C24]' />}
                              </label>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {!isFree && (!course.requiresBatch || selectedBatch) && (
                  <fieldset className='min-w-0'>
                    <legend className='mb-3 font-bold'>{label('Payment options', 'পেমেন্টের বিকল্প')}</legend>
                    <div className='grid gap-3 lg:grid-cols-3'>
                    {course.plans.map(option => (
                      <label key={option.type} className={`flex cursor-pointer relative flex-col items-start gap-2 rounded-lg border p-4 focus-within:ring-2 focus-within:ring-red-200 ${plan?.type === option.type ? 'border-[#E61C24]/60 bg-red-50' : 'border-zinc-200 bg-white hover:border-red-300'}`}>
                        <input type='radio' name='payment-plan' className='sr-only' checked={plan?.type === option.type}
                          onChange={() => { setSelection(current => ({ ...current, plan: option.type })); setTermsAccepted(false); }} />
                        <span className='min-w-0 w-full pr-6'>
                          <strong className='block'>{bn ? { one_time: 'এককালীন পেমেন্ট', monthly: 'প্রতি মাসে', two_month: 'প্রতি দুই মাসে', quarterly: 'প্রতি তিন মাসে' }[option.type] : paymentPlanLabels[option.type]}</strong>
                          {option.regularPrice && (
                            <span className='block'>{label('Regular price', 'নিয়মিত মূল্য')} <del>{money(option.regularPrice)}</del></span>
                          )}
                          {option.regularPrice && <span className='block text-emerald-700'>{label('Save', 'সাশ্রয়')} {money(option.regularPrice - option.price)}</span>}
                        </span>
                        <strong className='text-lg text-zinc-900'>{money(option.price)}</strong>
                        {plan?.type === option.type && <FiCheck aria-hidden='true' className='absolute right-3 top-4 h-5 w-5 text-[#E61C24]' />}
                      </label>
                    ))}
                    </div>
                  </fieldset>
                )}
                {isFree && <p className='font-bold text-emerald-700'>{label('Free', 'ফ্রি')}</p>}
                {selectedBatch && billingType && billingType !== 'one_time' && (
                  <div className='space-y-3 rounded-lg border border-zinc-200 bg-white p-4'>
                    <p>{label('Expected payments, including today', 'আজকের পেমেন্টসহ সম্ভাব্য পেমেন্ট সংখ্যা')} <strong>{expectedBatchPayments(new Date(selectedBatch.startDate), new Date(selectedBatch.endDate), billingType, new Date()).toLocaleString(language)}</strong></p>
                    <p>{label('Next payment due', 'পরবর্তী পেমেন্টের তারিখ')} <strong>{date(firstBatchPaymentDue(new Date(selectedBatch.startDate), billingType, new Date()))}</strong></p>
                    {user && (
                      <label className='flex items-start gap-3'>
                        <input type='checkbox' className='mt-1' checked={termsAccepted} onChange={event => setTermsAccepted(event.target.checked)} />
                        {label('I understand and agree to the payment schedule. If a payment remains overdue, course access may be paused until I pay.', 'আমি পেমেন্টের সময়সূচি বুঝেছি এবং সম্মত আছি। পেমেন্ট বকেয়া থাকলে পরিশোধ না করা পর্যন্ত কোর্সে প্রবেশ সাময়িকভাবে বন্ধ হতে পারে।')}
                      </label>
                    )}
                  </div>
                )}

                <div className='lg:hidden'>{renderCoupon('mobile')}</div>

                <button
                  type='submit'
                  disabled={
                    purchaseLoading || !plan || (!!user && billingType !== 'one_time' && !termsAccepted) ||
                    (course.requiresBatch &&
                      (batchesLoading || !selectedBatch))
                  }
                  className='w-full flex items-center justify-center gap-2 py-4 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                >
                  {purchaseLoading ? (
                    <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  ) : (
                    <>
                      <FiZap className='h-5 w-5 fill-white' />
                      <span>
                        {!plan ? label('Select a payment option', 'একটি পেমেন্ট বিকল্প বেছে নিন') : !user ? label('Sign in to continue', 'সাইন ইন করে এগিয়ে যান') : isFree ? label('Next Step', 'পরবর্তী ধাপ') : `${label('Confirm enrollment', 'ভর্তি নিশ্চিত করুন')} (${money(finalPrice)})`}
                      </span>
                    </>
                  )}
                </button>
              </form>
            </div>
        </div>

        {/* RIGHT COLUMN: STICKY COURSE SUMMARY CARD & COUPON APPLICATION */}
        <div className='lg:col-span-5 relative z-10 w-full space-y-6 lg:sticky lg:top-32'>
          {/* Sticky Course details widget */}
          <div className='bg-white border border-zinc-200 rounded-lg overflow-hidden'>
            {/* Banner image */}
              <div className='aspect-video overflow-hidden bg-slate-50 border-b border-zinc-100 relative'>
                <Image
                  src={course.imageUrl || '/logo.png'}
                  alt={course.imageUrl ? course.title : 'Canadian Nest School'}
                  className={course.imageUrl ? 'object-cover' : 'object-contain p-10'}
                  fill
                  sizes='(min-width: 1024px) 40vw, 100vw'
                />
              </div>

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
                  {label('Payment summary', 'পেমেন্টের সারাংশ')}
                </p>

                {!plan && <p className='text-base text-zinc-600'>{label('Choose an available payment option to see the amount due.', 'পরিশোধযোগ্য পরিমাণ দেখতে একটি পেমেন্ট বিকল্প নির্বাচন করুন।')}</p>}
                {plan && <div className='flex justify-between items-center text-base font-semibold text-zinc-600'>
                  <span>
                    {billingType === 'monthly'
                      ? label('First month fee', 'প্রথম মাসের ফি')
                      : billingType === 'quarterly'
                        ? label('First quarter fee', 'প্রথম তিন মাসের ফি')
                        : billingType === 'two_month'
                          ? label('First two-month fee', 'প্রথম দুই মাসের ফি')
                          : label('Base Course Price', 'কোর্সের মূল্য')}
                  </span>
                  <span className='font-bold text-zinc-800'>
                    {!basePrice || basePrice === 0
                      ? 'Free'
                      : `৳${basePrice.toLocaleString(language)}${periodSuffix}`}
                  </span>
                </div>}

                {plan && appliedCoupon && (
                  <div className='flex justify-between items-center text-base font-semibold text-emerald-600'>
                    <span className='flex items-center gap-1.5'>
                      <FiTag className='h-4 w-4' />
                      Promo code ({appliedCoupon.code})
                    </span>
                    <span className='font-bold'>
                      -৳{discountAmount.toLocaleString(language)}
                    </span>
                  </div>
                )}

                {plan && <div className='border-t border-zinc-100 pt-3.5 flex justify-between items-center'>
                  <span className='text-base font-bold text-zinc-800'>
                    {label('Due today', 'আজ পরিশোধযোগ্য')}
                  </span>
                  <span className='text-3xl font-bold text-[#E61C24]'>
                    {!finalPrice || finalPrice === 0
                      ? 'Free'
                      : `৳${finalPrice.toLocaleString(language)}`}
                  </span>
                </div>}
                <div className='hidden lg:block'>{renderCoupon('desktop')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
