'use client';

import { parseJsonResponse } from '@/lib/safeJson';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheck,
  FiFile,
  FiFileText,
  FiFilm,
  FiImage,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';

interface FileEntry {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'done' | 'error';
  error?: string;
  preview?: string;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function FileTypeIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/'))
    return <FiImage className='h-5 w-5 text-[#E61C24]' />;
  if (mime.startsWith('video/'))
    return <FiFilm className='h-5 w-5 text-emerald-400' />;
  if (mime === 'application/pdf')
    return <FiFileText className='h-5 w-5 text-rose-400' />;
  return <FiFile className='h-5 w-5 text-slate-500' />;
}

let idCounter = 0;
function makeId() {
  return `fe-${++idCounter}`;
}

export default function MediaUploadClient() {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Generate preview URLs for images
  function addFiles(files: File[]) {
    const accepted = files.filter(
      (f) =>
        f.type.startsWith('image/') ||
        f.type.startsWith('video/') ||
        f.type === 'application/pdf',
    );
    if (!accepted.length) return;
    const newEntries: FileEntry[] = accepted.map((file) => ({
      id: makeId(),
      file,
      status: 'queued',
      preview: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined,
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    setAllDone(false);
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry?.preview) URL.revokeObjectURL(entry.preview);
      return prev.filter((e) => e.id !== id);
    });
  }

  // Drag & Drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }
  function handleDragLeave(e: React.DragEvent) {
    if (!dropRef.current?.contains(e.relatedTarget as Node)) setDragOver(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Upload
  async function handleUpload() {
    const queued = entries.filter((e) => e.status === 'queued');
    if (!queued.length) return;
    setUploading(true);

    for (const entry of queued) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: 'uploading' } : e,
        ),
      );

      const formData = new FormData();
      formData.append('file', entry.file);
      formData.append(
        'alt',
        entry.file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      );

      try {
        const res = await fetch('/api/admin/media/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await parseJsonResponse(res);
        if (res.ok && data.media) {
          setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, status: 'done' } : e)),
          );
        } else {
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: 'error',
                    error: data.error || 'Upload failed',
                  }
                : e,
            ),
          );
        }
      } catch (err: any) {
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entry.id
              ? { ...e, status: 'error', error: err.message || 'Network error' }
              : e,
          ),
        );
      }
    }

    setUploading(false);
    setAllDone(true);
  }

  // Countdown redirect after all done
  useEffect(() => {
    if (!allDone) return;
    const hasAnyDone = entries.some((e) => e.status === 'done');
    if (!hasAnyDone) return;

    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push('/admin/media');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [allDone]);

  const queuedCount = entries.filter((e) => e.status === 'queued').length;
  const doneCount = entries.filter((e) => e.status === 'done').length;
  const errorCount = entries.filter((e) => e.status === 'error').length;
  const hasQueued = queuedCount > 0;
  const hasEntries = entries.length > 0;

  return (
    <div
      ref={dropRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className='relative min-h-screen'
    >
      {/* Drag overlay */}
      {dragOver && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-white/92 border-4 border-dashed border-[#E61C24] pointer-events-none'>
          <div className='flex flex-col items-center gap-5 text-center'>
            <div className='h-28 w-28 rounded-full bg-[#E61C24]/20 flex items-center justify-center animate-pulse'>
              <FiUploadCloud className='h-14 w-14 text-[#E61C24]' />
            </div>
            <p className='text-3xl font-bold text-slate-800'>Drop files here</p>
            <p className='text-base font-semibold text-slate-500'>
              Images, videos, and PDFs supported
            </p>
          </div>
        </div>
      )}

      <div className='px-6 py-8 space-y-6 container mx-auto'>
        {/* Header */}
        <div className='flex items-center gap-4'>
          <Link
            href='/admin/media'
            className='flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-500 hover:text-slate-800 transition-all shrink-0'
          >
            <FiArrowLeft className='h-5 w-5' />
          </Link>
          <div>
            <h1 className='text-3xl font-bold text-slate-800'>
              Upload File / Photo
            </h1>
            <p className='text-base font-semibold text-slate-400 mt-1'>
              Upload one or many files at once. Drag &amp; drop anywhere on this
              page.
            </p>
          </div>
        </div>

        {/* Drop Zone */}
        <label
          className={`flex flex-col items-center justify-center gap-5 w-full min-h-60 rounded-lg border-2 border-dashed transition-all cursor-pointer ${
            dragOver
              ? 'border-[#E61C24] bg-[#E61C24]/8'
              : 'border-slate-300 bg-white hover:border-[#E61C24]/50 hover:bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type='file'
            accept='image/*,video/*,application/pdf'
            multiple
            onChange={handleFileInput}
            className='hidden'
            disabled={uploading}
          />
          <div className='h-20 w-20 rounded-full bg-[#E61C24]/15 flex items-center justify-center'>
            <FiUploadCloud className='h-10 w-10 text-[#E61C24]' />
          </div>
          <div className='text-center space-y-2'>
            <p className='text-base font-bold text-slate-800'>
              Drag &amp; drop files here, or{' '}
              <span className='text-[#E61C24] underline underline-offset-2'>
                click to browse
              </span>
            </p>
            <p className='text-base font-semibold text-slate-400'>
              Images (JPG, PNG, WEBP, GIF, SVG), Videos (MP4, MOV), PDF — bulk
              supported
            </p>
          </div>
        </label>

        {/* File Queue */}
        {hasEntries && (
          <div className='bg-white border border-slate-200 rounded-lg overflow-hidden'>
            {/* Queue header */}
            <div className='flex items-center justify-between px-5 py-4 border-b border-slate-200'>
              <div className='flex items-center gap-3'>
                <p className='text-base font-bold text-slate-800'>
                  {entries.length} file{entries.length !== 1 ? 's' : ''} queued
                </p>
                {doneCount > 0 && (
                  <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 text-sm font-bold'>
                    <FiCheck className='h-3.5 w-3.5' /> {doneCount} done
                  </span>
                )}
                {errorCount > 0 && (
                  <span className='inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/15 text-rose-400 text-sm font-bold'>
                    <FiAlertCircle className='h-3.5 w-3.5' /> {errorCount}{' '}
                    failed
                  </span>
                )}
              </div>
              {!uploading && hasQueued && (
                <button
                  onClick={() =>
                    setEntries((prev) =>
                      prev.filter((e) => e.status !== 'queued'),
                    )
                  }
                  className='text-slate-400 hover:text-slate-800 text-sm font-bold transition-colors cursor-pointer'
                >
                  Clear queue
                </button>
              )}
            </div>

            {/* File rows */}
            <div className='divide-y divide-slate-200/60'>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors ${
                    entry.status === 'done'
                      ? 'bg-emerald-500/5'
                      : entry.status === 'error'
                        ? 'bg-rose-500/5'
                        : entry.status === 'uploading'
                          ? 'bg-[#E61C24]/5'
                          : ''
                  }`}
                >
                  {/* Thumbnail or icon */}
                  <div className='h-12 w-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0'>
                    {entry.preview ? (
                      <Image
                        src={entry.preview}
                        alt=''
                        className='w-full h-full object-cover'
                        width={100}
                        height={100}
                      />
                    ) : (
                      <FileTypeIcon mime={entry.file.type} />
                    )}
                  </div>

                  {/* File info */}
                  <div className='flex-1 min-w-0'>
                    <p className='text-slate-800 font-bold text-base truncate'>
                      {entry.file.name}
                    </p>
                    <p className='text-slate-400 text-sm font-semibold mt-0.5'>
                      {formatBytes(entry.file.size)} ·{' '}
                      {entry.file.type || 'unknown'}
                    </p>
                    {entry.status === 'error' && entry.error && (
                      <p className='text-rose-400 text-sm font-bold mt-1'>
                        {entry.error}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <div className='shrink-0 flex items-center gap-2'>
                    {entry.status === 'queued' && (
                      <span className='text-sm font-bold text-slate-400'>
                        Queued
                      </span>
                    )}
                    {entry.status === 'uploading' && (
                      <div className='flex items-center gap-2 text-[#E61C24]'>
                        <div className='h-4 w-4 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
                        <span className='text-sm font-bold'>Uploading...</span>
                      </div>
                    )}
                    {entry.status === 'done' && (
                      <div className='flex items-center gap-1.5 text-emerald-400'>
                        <div className='h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center'>
                          <FiCheck className='h-3 w-3 text-slate-800' />
                        </div>
                        <span className='text-sm font-bold'>Done</span>
                      </div>
                    )}
                    {entry.status === 'error' && (
                      <FiAlertCircle className='h-5 w-5 text-rose-400' />
                    )}
                    {(entry.status === 'queued' || entry.status === 'error') &&
                      !uploading && (
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className='ml-2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors'
                          title='Remove'
                        >
                          <FiX className='h-4 w-4' />
                        </button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action bar */}
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
          <Link
            href='/admin/media'
            className='inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-800 font-bold text-base transition-all'
          >
            <FiArrowLeft className='h-4 w-4' /> Back to Media Library
          </Link>

          <div className='flex items-center gap-3'>
            {allDone && doneCount > 0 && (
              <div className='flex items-center gap-2 text-emerald-400 text-base font-bold'>
                <FiCheck className='h-5 w-5' />
                <span>
                  {doneCount} uploaded! Redirecting in {countdown}s…
                </span>
              </div>
            )}
            {hasQueued && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className='inline-flex items-center gap-2.5 px-6 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] disabled:opacity-60 disabled:pointer-events-none text-slate-800 font-bold text-base shadow-md shadow-[#E61C24]/25 transition-all cursor-pointer'
              >
                {uploading ? (
                  <>
                    <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                    Uploading{' '}
                    {entries.filter((e) => e.status === 'uploading').length > 0
                      ? `${entries.findIndex((e) => e.status === 'uploading') + 1}/${entries.length}`
                      : '...'}
                  </>
                ) : (
                  <>
                    <FiUploadCloud className='h-5 w-5' />
                    Upload {queuedCount} file{queuedCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            )}
            {allDone && doneCount > 0 && (
              <Link
                href='/admin/media'
                className='inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base transition-all'
              >
                <FiCheck className='h-4 w-4' /> View in Library
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
