'use client';

import {
  canDownloadCertificate,
  hasSubmittedRequiredReviews,
  type CompletionReviewState,
} from '@/lib/reviews/completionGate';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiExternalLink,
  FiLock,
  FiSearch,
  FiStar,
  FiXCircle,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface CertificateItem {
  id: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  status: 'pending' | 'approved' | 'rejected';
  progress: number;
  certificateUrl: string | null;
  adminNotes: string;
  createdAt: string;
  courseReviewStatus?: CompletionReviewState['courseReviewStatus'];
  teacherReviewStatus?: CompletionReviewState['teacherReviewStatus'];
  reviewsSubmitted?: boolean;
  reviewsApproved?: boolean;
  requiresReviews?: boolean;
}

export default function MyCertificatesPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  function getGate(cert: CertificateItem): CompletionReviewState {
    return {
      courseReviewStatus: cert.courseReviewStatus || 'idle',
      teacherReviewStatus: cert.teacherReviewStatus || 'idle',
    };
  }

  async function promptLeaveReviews(courseId: string, message: string) {
    const result = await Swal.fire({
      icon: 'info',
      title: 'Reviews Required',
      text: message,
      showCancelButton: true,
      confirmButtonText: 'Leave Reviews',
      cancelButtonText: 'Later',
      confirmButtonColor: '#E61C24',
      background: '#ffffff',
      color: '#1e293b',
    });
    if (result.isConfirmed) {
      router.push(`/dashboard/courses/${courseId}/complete`);
    }
  }

  async function handleDownloadCertificate(cert: CertificateItem) {
    const gate = getGate(cert);
    if (!hasSubmittedRequiredReviews(gate)) {
      await promptLeaveReviews(
        cert.courseId,
        'You finished this course before reviews were required. Please rate the course and teachers to unlock your certificate download.',
      );
      return;
    }
    if (!canDownloadCertificate(gate)) {
      await promptLeaveReviews(
        cert.courseId,
        'Your reviews were rejected. Please resubmit course and teacher reviews to unlock the certificate.',
      );
      return;
    }

    setDownloadingId(cert.id);
    try {
      const res = await fetch(
        `/api/certificates/download?courseId=${cert.courseId}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (
          data.code === 'REVIEWS_REQUIRED' ||
          data.code === 'REVIEWS_REJECTED' ||
          data.redirectTo
        ) {
          await promptLeaveReviews(
            cert.courseId,
            data.error ||
              'Please leave course and teacher reviews before downloading your certificate.',
          );
          return;
        }
        throw new Error(data.error || 'Unable to download certificate.');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cert.courseTitle.replace(/[^a-zA-Z0-9-_]+/g, '-')}-certificate.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not generate your certificate PDF.';
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: message,
        background: '#ffffff',
        color: '#1e293b',
        confirmButtonColor: '#E61C24',
      });
    } finally {
      setDownloadingId(null);
    }
  }

  async function fetchCertificates() {
    setLoading(true);
    try {
      const res = await fetch('/api/certificates');
      const data = await res.json();
      if (res.ok && data.success) {
        setCertificates(data.requests || []);
      } else {
        throw new Error(data.error || 'Failed to fetch certificates registry.');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error occurred while loading certificates.';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        background: '#ffffff',
        color: '#1e293b',
        confirmButtonColor: '#E61C24',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCertificates();
  }, []);

  const filtered = certificates.filter((c) => {
    const title = c.courseTitle.toLowerCase();
    const query = searchQuery.toLowerCase();
    return title.includes(query);
  });

  const needingReviewsCount = useMemo(
    () =>
      certificates.filter((c) => {
        const gate = getGate(c);
        return c.progress >= 100 && !hasSubmittedRequiredReviews(gate);
      }).length,
    [certificates],
  );

  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-BD', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  function renderStatusBadge(cert: CertificateItem) {
    const gate = getGate(cert);
    const reviewsDone = hasSubmittedRequiredReviews(gate);
    const reviewsAccepted = canDownloadCertificate(gate);

    if (cert.progress >= 100 && !reviewsDone) {
      return (
        <span className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-base font-bold bg-[#E61C24]/10 text-[#E61C24] border border-[#E61C24]/20'>
          <FiStar className='h-4.5 w-4.5' />
          Reviews required
        </span>
      );
    }

    if (reviewsDone && !reviewsAccepted) {
      return (
        <span className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-base font-bold bg-rose-50 text-rose-600 border border-rose-100'>
          <FiXCircle className='h-4.5 w-4.5' />
          Resubmit reviews
        </span>
      );
    }

    if ((cert.status === 'approved' || reviewsAccepted) && reviewsDone) {
      return (
        <span className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-base font-bold bg-emerald-50 text-emerald-600 border border-emerald-100'>
          <FiCheckCircle className='h-4.5 w-4.5' />
          Ready
        </span>
      );
    }

    if (cert.status === 'rejected') {
      return (
        <span className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-base font-bold bg-rose-50 text-rose-600 border border-rose-100'>
          <FiXCircle className='h-4.5 w-4.5' />
          Rejected
        </span>
      );
    }

    return (
      <span className='inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-base font-bold bg-amber-50 text-amber-600 border border-amber-100'>
        <FiClock className='h-4.5 w-4.5' />
        Pending
      </span>
    );
  }

  const renderDownloadCell = (cert: CertificateItem) => {
    const gate = getGate(cert);
    const reviewsDone = hasSubmittedRequiredReviews(gate);
    const reviewsAccepted = canDownloadCertificate(gate);

    if (!reviewsDone) {
      return (
        <div className='inline-flex flex-col items-center gap-2'>
          <span className='inline-flex items-center gap-1.5 text-zinc-500 text-base font-semibold'>
            <FiLock className='h-4.5 w-4.5' /> Reviews required
          </span>
          <Link
            href={`/dashboard/courses/${cert.courseId}/complete`}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white text-base font-bold'
          >
            Leave Reviews <FiExternalLink className='h-4 w-4' />
          </Link>
        </div>
      );
    }

    if (!reviewsAccepted) {
      return (
        <div className='inline-flex flex-col items-center gap-2'>
          <span className='inline-flex items-center gap-1.5 text-rose-600 text-base font-semibold'>
            <FiLock className='h-4.5 w-4.5' /> Resubmit reviews
          </span>
          <Link
            href={`/dashboard/courses/${cert.courseId}/complete`}
            className='inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white text-base font-bold'
          >
            Resubmit <FiExternalLink className='h-4 w-4' />
          </Link>
        </div>
      );
    }

    if (cert.status === 'approved' || reviewsAccepted) {
      return (
        <button
          type='button'
          onClick={() => handleDownloadCertificate(cert)}
          disabled={downloadingId === cert.id}
          className='inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-lg text-base font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer'
        >
          <FiDownload className='h-4.5 w-4.5' />
          {downloadingId === cert.id ? 'Generating...' : 'Download PDF'}
        </button>
      );
    }

    if (cert.status === 'rejected') {
      return (
        <div className='inline-flex flex-col items-center'>
          <span className='text-base text-rose-500 font-bold'>
            Verification Rejected
          </span>
          {cert.adminNotes && (
            <span
              className='text-sm text-zinc-400 font-semibold mt-0.5 truncate max-w-45'
              title={cert.adminNotes}
            >
              Notes: {cert.adminNotes}
            </span>
          )}
        </div>
      );
    }

    return (
      <div className='inline-flex items-center gap-1.5 text-zinc-400 text-base font-semibold select-none'>
        <FiClock className='h-4.5 w-4.5 text-zinc-400' /> Awaiting Release
      </div>
    );
  };

  return (
    <div className='container mx-auto px-6 py-8 space-y-6'>
      <div className='border-b border-slate-200 pb-4'>
        <h1 className='text-2xl font-bold text-zinc-900 flex items-center gap-2 select-none'>
          <FiAward className='text-[#E61C24] h-7 w-7' /> My Verified
          Certificates
        </h1>
        <p className='text-base font-semibold text-zinc-500 mt-1 select-none'>
          Certificates unlock as soon as you submit course and teacher reviews
        </p>
      </div>

      <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 text-base font-semibold text-amber-800 select-none space-y-1'>
        <p>
          If you completed a course before reviews were added, download stays
          locked until you leave course and teacher reviews.
        </p>
        {needingReviewsCount > 0 && (
          <p>
            You currently have {needingReviewsCount} completed course
            {needingReviewsCount === 1 ? '' : 's'} waiting for reviews.
          </p>
        )}
      </div>

      <div className='bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm select-none'>
        <div className='relative flex-1 max-w-md'>
          <FiSearch className='absolute left-3.5 top-3.5 text-zinc-400 h-5 w-5' />
          <input
            type='text'
            placeholder='Search certificates by course title...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-full bg-slate-50 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-base font-semibold outline-none transition-colors'
          />
        </div>

        <div className='text-base font-bold text-zinc-500'>
          Total Requests: {filtered.length}
        </div>
      </div>

      <div className='bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden'>
        {loading ? (
          <div className='p-12 flex flex-col items-center justify-center gap-4'>
            <div className='h-10 w-10 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
            <p className='text-base font-semibold text-zinc-500 select-none'>
              Loading credentials registry...
            </p>
          </div>
        ) : certificates.length === 0 ? (
          <div className='p-12 text-center text-zinc-500 space-y-3 max-w-md mx-auto select-none'>
            <FiAward className='mx-auto h-12 w-12 text-zinc-300' />
            <p className='text-lg font-bold text-zinc-800'>
              No certificates yet
            </p>
            <p className='text-base font-semibold text-zinc-500 leading-relaxed'>
              Complete your syllabus, then submit course and teacher reviews to
              unlock your certificate.
            </p>
            <div className='pt-2'>
              <Link
                href='/dashboard/courses'
                className='inline-flex items-center gap-1.5 px-4 py-2 bg-[#E61C24] hover:bg-[#CC181F] text-white rounded-lg text-base font-bold transition-all shadow-md shadow-[#E61C24]/15'
              >
                Go to My Courses <FiExternalLink className='h-4 w-4' />
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className='p-12 text-center text-zinc-500 space-y-3 max-w-md mx-auto select-none'>
            <FiSearch className='mx-auto h-12 w-12 text-zinc-300' />
            <p className='text-lg font-bold text-zinc-800'>
              No matching certificates
            </p>
            <p className='text-base font-semibold text-zinc-500 leading-relaxed'>
              Nothing matches “{searchQuery}”. Try another course title.
            </p>
            <button
              type='button'
              onClick={() => setSearchQuery('')}
              className='inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-zinc-200 hover:border-[#E61C24]/40 text-zinc-700 rounded-lg text-base font-bold transition-all cursor-pointer'
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left border-collapse'>
              <thead>
                <tr className='border-b border-slate-200 bg-slate-50/75 text-zinc-600 select-none'>
                  <th className='px-6 py-4 text-base font-bold'>
                    Course Title
                  </th>
                  <th className='px-6 py-4 text-base font-bold text-center'>
                    Syllabus Progress
                  </th>
                  <th className='px-6 py-4 text-base font-bold text-center'>
                    Auto-Requested Date
                  </th>
                  <th className='px-6 py-4 text-base font-bold text-center'>
                    Status
                  </th>
                  <th className='px-6 py-4 text-base font-bold text-center'>
                    Certificate Download
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100'>
                {filtered.map((cert) => (
                  <tr
                    key={cert.id}
                    className='hover:bg-slate-50/45 transition-colors'
                  >
                    <td className='px-6 py-4 max-w-xs'>
                      <Link
                        href={`/courses/${cert.courseSlug}`}
                        className='text-base font-bold text-[#0A163A] hover:text-[#E61C24] transition-colors leading-tight inline-block'
                      >
                        {cert.courseTitle}
                      </Link>
                    </td>

                    <td className='px-6 py-4 text-center select-none'>
                      <div className='inline-flex flex-col items-center'>
                        <span className='text-base font-bold text-zinc-800'>
                          {cert.progress}% Complete
                        </span>
                        <div className='w-24 bg-slate-100 h-1.5 rounded-lg overflow-hidden mt-1.5 border border-slate-200/40'>
                          <div
                            className='bg-[#E61C24] h-full rounded-lg'
                            style={{ width: `${cert.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className='px-6 py-4 text-center text-base font-bold text-zinc-500 select-none'>
                      {formatDate(cert.createdAt)}
                    </td>

                    <td className='px-6 py-4 text-center select-none'>
                      {renderStatusBadge(cert)}
                    </td>

                    <td className='px-6 py-4 text-center'>
                      {renderDownloadCell(cert)}
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
