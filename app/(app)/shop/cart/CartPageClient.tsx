'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  FiArrowRight,
  FiMinus,
  FiPlus,
  FiShoppingBag,
  FiTrash2,
} from 'react-icons/fi';

function formatPrice(price: number): string {
  return `৳${price.toLocaleString('en-BD')}`;
}

export default function CartPageClient() {
  const router = useRouter();
  const {
    items,
    authLoading,
    userId,
    requireLogin,
    updateQuantity,
    removeItem,
  } = useCart();

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      requireLogin('/shop/cart');
    }
  }, [authLoading, userId, requireLogin]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (authLoading || !userId) {
    return (
      <div className='min-h-[50vh] flex items-center justify-center bg-[#f8fafc] pt-22'>
        <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[#f8fafc] pt-28 pb-16'>
      <div className='container mx-auto px-6'>
        <div className='max-w-4xl mx-auto space-y-6'>
          <div>
            <h1 className='text-2xl font-bold font-display text-zinc-900'>
              Your Cart
            </h1>
            <p className='text-base font-semibold text-zinc-500 mt-1'>
              Review items before checkout.
            </p>
          </div>

          {items.length === 0 ? (
            <div className='bg-white border border-zinc-200/80 rounded-lg p-12 text-center space-y-4'>
              <FiShoppingBag className='h-12 w-12 text-zinc-300 mx-auto' />
              <p className='text-base font-semibold text-zinc-500'>
                Your cart is empty.
              </p>
              <Link
                href='/shop'
                className='inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E61C24] text-white text-base font-bold hover:bg-[#c91820] transition-colors'
              >
                Browse Shop
                <FiArrowRight className='h-4 w-4' />
              </Link>
            </div>
          ) : (
            <>
              <div className='bg-white border border-zinc-200/80 rounded-lg divide-y divide-zinc-100'>
                {items.map((item) => (
                  <div
                    key={item.productId}
                    className='p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4'
                  >
                    <Link
                      href={`/shop/${item.slug}`}
                      className='flex items-center gap-4 flex-1 min-w-0'
                    >
                      <div className='h-16 w-14 shrink-0 rounded-lg bg-zinc-100 border border-zinc-200/80 overflow-hidden flex items-center justify-center'>
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className='h-full w-full object-cover'
                          />
                        ) : (
                          <FiShoppingBag className='h-5 w-5 text-zinc-400' />
                        )}
                      </div>
                      <div className='min-w-0'>
                        <p className='text-base font-bold text-zinc-800 truncate'>
                          {item.title}
                        </p>
                        <p className='text-base font-semibold text-zinc-500'>
                          {formatPrice(item.price)} each
                        </p>
                      </div>
                    </Link>

                    <div className='flex items-center justify-between sm:justify-end gap-4'>
                      <div className='flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1'>
                        <button
                          type='button'
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          className='h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 cursor-pointer'
                        >
                          <FiMinus className='h-4 w-4' />
                        </button>
                        <span className='w-8 text-center font-bold text-zinc-800'>
                          {item.quantity}
                        </span>
                        <button
                          type='button'
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          disabled={item.quantity >= item.maxQty}
                          className='h-8 w-8 flex items-center justify-center rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 cursor-pointer disabled:opacity-50'
                        >
                          <FiPlus className='h-4 w-4' />
                        </button>
                      </div>

                      <p className='text-base font-bold text-zinc-800 min-w-20 text-right'>
                        {formatPrice(item.price * item.quantity)}
                      </p>

                      <button
                        type='button'
                        onClick={() => removeItem(item.productId)}
                        className='p-2 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer'
                        aria-label='Remove item'
                      >
                        <FiTrash2 className='h-5 w-5' />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className='bg-white border border-zinc-200/80 rounded-lg p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                <div>
                  <p className='text-base font-bold text-zinc-800'>Subtotal</p>
                  <p className='text-2xl font-bold text-[#E61C24]'>
                    {formatPrice(subtotal)}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => router.push('/shop-checkout')}
                  className='inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[#E61C24] text-white text-base font-bold hover:bg-[#c91820] transition-colors cursor-pointer'
                >
                  Proceed to Checkout
                  <FiArrowRight className='h-4 w-4' />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
