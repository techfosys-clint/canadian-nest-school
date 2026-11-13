'use client';

import { formatBdDate, formatBdDateTime } from '@/lib/bdTime';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiCreditCard } from 'react-icons/fi';

type PaymentRow = {
  id: string;
  kind: 'enrollment' | 'renewal';
  courseTitle: string;
  billingType: string;
  amount: number | null;
  lateFee: number;
  periodStart: string | null;
  periodEnd: string | null;
  paymentStatus: string;
  paymentReference: string;
  paidAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  pending: 'bg-amber-50 border-amber-200 text-amber-700',
  failed: 'bg-rose-50 border-rose-200 text-rose-700',
};

export default function PaymentHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const sessionRes = await fetch('/api/auth/me');
        const sessionData = await sessionRes.json();
        if (
          !sessionRes.ok ||
          !sessionData.authenticated ||
          (sessionData.user.role !== 'student' &&
            sessionData.user.role !== 'admin')
        ) {
          router.push('/login');
          return;
        }

        const res = await fetch('/api/subscriptions/history', {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Payment history request failed');
        const data = await res.json();
        if (!data.success || !Array.isArray(data.payments)) {
          throw new Error('Invalid payment history response');
        }
        setPayments(data.payments);
      } catch (err) {
        console.error('Failed to load payment history:', err);
        setFailed(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [router]);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[60vh]'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
          <p className='text-base font-bold text-zinc-600'>
            Loading payment history…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-6 py-8 pb-16 space-y-6'>
      <div className='w-full bg-[#0A163A] rounded-lg p-8 md:p-10 relative overflow-hidden border border-zinc-800/20'>
        <div className='absolute -top-24 -left-24 w-72 h-72 bg-[#E61C24]/15 rounded-full blur-3xl pointer-events-none' />
        <div className='relative z-10 max-w-2xl'>
          <span className='inline-flex items-center px-4 py-1.5 rounded-lg bg-[#E61C24]/20 border border-[#E61C24]/30 text-base font-bold text-[#E61C24] uppercase tracking-wider mb-5'>
            Billing
          </span>
          <h1 className='text-3xl md:text-4xl font-bold font-display text-white mb-3'>
            Fee Payment History
          </h1>
          <p className='text-zinc-400 text-base font-semibold leading-relaxed'>
            Your monthly and quarterly course fee payments, including first
            enrollment and renewals.
          </p>
        </div>
      </div>

      {failed ? (
        <p
          role='alert'
          className='bg-white rounded-lg border border-zinc-200 p-6 text-base text-zinc-700'
        >
          Payment history could not be loaded. Please refresh to try again.
        </p>
      ) : payments.length === 0 ? (
        <div className='bg-white rounded-lg border border-zinc-200 p-12 text-center'>
          <div className='h-14 w-14 rounded-full bg-[#E61C24]/5 flex items-center justify-center text-[#E61C24] mx-auto mb-5'>
            <FiCreditCard className='h-7 w-7' />
          </div>
          <h2 className='text-xl font-bold text-zinc-800 mb-2'>
            No fee payments yet
          </h2>
          <p className='text-base font-semibold text-zinc-500 max-w-md mx-auto'>
            When you enroll in or renew a monthly or quarterly course, those
            payments will appear here.
          </p>
        </div>
      ) : (
        <div className='bg-white rounded-lg border border-zinc-200 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full text-left border-collapse min-w-180'>
              <thead>
                <tr className='bg-zinc-50 border-b border-zinc-200'>
                  <th className='px-5 py-4 text-base font-bold text-zinc-600'>
                    Date
                  </th>
                  <th className='px-5 py-4 text-base font-bold text-zinc-600'>
                    Course
                  </th>
                  <th className='px-5 py-4 text-base font-bold text-zinc-600'>
                    Type
                  </th>
                  <th className='px-5 py-4 text-base font-bold text-zinc-600'>
                    Period
                  </th>
                  <th className='px-5 py-4 text-base font-bold text-zinc-600'>
                    Amount
                  </th>
                  <th className='px-5 py-4 text-base font-bold text-zinc-600'>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      className='border-b border-zinc-100 last:border-b-0'
                    >
                      <td className='px-5 py-4 text-base font-semibold text-zinc-700'>
                        {formatBdDateTime(row.paidAt)}
                      </td>
                      <td className='px-5 py-4 text-base font-bold text-zinc-800'>
                        {row.courseTitle}
                      </td>
                      <td className='px-5 py-4 text-base font-semibold text-zinc-600 capitalize'>
                        {row.kind === 'enrollment'
                          ? 'First enrollment'
                          : 'Renewal'}
                      </td>
                      <td className='px-5 py-4 text-base font-semibold text-zinc-600'>
                        {row.periodStart || row.periodEnd
                          ? `${row.periodStart ? formatBdDate(row.periodStart) : '—'} → ${row.periodEnd ? formatBdDate(row.periodEnd) : '—'}`
                          : '—'}
                      </td>
                      <td className='px-5 py-4 text-base font-bold text-zinc-800'>
                        {row.amount === null
                          ? 'Unavailable'
                          : `BDT ${row.amount.toLocaleString()}`}
                        {row.lateFee > 0 ? (
                          <span className='block text-base font-semibold text-zinc-500'>
                            incl. late fee {row.lateFee.toLocaleString()}
                          </span>
                        ) : null}
                      </td>
                      <td className='px-5 py-4'>
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-lg border text-base font-bold capitalize ${
                            STATUS_STYLES[row.paymentStatus] ||
                            'bg-zinc-50 border-zinc-200 text-zinc-600'
                          }`}
                        >
                          {row.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
