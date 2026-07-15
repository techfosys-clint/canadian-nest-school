'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState } from 'react';
import {
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiCopy,
  FiExternalLink,
  FiImage,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface MediaItem {
  id: string;
  filename: string;
  url: string;
  alt: string;
  mimeType: string;
  filesize: number;
  width: number | null;
  height: number | null;
  thumbnailUrl: string;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type SortKey = 'filename' | 'filesize' | 'mimeType' | 'createdAt';
type SortDir = 'asc' | 'desc';

export default function MediaLibraryClient({
  initialMedia,
}: {
  initialMedia: MediaItem[];
}) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(initialMedia);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Filter
  const filtered = mediaItems.filter(
    (m) =>
      m.filename.toLowerCase().includes(search.toLowerCase()) ||
      m.alt?.toLowerCase().includes(search.toLowerCase()),
  );

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    let av: any = a[sortKey];
    let bv: any = b[sortKey];
    if (sortKey === 'createdAt') {
      av = new Date(av).getTime();
      bv = new Date(bv).getTime();
    }
    if (sortKey === 'filesize') {
      av = Number(av);
      bv = Number(bv);
    }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className='ml-1 text-slate-400'>↕</span>;
    return sortDir === 'asc' ? (
      <FiChevronUp className='ml-1 inline h-4 w-4 text-[#E61C24]' />
    ) : (
      <FiChevronDown className='ml-1 inline h-4 w-4 text-[#E61C24]' />
    );
  }

  // Copy URL
  async function handleCopyUrl(item: MediaItem, e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  // Delete
  async function handleDelete(item: MediaItem, e: React.MouseEvent) {
    e.stopPropagation();
    const result = await Swal.fire({
      title: 'Delete this asset?',
      text: `"${item.filename}" will be removed permanently.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
      background: '#ffffff',
      color: '#1a1a1a',
    });
    if (!result.isConfirmed) return;
    try {
      await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
    } catch {
      /* optimistic */
    }
    setMediaItems((prev) => prev.filter((m) => m.id !== item.id));
    if (previewItem?.id === item.id) setPreviewItem(null);
  }

  const thClass =
    'px-4 py-3 text-left text-sm font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:text-slate-800 transition-colors';
  const tdClass =
    'px-4 py-3 text-base font-semibold text-slate-600 align-middle';

  return (
    <div className='px-6 py-8 space-y-6 container mx-auto'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-slate-800'>Media Library</h1>
          <p className='text-base font-semibold text-slate-400 mt-1'>
            {mediaItems.length} asset{mediaItems.length !== 1 ? 's' : ''} —
            browse, copy URLs, manage files
          </p>
        </div>

        <Link
          href='/admin/media/upload'
          className='inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-md shadow-[#E61C24]/25 transition-all'
        >
          <FiUploadCloud className='h-5 w-5' />
          Upload File / Photo
        </Link>
      </div>

      {/* Search */}
      <div className='flex items-center gap-2.5 bg-white border border-slate-200 px-4 py-3 rounded-lg focus-within:border-[#E61C24]/50 transition-colors max-w-md shadow-sm'>
        <FiSearch className='h-5 w-5 text-slate-400 shrink-0' />
        <input
          type='text'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='Search by filename or alt text...'
          className='bg-transparent border-none outline-none w-full text-base font-semibold text-slate-800 placeholder-slate-400'
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className='text-slate-400 hover:text-slate-800 cursor-pointer shrink-0'
          >
            <FiX className='h-4 w-4' />
          </button>
        )}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className='flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-lg p-20 text-center space-y-4 shadow-sm'>
          <FiImage className='h-12 w-12 text-slate-300 mx-auto' />
          <div>
            <p className='text-base font-bold text-slate-500'>
              {search
                ? 'No assets match your search.'
                : 'No media yet — upload your first file'}
            </p>
            {!search && (
              <Link
                href='/admin/media/upload'
                className='inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all'
              >
                <FiUploadCloud className='h-5 w-5' /> Upload File / Photo
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className='bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm'>
          <div className='overflow-x-auto'>
            <table className='w-full border-collapse'>
              <thead>
                <tr className='border-b border-slate-200 bg-slate-50'>
                  <th className={`${thClass} w-14`}>Preview</th>
                  <th
                    className={thClass}
                    onClick={() => toggleSort('filename')}
                  >
                    Filename <SortIcon col='filename' />
                  </th>
                  <th
                    className={thClass}
                    onClick={() => toggleSort('mimeType')}
                  >
                    Type <SortIcon col='mimeType' />
                  </th>
                  <th
                    className={thClass}
                    onClick={() => toggleSort('filesize')}
                  >
                    Size <SortIcon col='filesize' />
                  </th>
                  <th className={thClass}>Dimensions</th>
                  <th
                    className={thClass}
                    onClick={() => toggleSort('createdAt')}
                  >
                    Uploaded <SortIcon col='createdAt' />
                  </th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((item, idx) => {
                  const isImg = item.mimeType.startsWith('image/');
                  const isCopied = copiedId === item.id;

                  return (
                    <tr
                      key={item.id}
                      onClick={() =>
                        setPreviewItem((prev) =>
                          prev?.id === item.id ? null : item,
                        )
                      }
                      className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${previewItem?.id === item.id ? 'bg-[#E61C24]/5 border-l-2 border-l-[#E61C24]' : ''} ${idx === sorted.length - 1 ? 'border-b-0' : ''}`}
                    >
                      {/* Thumbnail */}
                      <td className='px-4 py-3 align-middle'>
                        <div className='h-10 w-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0'>
                          {isImg ? (
                            <Image
                              src={item.thumbnailUrl || item.url}
                              alt={item.alt}
                              className='w-full h-full object-cover'
                              width={100}
                              height={100}
                            />
                          ) : (
                            <FiImage className='h-5 w-5 text-slate-400' />
                          )}
                        </div>
                      </td>

                      {/* Filename */}
                      <td className={tdClass}>
                        <div className='max-w-xs'>
                          <p className='text-slate-800 font-bold text-base truncate'>
                            {item.filename}
                          </p>
                          {item.alt && (
                            <p className='text-slate-400 text-sm font-semibold truncate mt-0.5'>
                              {item.alt}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className={tdClass}>
                        <span className='inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-sm font-bold uppercase tracking-wide'>
                          {item.mimeType.split('/')[1]?.slice(0, 6) ||
                            item.mimeType.split('/')[0]}
                        </span>
                      </td>

                      {/* Size */}
                      <td className={tdClass}>{formatBytes(item.filesize)}</td>

                      {/* Dimensions */}
                      <td className={tdClass}>
                        {item.width && item.height ? (
                          <span>
                            {item.width} × {item.height}
                          </span>
                        ) : (
                          <span className='text-slate-400'>—</span>
                        )}
                      </td>

                      {/* Uploaded */}
                      <td className={tdClass}>{formatDate(item.createdAt)}</td>

                      {/* Actions */}
                      <td className='px-4 py-3 align-middle'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            onClick={(e) => handleCopyUrl(item, e)}
                            title='Copy URL'
                            className='p-2 rounded-lg bg-slate-100 hover:bg-[#E61C24]/20 border border-slate-200 hover:border-[#E61C24]/40 text-slate-500 hover:text-[#E61C24] transition-all cursor-pointer'
                          >
                            {isCopied ? (
                              <FiCheck className='h-4 w-4 text-emerald-500' />
                            ) : (
                              <FiCopy className='h-4 w-4' />
                            )}
                          </button>
                          <a
                            href={item.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            onClick={(e) => e.stopPropagation()}
                            title='Open in new tab'
                            className='p-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 hover:text-slate-800 transition-all'
                          >
                            <FiExternalLink className='h-4 w-4' />
                          </a>
                          <button
                            onClick={(e) => handleDelete(item, e)}
                            title='Delete'
                            className='p-2 rounded-lg bg-rose-50 hover:bg-rose-500/20 border border-rose-200 hover:border-rose-500/40 text-rose-400 hover:text-rose-500 transition-all cursor-pointer'
                          >
                            <FiTrash2 className='h-4 w-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Expandable preview row */}
          {previewItem && (
            <div className='border-t border-[#E61C24]/20 bg-slate-50 p-6'>
              <div className='flex flex-col sm:flex-row gap-6'>
                {/* Image preview */}
                <div className='h-48 w-48 shrink-0 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm'>
                  {previewItem.mimeType.startsWith('image/') ? (
                    <Image
                      src={previewItem.url}
                      alt={previewItem.alt}
                      className='w-full h-full object-contain'
                      width={100}
                      height={100}
                    />
                  ) : (
                    <div className='flex flex-col items-center gap-2'>
                      <FiImage className='h-10 w-10 text-slate-400' />
                      <span className='text-sm font-bold text-slate-400 uppercase'>
                        {previewItem.mimeType.split('/')[1]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className='flex-1 space-y-4'>
                  <div className='flex items-start justify-between'>
                    <h3 className='text-slate-800 font-bold text-base break-all pr-4'>
                      {previewItem.filename}
                    </h3>
                    <button
                      onClick={() => setPreviewItem(null)}
                      className='text-slate-400 hover:text-slate-800 cursor-pointer shrink-0'
                    >
                      <FiX className='h-5 w-5' />
                    </button>
                  </div>

                  <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                    {[
                      { label: 'Alt Text', value: previewItem.alt || '—' },
                      {
                        label: 'File Size',
                        value: formatBytes(previewItem.filesize),
                      },
                      { label: 'MIME Type', value: previewItem.mimeType },
                      {
                        label: 'Dimensions',
                        value:
                          previewItem.width && previewItem.height
                            ? `${previewItem.width} × ${previewItem.height}`
                            : '—',
                      },
                      {
                        label: 'Uploaded',
                        value: formatDate(previewItem.createdAt),
                      },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className='bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm'
                      >
                        <p className='text-slate-400 text-sm font-bold'>
                          {label}
                        </p>
                        <p className='text-slate-800 text-base font-semibold mt-0.5 truncate'>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* URL Copy */}
                  <div className='flex gap-2 items-center'>
                    <input
                      readOnly
                      value={previewItem.url}
                      className='flex-1 min-w-0 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg px-3 py-2 text-base font-semibold outline-none truncate'
                    />
                    <button
                      onClick={(e) => handleCopyUrl(previewItem, e)}
                      className='px-4 py-2 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24] border border-[#E61C24]/30 hover:border-[#E61C24] text-[#E61C24] hover:text-white font-bold text-base transition-all cursor-pointer flex items-center gap-2 shrink-0'
                    >
                      {copiedId === previewItem.id ? (
                        <FiCheck className='h-4 w-4 text-emerald-400' />
                      ) : (
                        <FiCopy className='h-4 w-4' />
                      )}
                      {copiedId === previewItem.id ? 'Copied!' : 'Copy URL'}
                    </button>
                    <a
                      href={previewItem.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-800 font-bold text-base transition-all flex items-center gap-2 shrink-0'
                    >
                      <FiExternalLink className='h-4 w-4' /> Open
                    </a>
                    <button
                      onClick={(e) => handleDelete(previewItem, e)}
                      className='px-4 py-2 rounded-lg bg-rose-50 hover:bg-rose-500 border border-rose-200 hover:border-rose-500 text-rose-500 hover:text-white font-bold text-base transition-all cursor-pointer flex items-center gap-2 shrink-0'
                    >
                      <FiTrash2 className='h-4 w-4' /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer count */}
      {sorted.length > 0 && (
        <p className='text-sm font-semibold text-slate-400 text-right'>
          Showing {sorted.length} of {mediaItems.length} asset
          {mediaItems.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
