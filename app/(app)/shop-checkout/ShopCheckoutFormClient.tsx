/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useCart } from '@/context/CartContext';
import { parseJsonResponse } from '@/lib/safeJson';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiBookOpen,
  FiCheckCircle,
  FiChevronLeft,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
  FiUser,
} from 'react-icons/fi';

interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export default function ShopCheckoutFormClient() {
  const router = useRouter();
  const { items, authLoading, userId, requireLogin, clearCart } = useCart();

  const [user, setUser] = useState<UserSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [shippingName, setShippingName] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      requireLogin('/shop-checkout');
      return;
    }
    if (items.length === 0) {
      router.replace('/shop/cart');
    }
  }, [authLoading, userId, items.length, requireLogin, router]);

  useEffect(() => {
    async function getSession() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data.authenticated) {
          setUser(data.user);
          setShippingName(data.user.name || '');
          setShippingPhone(data.user.phone || '');
        }
      } catch (err) {
        console.error('Session verify failed:', err);
      } finally {
        setLoadingSession(false);
      }
    }
    if (userId) getSession();
  }, [userId]);

  const totalPrice = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);

    if (
      !shippingName.trim() ||
      !shippingPhone.trim() ||
      !shippingAddress.trim()
    ) {
      setOrderError(
        'Please fill in your name, phone number, and shipping address.',
      );
      return;
    }

    if (items.length === 0) {
      setOrderError('Your cart is empty.');
      return;
    }

    setPlacingOrder(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          shippingName,
          shippingPhone,
          shippingAddress,
        }),
      });

      const data = await parseJsonResponse(response);

      if (response.ok && data.success && data.redirectUrl) {
        clearCart();
        window.location.href = data.redirectUrl;
        return;
      }

      throw new Error(data.error || 'Failed to place order.');
    } catch (err: any) {
      setOrderError(err.message || 'There was an issue processing your order.');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (authLoading || loadingSession || !userId || items.length === 0) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-zinc-50'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
          <p className='text-base font-bold text-zinc-600'>
            Loading Checkout...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-6 pt-28 pb-16'>
      <Link
        href='/shop/cart'
        className='inline-flex items-center gap-2 text-base font-bold text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group'
      >
        <FiChevronLeft className='h-5 w-5 transition-transform group-hover:-translate-x-0.5' />
        <span>Back to Cart</span>
      </Link>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start'>
        <div className='lg:col-span-7 order-2 lg:order-1'>
          <form
            onSubmit={handlePlaceOrder}
            className='bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 space-y-5'
          >
            <div>
              <h2 className='text-xl font-bold text-zinc-800'>
                Shipping Details
              </h2>
              {user && (
                <p className='text-base font-semibold text-zinc-500 mt-1'>
                  Checkout as {user.name}
                </p>
              )}
            </div>

            {orderError && (
              <div className='p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-650 font-semibold text-base'>
                {orderError}
              </div>
            )}

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
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  className='w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base font-semibold text-zinc-800 bg-white'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <label className='text-base font-bold text-zinc-700'>
                Phone Number
              </label>
              <div className='relative'>
                <span className='absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400'>
                  <FiPhone className='h-5 w-5' />
                </span>
                <input
                  type='text'
                  required
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  className='w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base font-semibold text-zinc-800 bg-white'
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <label className='text-base font-bold text-zinc-700'>
                Full Delivery Address
              </label>
              <div className='relative'>
                <span className='absolute top-3 left-0 pl-3.5 flex items-center text-zinc-400'>
                  <FiMapPin className='h-5 w-5' />
                </span>
                <textarea
                  required
                  rows={3}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder='House, road, area, city, postal code'
                  className='w-full pl-11 pr-4 py-3 rounded-lg border border-zinc-200 focus:border-[#E61C24] focus:ring-3 focus:ring-[#E61C24]/10 outline-none text-base font-semibold text-zinc-800 bg-white resize-none'
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={placingOrder}
              className='w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 transition-all duration-300 cursor-pointer disabled:opacity-70'
            >
              {placingOrder ? (
                <>
                  <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  Processing...
                </>
              ) : (
                <>
                  <FiShoppingBag className='h-5 w-5' />
                  Pay ৳{totalPrice.toLocaleString('en-BD')} &amp; Place Order
                </>
              )}
            </button>
          </form>
        </div>

        <div className='lg:col-span-5 order-1 lg:order-2'>
          <div className='bg-white border border-zinc-200 rounded-lg p-6 space-y-4 sticky top-24'>
            <h3 className='text-xl font-bold text-zinc-800 border-b border-zinc-100 pb-4'>
              Order Summary
            </h3>

            <div className='space-y-4 max-h-[24rem] overflow-y-auto'>
              {items.map((item) => (
                <div key={item.productId} className='flex items-center gap-4'>
                  <div className='h-16 w-14 rounded-lg overflow-hidden bg-zinc-50 border border-zinc-200 shrink-0 flex items-center justify-center'>
                    {item.thumbnail ? (
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        className='w-full h-full object-cover'
                        width={56}
                        height={64}
                      />
                    ) : (
                      <FiBookOpen className='h-5 w-5 text-zinc-300' />
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='font-bold text-zinc-800 line-clamp-2'>
                      {item.title}
                    </p>
                    <p className='text-base font-semibold text-zinc-500'>
                      Qty {item.quantity} · ৳
                      {(item.price * item.quantity).toLocaleString('en-BD')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className='border-t border-zinc-100 pt-4 flex items-center justify-between'>
              <span className='text-lg font-bold text-zinc-800'>Total</span>
              <span className='text-2xl font-bold text-[#E61C24]'>
                ৳{totalPrice.toLocaleString('en-BD')}
              </span>
            </div>

            <div className='flex items-center gap-2 text-base font-semibold text-zinc-500'>
              <FiCheckCircle className='h-4 w-4 text-emerald-500' />
              <span>Secure payment powered by EPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
