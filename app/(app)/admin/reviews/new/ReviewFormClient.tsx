'use client';

import type { MediaItem } from '@/components/MediaPickerModal';
import MediaPickerModal from '@/components/MediaPickerModal';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import {
  FiArrowLeft,
  FiImage,
  FiStar,
  FiUploadCloud,
  FiX,
} from 'react-icons/fi';

interface CourseOption {
  id: string;
  title: string;
}

interface StudentOption {
  id: string;
  name: string;
  email: string;
}

interface ReviewFormClientProps {
  courses: CourseOption[];
  students: StudentOption[];
}

export default function ReviewFormClient({
  courses,
  students,
}: ReviewFormClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [courseId, setCourseId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<'approved' | 'pending'>('approved');

  // Student states: either select existing or create a custom one
  const [isCustomStudent, setIsCustomStudent] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [customStudentName, setCustomStudentName] = useState('');
  const [customStudentEmail, setCustomStudentEmail] = useState('');

  // Custom student profile pic states
  const [studentProfilePicId, setStudentProfilePicId] = useState('');
  const [studentProfilePicUrl, setStudentProfilePicUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const form = new FormData();
    form.append('file', file);
    form.append(
      'alt',
      customStudentName
        ? `Profile of ${customStudentName}`
        : 'Student Profile Pic',
    );

    try {
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStudentProfilePicId(data.media.id);
      setStudentProfilePicUrl(data.media.url);
    } catch (err: any) {
      setError(`Image Upload Failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  function handleMediaPickerSelect(item: MediaItem) {
    setStudentProfilePicId(item.id);
    setStudentProfilePicUrl(item.url);
    setShowMediaPicker(false);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!courseId || !comment.trim()) {
      setError('Please select a course and enter a review comment.');
      return;
    }

    if (isCustomStudent) {
      if (!customStudentName.trim() || !customStudentEmail.trim()) {
        setError('Please provide custom student name and email.');
        return;
      }
    } else {
      if (!selectedStudentId) {
        setError(
          'Please select an existing student, or opt to create a custom student.',
        );
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      course: courseId,
      rating,
      comment: comment.trim(),
      status,
      studentId: isCustomStudent ? '' : selectedStudentId,
      studentName: isCustomStudent ? customStudentName.trim() : '',
      studentEmail: isCustomStudent ? customStudentEmail.trim() : '',
      studentProfilePic: isCustomStudent ? studentProfilePicId : '',
    };

    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit review.');
      }

      router.push('/admin/reviews?success=added');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Could not complete the write request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className='container mx-auto px-6 py-8 space-y-8 select-text'
    >
      {error && (
        <div className='p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg font-bold text-base animate-fadeIn'>
          {error}
        </div>
      )}

      {/* Top Action Header Panel - Borderless */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6'>
        <div className='space-y-1'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => router.push('/admin/reviews')}
              className='h-10 w-10 border-none rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 transition-all cursor-pointer shadow-md'
            >
              <FiArrowLeft className='h-5 w-5' />
            </button>
            <h1 className='text-3xl font-bold font-display text-slate-800 tracking-tight'>
              Add Review
            </h1>
          </div>
          <p className='text-base font-semibold text-slate-500 pl-13'>
            Register a custom course review directly from the management console
          </p>
        </div>
        <button
          type='button'
          onClick={() => router.push('/admin/reviews')}
          className='px-5 py-2.5 bg-white hover:bg-slate-100 border-none text-slate-600 hover:text-slate-800 rounded-lg text-base font-bold transition-all cursor-pointer shadow-md'
        >
          Cancel & Back
        </button>
      </div>

      {/* Grid - Borderless card blocks */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-8'>
        {/* Left Column: Form parameters */}
        <div className='lg:col-span-8 space-y-6'>
          <div className='bg-white border border-slate-200 rounded-lg p-6 md:p-8 space-y-6 shadow-xl'>
            <h2 className='text-xl font-bold text-slate-800 tracking-tight border-b border-slate-200/60 pb-3'>
              Review Parameters
            </h2>

            {/* Course Selector - Borderless Input */}
            <div className='flex flex-col gap-2'>
              <label className='text-base font-bold text-slate-600'>
                Target Course *
              </label>
              <select
                required
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className='bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3.5 text-base font-semibold outline-none w-full transition-all focus:ring-2 focus:ring-[#E61C24]/40 cursor-pointer shadow-sm'
              >
                <option value=''>-- Select Target Course --</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Student Mode Selector - Borderless Area */}
            <div className='flex flex-col gap-2 pt-2'>
              <div className='flex items-center justify-between flex-wrap gap-2'>
                <label className='text-base font-bold text-slate-600'>
                  Student Profile *
                </label>
                <label className='flex items-center gap-2.5 cursor-pointer select-none'>
                  <input
                    type='checkbox'
                    checked={isCustomStudent}
                    onChange={(e) => setIsCustomStudent(e.target.checked)}
                    className='rounded border-none bg-slate-100 text-[#E61C24] focus:ring-0 h-4.5 w-4.5'
                  />
                  <span className='text-base font-semibold text-slate-500'>
                    Add Custom Student on the fly
                  </span>
                </label>
              </div>

              {isCustomStudent ? (
                <div className='space-y-5 p-5 md:p-6 bg-slate-50 border border-slate-200 rounded-lg animate-fadeIn'>
                  {/* Custom student details */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='flex flex-col gap-2'>
                      <label className='text-sm font-bold text-slate-500'>
                        Student Name *
                      </label>
                      <input
                        type='text'
                        required
                        value={customStudentName}
                        onChange={(e) => setCustomStudentName(e.target.value)}
                        placeholder='e.g. John Doe'
                        className='bg-white border-none focus:ring-2 focus:ring-[#E61C24]/40 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-all'
                      />
                    </div>
                    <div className='flex flex-col gap-2'>
                      <label className='text-sm font-bold text-slate-500'>
                        Student Email *
                      </label>
                      <input
                        type='email'
                        required
                        value={customStudentEmail}
                        onChange={(e) => setCustomStudentEmail(e.target.value)}
                        placeholder='e.g. john@example.com'
                        className='bg-white border-none focus:ring-2 focus:ring-[#E61C24]/40 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-all'
                      />
                    </div>
                  </div>

                  {/* Student Image Upload - Borderless */}
                  <div className='space-y-3 pt-2'>
                    <label className='text-sm font-bold text-slate-500'>
                      Student Profile Image (Optional)
                    </label>
                    <div className='flex items-center gap-5 flex-wrap'>
                      {/* Avatar preview */}
                      <div className='h-16 w-16 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner'>
                        {studentProfilePicUrl ? (
                          <Image
                            src={studentProfilePicUrl}
                            alt='Preview'
                            className='h-full w-full object-cover'
                            width={100}
                            height={100}
                          />
                        ) : (
                          <FiImage className='h-6 w-6 text-slate-400' />
                        )}
                      </div>

                      <div className='flex items-center gap-2'>
                        <label
                          className={`flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer transition-colors shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          <input
                            type='file'
                            accept='image/*'
                            onChange={handleImageUpload}
                            className='hidden'
                          />
                          <FiUploadCloud className='h-4.5 w-4.5' />
                          <span>
                            {uploading ? 'Uploading...' : 'Upload Image'}
                          </span>
                        </label>

                        <button
                          type='button'
                          onClick={() => setShowMediaPicker(true)}
                          className='flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-[#E61C24]/15 hover:bg-[#E61C24]/25 text-[#9693ff] font-bold text-sm cursor-pointer transition-colors'
                        >
                          <FiImage className='h-4.5 w-4.5' />
                          <span>Media Library</span>
                        </button>

                        {studentProfilePicUrl && (
                          <button
                            type='button'
                            onClick={() => {
                              setStudentProfilePicId('');
                              setStudentProfilePicUrl('');
                            }}
                            className='p-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer'
                          >
                            <FiX className='h-4.5 w-4.5' />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className='bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3.5 text-base font-semibold outline-none w-full transition-all focus:ring-2 focus:ring-[#E61C24]/40 cursor-pointer shadow-sm'
                >
                  <option value=''>
                    -- Choose Existing Student Profile --
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Star Rating Picker - Borderless */}
            <div className='flex flex-col gap-2 pt-2'>
              <label className='text-base font-bold text-slate-600'>
                Rating Tier *
              </label>
              <div className='flex items-center gap-1 bg-slate-100 p-3 rounded-lg w-fit shadow-inner'>
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = star <= (hoveredStar ?? rating);
                  return (
                    <button
                      key={star}
                      type='button'
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(null)}
                      className='p-1 cursor-pointer transition-transform hover:scale-110 duration-150'
                    >
                      <FiStar
                        className={`h-7 w-7 transition-colors duration-150 ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-400'
                        }`}
                      />
                    </button>
                  );
                })}
                <span className='ml-3 text-base font-bold text-slate-500'>
                  {
                    ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][
                      hoveredStar ?? rating
                    ]
                  }
                </span>
              </div>
            </div>

            {/* Review Comment - Borderless Textarea */}
            <div className='flex flex-col gap-2'>
              <label className='text-base font-bold text-slate-600'>
                Review Comment *
              </label>
              <textarea
                required
                rows={6}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder='Write student testimonial / experience feedback...'
                className='bg-slate-100 border-none focus:ring-2 focus:ring-[#E61C24]/40 text-slate-800 rounded-lg p-4 text-base font-semibold outline-none w-full transition-all resize-none shadow-sm'
              />
            </div>
          </div>
        </div>

        {/* Right Column: Visibility status and submit */}
        <div className='lg:col-span-4 space-y-6'>
          {/* Moderation Card - Borderless */}
          <div className='bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-xl'>
            <h3 className='text-xl font-bold text-slate-800 tracking-tight border-b border-slate-200/60 pb-2.5'>
              Visibility Status
            </h3>

            <div className='flex flex-col gap-2'>
              <label className='text-base font-bold text-slate-600'>
                Moderation State
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className='bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-all focus:ring-2 focus:ring-[#E61C24]/40 cursor-pointer shadow-sm'
              >
                <option value='approved'>
                  Approved & Live (Instant Publish)
                </option>
                <option value='pending'>Pending Admin Review</option>
              </select>
            </div>
          </div>

          {/* Action button - Borderless */}
          <div className='bg-white border border-slate-200 rounded-lg p-6 shadow-xl'>
            <button
              type='submit'
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/20 hover:shadow-[#E61C24]/30 transition-all duration-300 cursor-pointer flex items-center justify-center border-none ${
                isSubmitting ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              {isSubmitting ? (
                <div className='flex items-center gap-2'>
                  <div className='h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin' />
                  <span>Registering Review...</span>
                </div>
              ) : (
                'Add Review Document'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaPickerSelect}
        title='Select Student Profile Image'
      />
    </form>
  );
}
