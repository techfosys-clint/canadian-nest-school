'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  FiBookOpen,
  FiEdit,
  FiList,
  FiSearch,
  FiTrash2,
  FiZap,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  status: 'draft' | 'published';
  level: string;
  duration: string;
  categoryName: string;
  instructorName: string;
  thumbnail: string | null;
  createdAt: string | null;
}

interface Props {
  initialCourses: CourseItem[];
  userRole: string;
}

function formatCurrency(amount: number = 0) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function CoursesGridClient({ initialCourses, userRole }: Props) {
  const [courses, setCourses] = useState<CourseItem[]>(initialCourses);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'published' | 'draft'
  >('all');

  // TASK 7: Memoize filtering logic to prevent recalculation on every render
  // This is especially important when filtering 50+ courses with multiple criteria
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.instructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.categoryName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [courses, searchTerm, statusFilter]);

  // Quick toggle course draft/published status
  const handleToggleStatus = async (
    id: string,
    currentStatus: 'draft' | 'published',
  ) => {
    const nextStatus = currentStatus === 'published' ? 'draft' : 'published';

    const result = await Swal.fire({
      title: 'Update Course Visibility?',
      text: `Are you sure you want to change this course status to "${nextStatus}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#E61C24',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${nextStatus === 'published' ? 'Publish' : 'Draft'} it`,
      background: '#ffffff',
      color: '#1a1a1a',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/courses/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: id, status: nextStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update course status.');
      }

      setCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)),
      );

      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: `Course is now saved as ${nextStatus}.`,
        timer: 1500,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: err.message || 'Could not update status.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    }
  };

  // Delete Course with progress tracking
  const handleDeleteCourse = async (id: string, title: string) => {
    if (userRole !== 'admin') {
      Swal.fire({
        icon: 'error',
        title: 'Permission Denied',
        text: 'Only system Admins can delete courses.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Course Permanently?',
      text: `Warning: Deleting "${title}" will remove all lessons, quiz submissions, assignments, student enrollments, and reviews. This action CANNOT be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete Course',
      background: '#ffffff',
      color: '#1a1a1a',
    });

    if (!result.isConfirmed) return;

    // Show progress dialog
    Swal.fire({
      title: 'Deleting Course...',
      html: `
        <div style="text-align: center;">
          <div style="margin: 20px 0;">
            <div style="background: #e2e8f0; border-radius: 8px; overflow: hidden; height: 8px;">
              <div id="progress-bar" style="background: linear-gradient(90deg, #ef4444, #dc2626); height: 100%; width: 0%; transition: width 0.3s ease;"></div>
            </div>
            <p id="progress-text" style="margin-top: 12px; font-size: 14px; color: #64748b;">Removing course data...</p>
          </div>
        </div>
      `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        const progressBar = document.getElementById(
          'progress-bar',
        ) as HTMLElement;
        const progressText = document.getElementById(
          'progress-text',
        ) as HTMLElement;
        if (progressBar) progressBar.style.width = '20%';
        if (progressText) progressText.textContent = 'Removing course data...';
      },
      background: '#ffffff',
      color: '#1a1a1a',
    });

    try {
      // Update progress
      const progressBar = document.getElementById(
        'progress-bar',
      ) as HTMLElement;
      const progressText = document.getElementById(
        'progress-text',
      ) as HTMLElement;

      if (progressBar) progressBar.style.width = '40%';
      if (progressText)
        progressText.textContent = 'Deleting lessons and submissions...';

      const res = await fetch(`/api/admin/courses/${id}`, {
        method: 'DELETE',
      });

      if (progressBar) progressBar.style.width = '80%';
      if (progressText) progressText.textContent = 'Finalizing deletion...';

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete course.');
      }

      const data = await res.json();

      if (progressBar) progressBar.style.width = '100%';
      if (progressText) progressText.textContent = 'Done! Course deleted.';

      // Remove from UI
      setCourses((prev) => prev.filter((c) => c.id !== id));

      // Success message
      setTimeout(() => {
        Swal.fire({
          icon: 'success',
          title: 'Course Deleted Successfully',
          html: `
            <p style="margin: 10px 0;">Course "${title}" and all related data have been removed:</p>
            <ul style="text-align: left; display: inline-block; margin-top: 12px;">
              <li>${data.deletedItemCounts?.lessons || 0} lessons deleted</li>
              <li>All quiz submissions deleted</li>
              <li>All assignments deleted</li>
              <li>All student enrollments deleted</li>
              <li>All reviews deleted</li>
            </ul>
          `,
          confirmButtonColor: '#10b981',
          background: '#ffffff',
          color: '#1a1a1a',
        });
      }, 300);
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: err.message || 'Could not remove course.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    }
  };

  const totalCourses = courses.length;
  const publishedCourses = courses.filter(
    (c) => c.status === 'published',
  ).length;
  const draftCourses = courses.filter((c) => c.status === 'draft').length;

  return (
    <div className='space-y-5'>
      {/* Metrics Cards Grid - Borderless */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-5'>
        {/* Card 1: Total Courses */}
        <div className='bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between shadow-sm'>
          <div className='space-y-1'>
            <p className='text-sm font-bold text-slate-500 uppercase tracking-wider select-none'>
              Total Courses
            </p>
            <p className='text-3xl font-bold text-slate-800 tracking-tight'>
              {totalCourses}
            </p>
          </div>
          <div className='h-12 w-12 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center select-none'>
            <FiBookOpen className='h-6 w-6 text-[#E61C24]' />
          </div>
        </div>

        {/* Card 2: Published Courses */}
        <div className='bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between shadow-sm'>
          <div className='space-y-1'>
            <p className='text-sm font-bold text-slate-500 uppercase tracking-wider select-none'>
              Published
            </p>
            <p className='text-3xl font-bold text-emerald-600 tracking-tight'>
              {publishedCourses}
            </p>
          </div>
          <div className='h-12 w-12 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center select-none'>
            <FiZap className='h-6 w-6 text-emerald-600' />
          </div>
        </div>

        {/* Card 3: Draft Courses */}
        <div className='bg-white border border-slate-200 rounded-lg p-6 flex items-center justify-between shadow-sm'>
          <div className='space-y-1'>
            <p className='text-sm font-bold text-slate-500 uppercase tracking-wider select-none'>
              Drafts
            </p>
            <p className='text-3xl font-bold text-slate-600 tracking-tight'>
              {draftCourses}
            </p>
          </div>
          <div className='h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center select-none'>
            <FiList className='h-6 w-6 text-slate-500' />
          </div>
        </div>
      </div>

      {/* Search and Filters panel */}
      <div className='flex flex-col md:flex-row md:items-center gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm'>
        {/* Search Input */}
        <div className='flex-1 flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-[#E61C24]/40 rounded-lg transition-all'>
          <FiSearch className='h-4.5 w-4.5 text-slate-400' />
          <input
            type='text'
            placeholder='Search by title, category, or mentor name...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='bg-transparent border-none outline-none w-full text-base font-semibold text-slate-800 placeholder-slate-400'
          />
        </div>

        {/* Tab Filters */}
        <div className='flex bg-slate-100 border-none p-1 rounded-lg'>
          {(['all', 'published', 'draft'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-md text-base font-bold capitalize transition-all duration-200 cursor-pointer ${
                statusFilter === tab
                  ? 'bg-[#E61C24] text-white'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Catalog Table */}
      <div className='bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden'>
        {filteredCourses.length === 0 ? (
          <div className='p-16 text-center text-slate-400 font-semibold text-base space-y-4'>
            <FiBookOpen className='h-10 w-10 text-slate-300 mx-auto' />
            <p>No courses match your filter keywords.</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left border-collapse text-base'>
              <thead>
                <tr className='bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-sm uppercase tracking-wider'>
                  <th className='px-6 py-4'>Course Preview</th>
                  <th className='px-6 py-4'>Price</th>
                  <th className='px-6 py-4'>Category</th>
                  <th className='px-6 py-4'>Instructor</th>
                  <th className='px-4 py-4 text-center'>Status</th>
                  <th className='px-6 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filteredCourses.map((c) => (
                  <tr
                    key={c.id}
                    className='hover:bg-slate-50 transition-colors'
                  >
                    {/* Preview details */}
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-4'>
                        {/* Thumbnail */}
                        <div className='h-12 w-20 rounded-md overflow-hidden bg-slate-100 border-none shrink-0 relative flex items-center justify-center shadow-sm'>
                          {c.thumbnail ? (
                            <Image
                              src={c.thumbnail}
                              alt={c.title}
                              className='w-full h-full object-cover'
                              width={100}
                              height={100}
                            />
                          ) : (
                            <span className='text-xs font-bold text-slate-400'>
                              Tutor
                            </span>
                          )}
                        </div>
                        <div>
                          <p className='font-bold text-slate-800 leading-snug line-clamp-1'>
                            {c.title}
                          </p>
                          <p className='text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider'>
                            {c.level} • {c.duration}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className='px-6 py-4 font-bold text-[#E61C24]'>
                      {formatCurrency(c.price)}
                    </td>

                    {/* Category */}
                    <td className='px-6 py-4 font-semibold text-slate-600'>
                      {c.categoryName}
                    </td>

                    {/* Instructor */}
                    <td className='px-6 py-4 font-semibold text-slate-600'>
                      {c.instructorName}
                    </td>

                    {/* Status Badge with Click-Toggle Action */}
                    <td className='px-4 py-4 text-center'>
                      <button
                        onClick={() => handleToggleStatus(c.id, c.status)}
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-bold capitalize transition-all duration-200 cursor-pointer border ${
                          c.status === 'published'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {c.status}
                      </button>
                    </td>

                    {/* Actions Panel */}
                    <td className='px-6 py-4 text-right'>
                      <div className='flex items-center justify-end gap-2.5'>
                        {/* Syllabus Config */}
                        <Link
                          href={`/admin/lessons?courseId=${c.id}`}
                          title='Manage Syllabus Lessons'
                          className='p-2 rounded bg-slate-100 hover:bg-slate-100 text-slate-600 hover:text-slate-800 transition-colors border-none'
                        >
                          <FiList className='h-4.5 w-4.5' />
                        </Link>

                        {/* Edit Course details */}
                        <Link
                          href={`/admin/courses/${c.id}/edit`}
                          title='Edit Course Parameters'
                          className='p-2 rounded bg-[#E61C24]/10 hover:bg-[#E61C24] border border-[#E61C24]/20 text-[#E61C24] hover:text-white transition-all duration-200'
                        >
                          <FiEdit className='h-4.5 w-4.5' />
                        </Link>

                        {/* Delete course (Admin exclusively) */}
                        {userRole === 'admin' && (
                          <button
                            onClick={() => handleDeleteCourse(c.id, c.title)}
                            title='Delete Course Permanently'
                            className='p-2 rounded bg-rose-50 hover:bg-rose-500 border border-rose-200 text-rose-500 hover:text-white transition-all duration-200 cursor-pointer'
                          >
                            <FiTrash2 className='h-4.5 w-4.5' />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
