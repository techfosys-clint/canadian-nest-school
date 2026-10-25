'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import { FiCamera, FiLogOut, FiUploadCloud } from 'react-icons/fi';
import Swal from 'sweetalert2';

interface RequiredStudentPhotoModalProps {
  studentName: string;
  onUploaded: (profilePicUrl: string) => void;
  onLogout: () => void;
}

/**
 * Blocking modal for students without a profile photo.
 * No X / click-outside / Esc — upload required; logout still allowed.
 */
export default function RequiredStudentPhotoModal({
  studentName,
  onUploaded,
  onLogout,
}: RequiredStudentPhotoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<{
    base64: string;
    name: string;
    mimeType: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', blockEscape, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', blockEscape, true);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File',
        text: 'Please upload a JPG or PNG image.',
        confirmButtonColor: '#E61C24',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Profile image size must be under 2MB.',
        confirmButtonColor: '#E61C24',
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPreview(base64String);
      setImageFile({
        base64: base64String,
        name: file.name,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!imageFile) {
      Swal.fire({
        icon: 'error',
        title: 'Photo required',
        text: 'Please choose a student photo before continuing.',
        confirmButtonColor: '#E61C24',
      });
      return;
    }

    setUploading(true);
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          profilePic: imageFile,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload photo.');
      }

      const url = data.user?.profilePic as string | undefined;
      if (!url) {
        throw new Error('Upload succeeded but no photo URL was returned.');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Photo saved',
        text: 'Thank you! Your student profile photo has been uploaded.',
        timer: 1500,
        showConfirmButton: false,
      });

      onUploaded(url);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Upload failed',
        text: err.message || 'Could not save the photo. Please try again.',
        confirmButtonColor: '#E61C24',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className='fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm'
      role='dialog'
      aria-modal='true'
      aria-labelledby='required-photo-title'
    >
      <div className='w-full max-w-md bg-white rounded-lg border border-zinc-200 shadow-xl p-6 sm:p-8 space-y-5'>
        <div className='text-center space-y-2'>
          <div className='mx-auto h-12 w-12 rounded-full bg-[#E61C24]/10 text-[#E61C24] flex items-center justify-center'>
            <FiCamera className='h-6 w-6' />
          </div>
          <h2
            id='required-photo-title'
            className='text-xl font-bold text-zinc-900 tracking-tight'
          >
            Upload student photo
          </h2>
          <p className='text-base font-semibold text-zinc-500 leading-relaxed'>
            Hi {studentName.split(' ')[0] || 'there'} — please add the{' '}
            <span className='text-zinc-800'>student&apos;s photo</span> to
            continue using the portal. This cannot be skipped.
          </p>
        </div>

        <button
          type='button'
          onClick={() => fileInputRef.current?.click()}
          className='w-full rounded-lg border border-dashed border-zinc-300 hover:border-[#E61C24]/50 bg-zinc-50 hover:bg-[#E61C24]/5 transition-colors p-6 flex flex-col items-center gap-3 cursor-pointer'
        >
          <div className='h-28 w-28 rounded-full border-2 border-[#E61C24]/20 bg-white overflow-hidden flex items-center justify-center'>
            {preview ? (
              <Image
                src={preview}
                alt='Student photo preview'
                width={112}
                height={112}
                className='h-full w-full object-cover'
                unoptimized
              />
            ) : (
              <FiUploadCloud className='h-8 w-8 text-zinc-400' />
            )}
          </div>
          <span className='text-base font-bold text-zinc-700'>
            {preview ? 'Change photo' : 'Choose JPG or PNG'}
          </span>
          <span className='text-base font-semibold text-zinc-400 text-center leading-snug'>
            Max 2MB. Prefer a clear face-centered photo (about 10:9).
          </span>
        </button>

        <input
          ref={fileInputRef}
          type='file'
          accept='image/jpeg,image/png,image/jpg,image/webp'
          className='hidden'
          onChange={handleImageChange}
        />

        <button
          type='button'
          onClick={handleUpload}
          disabled={!imageFile || uploading}
          className='w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
        >
          {uploading ? (
            <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
          ) : (
            <>
              <FiCamera className='h-5 w-5' />
              <span>Save student photo &amp; continue</span>
            </>
          )}
        </button>

        <button
          type='button'
          onClick={onLogout}
          disabled={uploading}
          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 font-bold text-base transition-all cursor-pointer disabled:opacity-50'
        >
          <FiLogOut className='h-4.5 w-4.5' />
          <span>Sign out instead</span>
        </button>
      </div>
    </div>
  );
}
