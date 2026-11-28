'use client';

import { useMemo, useState } from 'react';
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiCircle,
  FiCornerUpLeft,
  FiMail,
  FiTrash2,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface MessageItem {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  locale: 'bn' | 'en';
  emailSent: boolean;
  handled: boolean;
  receivedAt: string;
}

type Filter = 'open' | 'handled' | 'all';

export default function MessagesPageClient({
  initialMessages,
  inboxEmail,
}: {
  initialMessages: MessageItem[];
  inboxEmail: string;
}) {
  const [messages, setMessages] = useState<MessageItem[]>(initialMessages);
  const [filter, setFilter] = useState<Filter>('open');

  const counts = useMemo(
    () => ({
      open: messages.filter((m) => !m.handled).length,
      handled: messages.filter((m) => m.handled).length,
      all: messages.length,
    }),
    [messages],
  );

  const visible = messages.filter((m) =>
    filter === 'all' ? true : filter === 'handled' ? m.handled : !m.handled,
  );

  async function toggleHandled(m: MessageItem) {
    const next = !m.handled;
    try {
      const res = await fetch('/api/admin/contact-messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, handled: next }),
      });
      if (!res.ok) throw new Error('Request failed');
      setMessages((prev) =>
        prev.map((item) =>
          item.id === m.id ? { ...item, handled: next } : item,
        ),
      );
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update message.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    }
  }

  async function handleDelete(m: MessageItem) {
    const result = await Swal.fire({
      title: 'Delete this message?',
      text: `The message from ${m.name} will be permanently deleted.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      background: '#ffffff',
      color: '#1a1a1a',
    });
    if (!result.isConfirmed) return;

    try {
      const res = await fetch('/api/admin/contact-messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id }),
      });
      if (!res.ok) throw new Error('Request failed');
      setMessages((prev) => prev.filter((item) => item.id !== m.id));
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete message.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    }
  }

  const tabs: Array<{ key: Filter; label: string }> = [
    { key: 'open', label: 'Open' },
    { key: 'handled', label: 'Handled' },
    { key: 'all', label: 'All' },
  ];

  return (
    <div className='px-6 py-8 space-y-6 container mx-auto'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold font-display text-slate-800'>
          Contact Messages
        </h1>
        <p className='text-base font-semibold text-slate-500 mt-1'>
          Messages sent from the website contact form. Each one is also emailed
          to {inboxEmail}.
        </p>
      </div>

      {/* Filter tabs */}
      <div className='flex flex-wrap gap-2'>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-base font-bold transition-all cursor-pointer ${
              filter === tab.key
                ? 'bg-[#E61C24] text-white shadow-md shadow-[#E61C24]/20'
                : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-800'
            }`}
          >
            {tab.label} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {/* Messages list */}
      <div className='space-y-3'>
        {visible.length === 0 ? (
          <div className='bg-white border border-slate-200 rounded-lg p-16 text-center space-y-4 shadow-sm'>
            <FiMail className='h-10 w-10 text-slate-300 mx-auto' />
            <p className='text-base font-semibold text-slate-400'>
              {filter === 'open'
                ? 'No open messages.'
                : 'No messages here yet.'}
            </p>
          </div>
        ) : (
          visible.map((m) => (
            <div
              key={m.id}
              className={`bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-sm transition-opacity ${
                m.handled ? 'opacity-70' : ''
              }`}
            >
              <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
                <div className='min-w-0 space-y-1'>
                  <p className='font-bold text-slate-800 text-lg leading-snug wrap-break-word'>
                    {m.subject}
                  </p>
                  <p className='text-base font-semibold text-slate-500 wrap-break-word'>
                    {m.name} ·{' '}
                    <a
                      href={`mailto:${m.email}`}
                      className='text-[#E61C24] hover:underline'
                    >
                      {m.email}
                    </a>
                  </p>
                  <p className='text-base text-slate-400'>
                    {m.receivedAt} ·{' '}
                    {m.locale === 'en' ? 'English site' : 'Bangla site'}
                  </p>
                </div>
                <div className='flex items-center gap-2 shrink-0'>
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + m.subject)}`}
                    title='Reply by email'
                    className='p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 transition-all cursor-pointer'
                  >
                    <FiCornerUpLeft className='h-4 w-4' />
                  </a>
                  <button
                    onClick={() => toggleHandled(m)}
                    title={m.handled ? 'Mark as open' : 'Mark as handled'}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-base font-bold transition-all cursor-pointer ${
                      m.handled
                        ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.handled ? (
                      <FiCheckCircle className='h-4 w-4' />
                    ) : (
                      <FiCircle className='h-4 w-4' />
                    )}
                    {m.handled ? 'Handled' : 'Mark handled'}
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    title='Delete'
                    className='p-2 rounded-lg bg-rose-50 hover:bg-rose-500 border border-rose-200 text-rose-500 hover:text-white transition-all cursor-pointer'
                  >
                    <FiTrash2 className='h-4 w-4' />
                  </button>
                </div>
              </div>

              <p className='text-base text-slate-700 leading-relaxed whitespace-pre-wrap wrap-break-word'>
                {m.message}
              </p>

              {!m.emailSent && (
                <p className='inline-flex items-center gap-2 text-base font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5'>
                  <FiAlertTriangle className='h-4 w-4 shrink-0' /> The email
                  copy of this message failed to send.
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
