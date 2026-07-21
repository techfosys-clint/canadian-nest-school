'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiArrowLeft,
  FiAward,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiInfo,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiXCircle,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface Student {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Course {
  id: string;
  title: string;
}

interface CertificateRequest {
  id: string;
  student: Student | null;
  course: Course | null;
  status: 'pending' | 'approved' | 'rejected';
  progress: number;
  certificateUrl: string | null;
  adminNotes: string;
  createdAt: string;
}

interface StudentSubmission {
  id: string;
  type: 'assignment' | 'quiz';
  marksObtained?: number;
  totalMarks?: number;
  quizCorrectAnswers?: number;
  quizTotalQuestions?: number;
  submittedAt: string;
  lesson?: { title?: string };
}

export default function CertificatesPageClient() {
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');

  // Modal/Page states
  const [activeRequest, setActiveRequest] = useState<CertificateRequest | null>(
    null,
  );
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>(
    'pending',
  );
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [studentSubmissions, setStudentSubmissions] = useState<
    StudentSubmission[]
  >([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  async function fetchRequests() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/certificates');
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
      } else {
        throw new Error(data.error || 'Failed to fetch requests.');
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message || 'Could not load certificate requests.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!activeRequest) {
      setStudentSubmissions([]);
      return;
    }

    const currentRequest = activeRequest;

    async function loadStudentGrades() {
      setLoadingGrades(true);
      try {
        const studentId = currentRequest.student?.id;
        const courseId = currentRequest.course?.id;
        if (!studentId || !courseId) return;

        const res = await fetch(
          `/api/admin/submissions?studentId=${studentId}&courseId=${courseId}`,
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setStudentSubmissions(data.submissions || []);
        } else {
          console.error(data.error || 'Failed to load student grades.');
        }
      } catch (err) {
        console.error('Error fetching student grades:', err);
      } finally {
        setLoadingGrades(false);
      }
    }

    loadStudentGrades();
  }, [activeRequest]);

  // Derived state for academic performance
  const studentAssignments = studentSubmissions.filter(
    (s) => s.type === 'assignment',
  );
  const studentQuizzes = studentSubmissions.filter((s) => s.type === 'quiz');

  const totalAssignmentObtained = studentAssignments.reduce(
    (sum, s) => sum + (s.marksObtained || 0),
    0,
  );
  const totalAssignmentMax = studentAssignments.reduce(
    (sum, s) => sum + (s.totalMarks || 0),
    0,
  );

  const totalQuizCorrect = studentQuizzes.reduce(
    (sum, s) => sum + (s.quizCorrectAnswers || 0),
    0,
  );
  const totalQuizQuestions = studentQuizzes.reduce(
    (sum, s) => sum + (s.quizTotalQuestions || 0),
    0,
  );

  const handleOpenManageModal = (req: CertificateRequest) => {
    setActiveRequest(req);
    setStatus(req.status);
    setAdminNotes(req.adminNotes || '');
  };

  const handleCloseModal = () => {
    setActiveRequest(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/certificates/${activeRequest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNotes: adminNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update request.');

      setRequests((prev) =>
        prev.map((r) =>
          r.id === activeRequest.id
            ? {
                ...r,
                status,
                adminNotes: adminNotes.trim(),
              }
            : r,
        ),
      );

      Swal.fire({
        icon: 'success',
        title: 'Request Updated',
        text: 'Student certificate request has been successfully modified.',
        timer: 1500,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      });

      handleCloseModal();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.message || 'Failed to update certificate status.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (req: CertificateRequest) => {
    const result = await Swal.fire({
      title: 'Delete Request?',
      text: 'Are you sure you want to permanently delete this certificate request?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
      background: '#ffffff',
      color: '#1a1a1a',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/certificates/${req.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete request.');

      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Request successfully removed.',
        timer: 1200,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      });
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete request.',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const nameMatch =
      req.student?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.student?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const courseMatch =
      req.course?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      false;
    const statusMatch = statusFilter === 'all' || req.status === statusFilter;

    return (nameMatch || courseMatch) && statusMatch;
  });

  // If review is active, render the dedicated edit review page inline
  if (activeRequest) {
    return (
      <div className='container mx-auto px-6 py-8 space-y-8 max-w-none'>
        {/* Header Panel with Back Button */}
        <div className='flex items-center gap-4 pb-4 border-b border-slate-200 select-none'>
          <button
            type='button'
            onClick={handleCloseModal}
            className='p-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-800 transition-colors cursor-pointer flex items-center justify-center shrink-0'
            title='Back to request grid list'
          >
            <FiArrowLeft className='h-5 w-5' />
          </button>
          <div>
            <h1 className='text-3xl font-bold font-display text-slate-800 flex items-center gap-2'>
              <FiAward className='text-[#E61C24]' /> Review Student Certificate
            </h1>
            <p className='text-base font-semibold text-slate-500 mt-1'>
              Verify student syllabus progression and approve auto-generated
              certificate downloads
            </p>
          </div>
        </div>

        {/* Full-width 2-Column Grid Layout */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 items-start w-full'>
          {/* Left Panel: Student Profile & Completion Metrics */}
          <div className='lg:col-span-1 space-y-6'>
            {/* Academic Performance Card */}
            <div className='bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-sm'>
              <h3 className='text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 select-none font-display'>
                <FiAward className='text-indigo-500 h-5 w-5' /> Course Results &
                Grades
              </h3>

              {loadingGrades ? (
                <div className='py-8 flex flex-col items-center justify-center gap-3'>
                  <div className='h-8 w-8 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
                  <p className='text-base font-semibold text-slate-500 animate-pulse'>
                    Loading student grades...
                  </p>
                </div>
              ) : studentSubmissions.length === 0 ? (
                <div className='py-6 text-center text-slate-500 space-y-1'>
                  <p className='text-base font-bold text-slate-600'>
                    No grades registered yet
                  </p>
                  <p className='text-base font-semibold'>
                    Student has not submitted any assignments or quizzes.
                  </p>
                </div>
              ) : (
                <div className='space-y-6 font-sans'>
                  {/* Summary Scores */}
                  <div className='grid grid-cols-2 gap-4'>
                    {/* Assignments Summary */}
                    <div className='bg-slate-50 p-4 border border-slate-200 rounded-lg'>
                      <p className='text-base font-bold text-slate-500 uppercase tracking-wider'>
                        Assignments
                      </p>
                      {totalAssignmentMax > 0 ? (
                        <div className='mt-1'>
                          <p className='text-xl font-bold text-slate-800'>
                            {totalAssignmentObtained} / {totalAssignmentMax}
                          </p>
                          <p className='text-base font-semibold text-emerald-600 mt-0.5'>
                            {Math.round(
                              (totalAssignmentObtained / totalAssignmentMax) *
                                100,
                            )}
                            % Average
                          </p>
                        </div>
                      ) : (
                        <p className='text-base font-semibold text-slate-400 mt-1'>
                          No assignments
                        </p>
                      )}
                    </div>

                    {/* Quizzes Summary */}
                    <div className='bg-slate-50 p-4 border border-slate-200 rounded-lg'>
                      <p className='text-base font-bold text-slate-500 uppercase tracking-wider'>
                        Quizzes
                      </p>
                      {totalQuizQuestions > 0 ? (
                        <div className='mt-1'>
                          <p className='text-xl font-bold text-slate-800'>
                            {totalQuizCorrect} / {totalQuizQuestions} Qs
                          </p>
                          <p className='text-base font-semibold text-[#E61C24] mt-0.5'>
                            {Math.round(
                              (totalQuizCorrect / totalQuizQuestions) * 100,
                            )}
                            % Score
                          </p>
                        </div>
                      ) : (
                        <p className='text-base font-semibold text-slate-400 mt-1'>
                          No quizzes
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detailed Results List */}
                  <div className='space-y-3'>
                    <p className='text-base font-bold text-slate-500 uppercase tracking-wider'>
                      Detailed Breakdown
                    </p>
                    <div className='max-h-60 overflow-y-auto space-y-2.5 pr-1'>
                      {studentSubmissions.map((sub) => (
                        <div
                          key={sub.id}
                          className='bg-slate-50 border border-slate-200 p-3.5 rounded-lg flex items-center justify-between gap-4 text-base'
                        >
                          <div className='min-w-0'>
                            <p
                              className='font-bold text-slate-800 truncate text-base'
                              title={sub.lesson?.title || 'Lesson task'}
                            >
                              {sub.lesson?.title || 'Lesson task'}
                            </p>
                            <div className='flex items-center gap-2 mt-1'>
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-base font-bold uppercase select-none ${
                                  sub.type === 'assignment'
                                    ? 'bg-[#E61C24]/10 text-[#E61C24] border border-[#E61C24]/20'
                                    : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                                }`}
                              >
                                {sub.type}
                              </span>
                              <span className='text-base font-semibold text-slate-400'>
                                {new Date(sub.submittedAt).toLocaleDateString(
                                  'en-BD',
                                  { day: '2-digit', month: 'short' },
                                )}
                              </span>
                            </div>
                          </div>

                          <div className='text-right shrink-0'>
                            {sub.type === 'quiz' ? (
                              <div>
                                <p className='font-bold text-slate-800 text-base'>
                                  {sub.quizCorrectAnswers} /{' '}
                                  {sub.quizTotalQuestions} Qs
                                </p>
                                <p className='text-base font-semibold text-slate-500 mt-0.5'>
                                  {sub.marksObtained} Marks
                                </p>
                              </div>
                            ) : (
                              <div>
                                <p className='font-bold text-slate-800 text-base'>
                                  {sub.marksObtained} Marks
                                </p>
                                <p className='text-base font-semibold text-slate-500 mt-0.5'>
                                  out of {sub.totalMarks}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Student Context Card */}
            <div className='bg-white border border-slate-200 rounded-lg p-6 space-y-4 shadow-sm'>
              <h3 className='text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 select-none font-display'>
                <FiInfo className='text-[#E61C24] h-5 w-5' /> Student Account
                Details
              </h3>

              <div className='space-y-3 font-sans select-text'>
                <div>
                  <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
                    Student Name
                  </p>
                  <p className='text-base font-bold text-slate-800 mt-1'>
                    {activeRequest.student?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
                    Email Address
                  </p>
                  <p className='text-base font-semibold text-slate-500 mt-0.5'>
                    {activeRequest.student?.email || 'N/A'}
                  </p>
                </div>
                {activeRequest.student?.phone && (
                  <div>
                    <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
                      Contact Number
                    </p>
                    <p className='text-base font-semibold text-slate-500 mt-0.5'>
                      {activeRequest.student.phone}
                    </p>
                  </div>
                )}
                <div className='pt-3 border-t border-slate-100'>
                  <p className='text-xs font-bold text-slate-400 uppercase tracking-wider'>
                    Course Syllabus Program
                  </p>
                  <p className='text-base font-bold text-[#E61C24] mt-1'>
                    {activeRequest.course?.title || 'Unknown Syllabus'}
                  </p>
                </div>
              </div>
            </div>

            {/* Curriculum Progress Statistics Card */}
            <div className='bg-white border border-slate-200 rounded-lg p-6 space-y-4 select-none shadow-sm'>
              <h3 className='text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 font-display'>
                <FiCheckCircle className='text-emerald-500 h-5 w-5' /> Syllabus
                Progression
              </h3>

              <div className='space-y-4 font-sans'>
                <div className='flex justify-between items-center'>
                  <span className='text-base font-semibold text-slate-500'>
                    Total Completion
                  </span>
                  <span
                    className={`text-xl font-bold ${
                      activeRequest.progress === 100
                        ? 'text-emerald-600'
                        : 'text-[#E61C24]'
                    }`}
                  >
                    {activeRequest.progress}%
                  </span>
                </div>

                {/* Visual completion progress bar */}
                <div className='w-full bg-slate-100 h-3 rounded-lg overflow-hidden border border-slate-200'>
                  <div
                    className={`h-full rounded-lg transition-all duration-300 ${
                      activeRequest.progress === 100
                        ? 'bg-emerald-500'
                        : 'bg-[#E61C24]'
                    }`}
                    style={{ width: `${activeRequest.progress}%` }}
                  />
                </div>

                <div className='bg-slate-50 p-4 border border-slate-200 rounded-lg text-left text-base font-medium text-slate-600 leading-relaxed'>
                  {activeRequest.progress === 100 ? (
                    <span className='text-emerald-600 font-bold'>
                      ✓ Student has completed 100% of curriculum requirements
                      and is eligible for completion certificates download.
                    </span>
                  ) : (
                    <span className='text-amber-600 font-semibold'>
                      ⚠️ Student has not yet completed all curriculum
                      requirements. Manual progress audits advised before
                      release.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Grading/Update Form */}
          <div className='lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 space-y-6 shadow-sm'>
            <h3 className='text-lg font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 select-none font-display'>
              <FiEdit3 className='text-[#E61C24] h-5 w-5' /> Manage Request
              Actions
            </h3>

            <form onSubmit={handleSave} className='space-y-6'>
              {/* Status Update Selection */}
              <div className='flex flex-col gap-2 select-none font-sans'>
                <label className='text-base font-bold text-slate-600'>
                  Set Request Status
                </label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className='bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full cursor-pointer focus:border-[#E61C24]/80 transition-colors'
                >
                  <option value='pending'>Pending Review</option>
                  <option value='approved'>
                    Approve & Release Certificate
                  </option>
                  <option value='rejected'>Reject Request</option>
                </select>
              </div>

              {/* Auto-generated certificate info */}
              <div className='flex flex-col gap-2 font-sans'>
                <label className='text-base font-bold text-slate-600 select-none'>
                  Certificate Delivery
                </label>
                <div className='bg-emerald-50 border border-emerald-200 p-5 rounded-lg text-base font-semibold text-emerald-800 leading-relaxed'>
                  When approved, the student can download an official PDF
                  certificate generated automatically with their name and course
                  details. No manual file upload is required.
                </div>
              </div>

              {/* Admin Notes */}
              <div className='flex flex-col gap-2 font-sans'>
                <label className='text-base font-bold text-slate-600 select-none'>
                  Administrative Notes / Reasons
                </label>
                <textarea
                  rows={4}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder='Provide guidance details or feedback notes for the student...'
                  className='bg-slate-50 border border-slate-200 focus:border-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full resize-none focus:ring-1 focus:ring-[#E61C24]/80 transition-all font-sans'
                />
              </div>

              {/* Action buttons */}
              <div className='flex items-center gap-4 pt-4 border-t border-slate-100 select-none font-sans'>
                <button
                  type='button'
                  onClick={handleCloseModal}
                  className='px-5 py-3 border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 font-bold text-base rounded-lg flex-1 cursor-pointer transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={saving}
                  className='px-5 py-3 bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base rounded-lg flex-1 cursor-pointer transition-all shadow-md shadow-[#E61C24]/15 border-none disabled:opacity-50'
                >
                  {saving ? 'Saving...' : 'Save Updates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-6 py-8 space-y-6'>
      {/* Header Panel */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200'>
        <div>
          <h1 className='text-3xl font-bold font-display text-slate-800 flex items-center gap-2'>
            <FiAward className='text-[#E61C24]' /> Student Certificate Requests
          </h1>
          <p className='text-base font-semibold text-slate-500 mt-1'>
            Review student lecture progress and approve auto-generated
            certificate downloads
          </p>
        </div>
        <Link
          href='/admin/certificates/create'
          className='inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shrink-0'
        >
          <FiPlus className='h-5 w-5' />
          Create Certificate
        </Link>
      </div>

      {/* Filters bar */}
      <div className='flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-5 rounded-lg shadow-sm'>
        {/* Search */}
        <div className='relative w-full md:max-w-md'>
          <FiSearch className='absolute left-3 top-3.5 text-slate-400 h-5 w-5' />
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='Search by student name, email, or course...'
            className='bg-slate-50 border border-slate-200 focus:border-[#E61C24]/80 text-slate-800 rounded-lg pl-10 pr-4 py-3 text-base font-semibold outline-none w-full transition-colors'
          />
        </div>

        {/* Status Dropdown */}
        <div className='flex items-center gap-3 w-full md:w-auto shrink-0'>
          <label className='text-base font-bold text-slate-600 hidden sm:inline whitespace-nowrap'>
            Filter Status
          </label>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className='bg-slate-50 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full md:w-48 cursor-pointer'
          >
            <option value='all'>All Requests</option>
            <option value='pending'>Pending Review</option>
            <option value='approved'>Approved</option>
            <option value='rejected'>Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests table grid */}
      <div className='bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm'>
        {loading ? (
          <div className='p-16 text-center'>
            <div className='h-10 w-10 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin mx-auto' />
            <p className='text-base font-semibold text-slate-400 mt-4'>
              Loading certificate requests...
            </p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className='p-16 text-center space-y-4'>
            <FiAward className='h-12 w-12 text-slate-300 mx-auto' />
            <p className='text-base font-semibold text-slate-400'>
              No matching certificate requests found.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left border-collapse text-base'>
              <thead>
                <tr className='bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-sm uppercase tracking-wider font-display'>
                  <th className='px-6 py-4'>Student Details</th>
                  <th className='px-6 py-4'>Syllabus Course</th>
                  <th className='px-6 py-4 text-center'>Progress</th>
                  <th className='px-6 py-4'>Status</th>
                  <th className='px-6 py-4'>Requested Date</th>
                  <th className='px-6 py-4 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100 font-semibold text-slate-700'>
                {filteredRequests.map((req) => {
                  const requestDate = new Date(req.createdAt).toLocaleString(
                    'en-BD',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    },
                  );

                  return (
                    <tr
                      key={req.id}
                      className='hover:bg-slate-50 transition-colors'
                    >
                      {/* Student Details */}
                      <td className='px-6 py-4'>
                        <div>
                          <p className='font-bold text-slate-800 text-base leading-snug'>
                            {req.student?.name || 'Unknown'}
                          </p>
                          <p className='text-slate-400 text-xs font-semibold mt-0.5'>
                            {req.student?.email || 'N/A'}
                          </p>
                          <p className='text-slate-400 text-xs font-semibold'>
                            {req.student?.phone || ''}
                          </p>
                        </div>
                      </td>
                      {/* Course */}
                      <td className='px-6 py-4'>
                        <p className='font-bold text-slate-800 text-base max-w-sm line-clamp-1'>
                          {req.course?.title || 'Unknown Course'}
                        </p>
                      </td>
                      {/* Progress */}
                      <td className='px-6 py-4 text-center'>
                        <div className='flex flex-col items-center gap-1.5'>
                          <span
                            className={`inline-flex h-9 w-14 rounded-lg items-center justify-center font-bold text-sm border ${
                              req.progress === 100
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                : 'bg-[#E61C24]/10 border-[#E61C24]/20 text-[#E61C24]'
                            }`}
                          >
                            {req.progress}%
                          </span>
                          <div className='w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden'>
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                req.progress === 100
                                  ? 'bg-emerald-500'
                                  : 'bg-[#E61C24]'
                              }`}
                              style={{ width: `${req.progress}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      {/* Status */}
                      <td className='px-6 py-4'>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider select-none ${
                            req.status === 'approved'
                              ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                              : req.status === 'rejected'
                                ? 'text-rose-600 bg-rose-50 border-rose-200'
                                : 'text-amber-600 bg-amber-50 border-amber-200'
                          }`}
                        >
                          {req.status === 'approved' && (
                            <FiCheckCircle className='h-3.5 w-3.5' />
                          )}
                          {req.status === 'rejected' && (
                            <FiXCircle className='h-3.5 w-3.5' />
                          )}
                          {req.status === 'pending' && (
                            <FiClock className='h-3.5 w-3.5 animate-pulse' />
                          )}
                          {req.status}
                        </span>
                      </td>
                      {/* Date */}
                      <td className='px-6 py-4 text-slate-500 text-sm'>
                        {requestDate}
                      </td>
                      {/* Actions */}
                      <td className='px-6 py-4 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            onClick={() => handleOpenManageModal(req)}
                            className='p-2.5 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24] border border-[#E61C24]/20 text-[#E61C24] hover:text-white transition-all inline-flex items-center cursor-pointer shadow-sm'
                            title='Review & Approve Certificate'
                          >
                            <FiEdit3 className='h-4.5 w-4.5' />
                          </button>
                          <button
                            onClick={() => handleDelete(req)}
                            className='p-2.5 rounded-lg bg-rose-50 hover:bg-rose-500 border border-rose-200 text-rose-500 hover:text-white transition-all inline-flex items-center cursor-pointer shadow-sm'
                            title='Delete request'
                          >
                            <FiTrash2 className='h-4.5 w-4.5' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
