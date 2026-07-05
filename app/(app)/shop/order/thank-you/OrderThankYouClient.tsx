'use client';

import Link from 'next/link';
import {
  FiArrowRight,
  FiCheckCircle,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiShoppingBag,
  FiUser,
} from 'react-icons/fi';

export interface ThankYouOrderItem {
  title: string;
  price: number;
  quantity: number;
  thumbnail?: string;
}

export interface ThankYouOrderData {
  id: string;
  items: ThankYouOrderItem[];
  totalAmount: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  merchantTransactionId?: string;
  createdAt: string;
}

function formatPrice(price: number): string {
  return `৳${price.toLocaleString('en-BD')}`;
}

export default function OrderThankYouClient({
  order,
  customerName,
}: {
  order: ThankYouOrderData;
  customerName?: string;
}) {
  const placedOn = new Date(order.createdAt).toLocaleDateString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className='min-h-[70vh] bg-[#f8fafc] pt-28 pb-12'>
      <div className='container mx-auto px-6'>
        <div className='mx-auto space-y-6'>
          {/* Compact success header */}
          <div className='text-center space-y-2'>
            <div className='inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600'>
              <FiCheckCircle className='h-6 w-6' />
            </div>
            <h1 className='text-2xl font-bold font-display text-zinc-900'>
              Thank You for Your Order!
            </h1>
            <p className='text-base font-semibold text-zinc-500 max-w-xl mx-auto'>
              {customerName ? `${customerName}, your` : 'Your'} payment was
              successful. Placed on {placedOn}.
            </p>
          </div>

          {/* Two-column layout */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
            {/* Order Summary — left */}
            <div className='bg-white border border-zinc-200/80 rounded-lg p-5 space-y-4'>
              <div className='flex items-center justify-between gap-3 pb-3 border-b border-zinc-100'>
                <p className='text-base font-bold text-zinc-800 flex items-center gap-2'>
                  <FiPackage className='h-5 w-5 text-[#E61C24]' />
                  Order Summary
                </p>
                <span className='px-2.5 py-1 rounded-lg text-base font-bold uppercase tracking-wide border bg-emerald-50 border-emerald-200 text-emerald-600'>
                  Paid
                </span>
              </div>

              <div className='space-y-3'>
                {order.items.map((item, idx) => (
                  <div
                    key={idx}
                    className='flex items-center gap-3 py-2 border-b border-zinc-100 last:border-0'
                  >
                    <div className='h-12 w-10 shrink-0 rounded-lg bg-zinc-100 border border-zinc-200/80 flex items-center justify-center overflow-hidden'>
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
                    <div className='flex-1 min-w-0'>
                      <p className='text-base font-bold text-zinc-800 truncate'>
                        {item.title}
                      </p>
                      <p className='text-base font-semibold text-zinc-500'>
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className='text-base font-bold text-zinc-800 shrink-0'>
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className='flex items-center justify-between pt-2 border-t border-zinc-100'>
                <span className='text-base font-bold text-zinc-800'>
                  Total Paid
                </span>
                <span className='text-lg font-bold text-[#E61C24]'>
                  {formatPrice(order.totalAmount)}
                </span>
              </div>

              {order.merchantTransactionId && (
                <p className='text-base font-semibold text-zinc-500'>
                  Transaction ID:{' '}
                  <span className='text-zinc-700 font-bold break-all'>
                    {order.merchantTransactionId}
                  </span>
                </p>
              )}
            </div>

            {/* Shipping Details — right */}
            <div className='bg-white border border-zinc-200/80 rounded-lg p-5 space-y-4'>
              <p className='text-base font-bold text-zinc-800 flex items-center gap-2 pb-3 border-b border-zinc-100'>
                <FiMapPin className='h-5 w-5 text-[#E61C24]' />
                Shipping Details
              </p>
              <div className='space-y-3'>
                <div className='flex items-center gap-3 text-base font-semibold text-zinc-600'>
                  <FiUser className='h-5 w-5 text-[#E61C24] shrink-0' />
                  <span>{order.shippingName}</span>
                </div>
                <div className='flex items-center gap-3 text-base font-semibold text-zinc-600'>
                  <FiPhone className='h-5 w-5 text-[#E61C24] shrink-0' />
                  <span>{order.shippingPhone}</span>
                </div>
                <div className='flex items-start gap-3 text-base font-semibold text-zinc-600'>
                  <FiMapPin className='h-5 w-5 text-[#E61C24] shrink-0 mt-0.5' />
                  <span>{order.shippingAddress}</span>
                </div>
              </div>

              <p className='text-base font-semibold text-zinc-500 pt-3 border-t border-zinc-100 leading-relaxed'>
                A confirmation email is on its way. We&apos;ll notify you when
                your order ships.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
            <Link
              href='/dashboard/orders'
              className='inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#E61C24] text-white text-base font-bold hover:bg-[#c91820] transition-colors'
            >
              View My Orders
              <FiArrowRight className='h-4 w-4' />
            </Link>
            <Link
              href='/shop'
              className='inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white border border-zinc-200/80 text-zinc-700 text-base font-bold hover:border-[#E61C24]/40 transition-colors'
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
