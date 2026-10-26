'use client';

import { useEffect, useState } from 'react';
import { FiAward, FiX } from 'react-icons/fi';

type Props = {
  courseTitle: string;
  description: string;
  placeholderName?: string;
};

/**
 * Sample certificate matching the real PDF layout (background + name + body).
 * Compact preview in the course sticky card; click opens a larger lightbox.
 */
export default function CourseCertificateSample({
  courseTitle,
  description,
  placeholderName = 'Student Name',
}: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const frame = (large: boolean) => (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-zinc-200/80 bg-zinc-100 shadow-sm ${
        large ? '' : 'aspect-1500/1060'
      }`}
      style={large ? { aspectRatio: '1500 / 1060' } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src='/api/certificates/background'
        alt=''
        className='absolute inset-0 h-full w-full object-cover'
        draggable={false}
      />
      <div className='absolute inset-0'>
        <p
          className={`absolute left-0 right-0 text-center font-serif italic font-bold text-[#C4A035] px-[12%] ${
            large ? 'text-3xl md:text-5xl' : 'text-base sm:text-lg'
          }`}
          style={{ top: '49%', transform: 'translateY(-50%)' }}
        >
          {placeholderName}
        </p>
        <p
          className={`absolute left-[12%] right-[12%] text-center font-sans text-[#3F3F46] whitespace-pre-line ${
            large
              ? 'text-base md:text-lg leading-relaxed'
              : 'text-[8px] sm:text-[9px] leading-snug'
          }`}
          style={{ top: '58.5%' }}
        >
          {description}
        </p>
      </div>
      <span className='sr-only'>
        Sample certificate for {courseTitle} awarded to {placeholderName}
      </span>
    </div>
  );

  return (
    <>
      <div className='space-y-2.5 border-t border-zinc-100 pt-5'>
        <div className='flex items-center gap-2'>
          <FiAward className='h-5 w-5 text-[#E61C24] shrink-0' />
          <p className='text-base font-bold text-[#0A163A]'>
            Sample certificate
          </p>
        </div>
        <p className='text-base font-semibold text-zinc-500'>
          Preview of the certificate you receive after completing this course.
          Tap to enlarge.
        </p>
        <button
          type='button'
          onClick={() => setOpen(true)}
          className='w-full text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E61C24]/60 cursor-pointer group'
          aria-label='Enlarge sample certificate'
        >
          <div className='transition-opacity group-hover:opacity-95'>
            {frame(false)}
          </div>
        </button>
      </div>

      {open && (
        <div
          className='fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-8 bg-black/70'
          role='dialog'
          aria-modal='true'
          aria-label='Sample certificate preview'
          onClick={() => setOpen(false)}
        >
          <div
            className='relative w-full max-w-4xl'
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type='button'
              onClick={() => setOpen(false)}
              className='absolute -top-12 right-0 sm:-top-3 sm:-right-3 z-10 h-10 w-10 rounded-lg bg-white border border-zinc-200 text-zinc-700 flex items-center justify-center hover:bg-zinc-50 cursor-pointer'
              aria-label='Close preview'
            >
              <FiX className='h-5 w-5' />
            </button>
            {frame(true)}
          </div>
        </div>
      )}
    </>
  );
}
