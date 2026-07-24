'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiBook,
  FiBookOpen,
  FiChevronRight,
  FiDollarSign,
  FiFileText,
  FiFolder,
  FiHelpCircle,
  FiList,
  FiPlay,
  FiRefreshCw,
  FiSearch,
  FiStar,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import Swal from 'sweetalert2';
import { formatBdDate, formatBdDateTime } from '@/lib/bdTime';

interface DashboardData {
  role: 'admin' | 'staff' | 'instructor';
  summary: {
    totalCourses?: number;
    totalStudents?: number;
    totalEnrollments?: number;
    totalIncome?: number;
    totalRefunded?: number;
    netRevenue?: number;
    pendingReviews?: number;
    totalCategories?: number;
    totalBlogs?: number;
    totalFAQs?: number;
    totalLessons?: number;
  };
  recentReviews?: Array<{
    id: string;
    studentName: string;
    courseTitle: string;
    rating: string;
    comment: string;
    createdAt: string;
  }>;
  recentEnrollments?: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    pricePaid: number;
    paymentStatus: string;
    createdAt: string;
  }>;
  chartData?: Array<{
    day: string;
    income: number;
  }>;
  courses?: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    price: number;
    thumbnail?: string | null;
    level: string;
    duration: string;
  }>;
  liveLessons?: Array<{
    id: string;
    title: string;
    slug: string;
    courseTitle: string;
    livePlatform: string;
    liveUrl: string;
    liveDate: string | null;
    duration: number;
    autoGenerateZoom: boolean;
  }>;
  studentProgress?: Array<{
    id: string;
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
    updatedAt: string;
  }>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(amount);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatDate(dateStr: string) {
  return formatBdDate(dateStr);
}

const statusColors: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  pending: 'bg-amber-50 text-amber-600 border border-amber-200',
  refunded: 'bg-rose-50 text-rose-600 border border-rose-200',
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [enrollmentSearchQuery, setEnrollmentSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [, setSearchingEnrollments] = useState(false);

  async function fetchStats() {
    setError(null);
    try {
      const res = await fetch('/api/admin/dashboard-stats', {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Failed to load dashboard metrics.');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const handleEnrollmentSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentSearchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchingEnrollments(true);
    try {
      const res = await fetch(
        `/api/admin/enrollments?search=${encodeURIComponent(enrollmentSearchQuery)}`,
      );
      if (!res.ok) throw new Error('Search failed');
      const json = await res.json();
      if (json.success) {
        setSearchResults(json.enrollments);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Search Error',
        text: err.message || 'Failed to search enrollments',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    } finally {
      setSearchingEnrollments(false);
    }
  };

  const handleClearEnrollmentSearch = () => {
    setEnrollmentSearchQuery('');
    setSearchResults(null);
  };

  const handleRemoveEnrollment = async (
    enrollmentId: string,
    studentName: string,
    courseTitle: string,
  ) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `This will completely remove/unenroll ${studentName} from the course "${courseTitle}". The student will lose all access immediately!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, remove enrollment',
      cancelButtonText: 'Cancel',
      background: '#ffffff',
      color: '#1a1a1a',
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/admin/enrollments?id=${enrollmentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Failed to unenroll student');
      }

      const json = await res.json();
      if (json.success) {
        Swal.fire({
          icon: 'success',
          title: 'Unenrolled Successfully',
          text: `${studentName} has been removed from "${courseTitle}".`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          background: '#ffffff',
          color: '#1a1a1a',
        });

        // Refresh stats
        fetchStats();
        // If showing search results, refresh search results
        if (enrollmentSearchQuery.trim()) {
          const searchRes = await fetch(
            `/api/admin/enrollments?search=${encodeURIComponent(enrollmentSearchQuery)}`,
          );
          if (searchRes.ok) {
            const searchJson = await searchRes.json();
            if (searchJson.success) {
              setSearchResults(searchJson.enrollments);
            }
          }
        }
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: err.message || 'Failed to remove enrollment',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleModerateReview = async (
    id: string,
    action: 'approved' | 'rejected',
  ) => {
    try {
      const res = await fetch('/api/admin/reviews/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId: id, status: action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update testimonial status.');
      }

      Swal.fire({
        icon: 'success',
        title: `Review ${action === 'approved' ? 'Approved' : 'Rejected'}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        background: '#ffffff',
        color: '#1a1a1a',
      });

      // Reload dashboard stats
      fetchStats();
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Action Failed',
        text: err.message || 'Failed to update review status',
        background: '#ffffff',
        color: '#1a1a1a',
      });
    }
  };

  if (loading) {
    return (
      <div className='min-h-[70vh] flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-10 w-10 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
          <p className='text-base font-bold text-slate-400'>
            Loading Dashboard Data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='min-h-[70vh] flex items-center justify-center p-6'>
        <div className='text-center space-y-4 max-w-md bg-white border border-slate-200 p-6 rounded-lg shadow-sm'>
          <FiAlertCircle className='h-10 w-10 text-rose-500 mx-auto' />
          <h2 className='text-lg font-bold text-slate-800'>
            Dashboard Load Error
          </h2>
          <p className='text-base font-semibold text-slate-500 leading-relaxed'>
            {error}
          </p>
          <button
            onClick={fetchStats}
            className='w-full py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base cursor-pointer transition-all duration-200'
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    role,
    summary,
    recentReviews,
    recentEnrollments,
    chartData,
    courses,
  } = data;

  // Render SVG Area Sparkline Chart for Admin role
  const renderRevenueChart = () => {
    if (!chartData || chartData.length === 0) return null;

    // Get min and max for scaling
    const incomes = chartData.map((d) => d.income);
    const maxIncome = Math.max(...incomes, 5000); // Fallback min height scale
    const height = 150;
    const width = 500;

    // Map chartData points into coordinates
    const paddingX = 40;
    const paddingY = 20;
    const chartWidth = width - paddingX * 2;
    const chartHeight = height - paddingY * 2;

    const points = chartData.map((d, index) => {
      const x = paddingX + (index / (chartData.length - 1)) * chartWidth;
      const y = height - paddingY - (d.income / maxIncome) * chartHeight;
      return { x, y, label: d.day, val: d.income };
    });

    // Path string
    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth bezier curves
      const cpX1 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
      const cpY1 = points[i - 1].y;
      const cpX2 = points[i - 1].x + (points[i].x - points[i - 1].x) / 2;
      const cpY2 = points[i].y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
    }

    // Closed path string for gradient fill
    const fillPathD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

    return (
      <div className='bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-lg font-bold text-slate-800'>Income Trend</h2>
            <p className='text-base font-semibold text-slate-500 mt-0.5'>
              Last 7 days revenue mapping
            </p>
          </div>
          <span className='text-base font-bold text-[#E61C24] bg-[#E61C24]/10 px-2.5 py-1 rounded-lg border border-[#E61C24]/20'>
            Auto Aggregated
          </span>
        </div>

        {/* Custom Hand-Drawn SVG Chart */}
        <div className='w-full overflow-hidden'>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className='w-full h-auto select-none overflow-visible'
          >
            <defs>
              <linearGradient
                id='chart-glow-gradient'
                x1='0'
                y1='0'
                x2='0'
                y2='1'
              >
                <stop offset='0%' stopColor='#E61C24' stopOpacity='0.25' />
                <stop offset='100%' stopColor='#E61C24' stopOpacity='0.0' />
              </linearGradient>
            </defs>

            {/* Helper Grid lines */}
            <line
              x1={paddingX}
              y1={paddingY}
              x2={width - paddingX}
              y2={paddingY}
              stroke='#e2e8f0'
              strokeWidth='1'
              strokeDasharray='4 4'
            />
            <line
              x1={paddingX}
              y1={height / 2}
              x2={width - paddingX}
              y2={height / 2}
              stroke='#e2e8f0'
              strokeWidth='1'
              strokeDasharray='4 4'
            />
            <line
              x1={paddingX}
              y1={height - paddingY}
              x2={width - paddingX}
              y2={height - paddingY}
              stroke='#cbd5e1'
              strokeWidth='1.5'
            />

            {/* Gradient Fill Path */}
            <path d={fillPathD} fill='url(#chart-glow-gradient)' />

            {/* Smooth Bezier Stroke Line */}
            <path
              d={pathD}
              fill='none'
              stroke='#E61C24'
              strokeWidth='3'
              strokeLinecap='round'
            />

            {/* Interactive Neon Data Dots */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r='5'
                  fill='#E61C24'
                  stroke='#ffffff'
                  strokeWidth='2'
                  className='cursor-pointer'
                />
                {/* Value tooltip label */}
                {p.val > 0 && (
                  <text
                    x={p.x}
                    y={p.y - 10}
                    fill='#1e293b'
                    fontSize='10'
                    fontWeight='bold'
                    textAnchor='middle'
                  >
                    {formatCurrency(p.val).replace('BDT', '')}
                  </text>
                )}
                {/* Horizontal X Axis Labels */}
                <text
                  x={p.x}
                  y={height - 4}
                  fill='#94a3b8'
                  fontSize='11'
                  fontWeight='semibold'
                  textAnchor='middle'
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className='container mx-auto px-6 py-8 space-y-8'>
      {/* Top Welcome Title */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-slate-800 tracking-tight'>
            Executive Dashboard
          </h1>
          <p className='text-base font-semibold text-slate-500 mt-0.5 capitalize'>
            Manage Canadian Nest School core e-learning operations as {role}.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className='flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 font-semibold text-base transition-all duration-200 cursor-pointer disabled:opacity-50 shadow-sm'
        >
          <FiRefreshCw
            className={`h-4.5 w-4.5 ${refreshing ? 'animate-spin' : ''}`}
          />
          Refresh
        </button>
      </div>

      {/* ─── ADMIN DASHBOARD ──────────────────────────────────────────────────── */}
      {role === 'admin' && (
        <>
          {/* KPI grid cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
            {/* Income Card */}
            <div className='bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <p className='text-base font-semibold text-slate-500'>
                  Net Revenue
                </p>
                <div className='h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600'>
                  <FiDollarSign className='h-5 w-5' />
                </div>
              </div>
              <p className='text-2xl font-bold text-slate-800 leading-tight'>
                {formatCurrency(summary.netRevenue || 0)}
              </p>
              <p className='text-base font-semibold text-slate-400'>
                Gross: {formatCurrency(summary.totalIncome || 0)}
              </p>
            </div>

            {/* Enrollments Card */}
            <div className='bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <p className='text-base font-semibold text-slate-500'>
                  Purchases
                </p>
                <div className='h-10 w-10 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center text-[#E61C24]'>
                  <FiBookOpen className='h-5 w-5' />
                </div>
              </div>
              <p className='text-2xl font-bold text-slate-800 leading-tight'>
                {summary.totalEnrollments || 0}
              </p>
              <p className='text-base font-semibold text-slate-400'>
                total transactions completed
              </p>
            </div>

            {/* Students Card */}
            <div className='bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <p className='text-base font-semibold text-slate-500'>
                  Total Students
                </p>
                <div className='h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600'>
                  <FiUsers className='h-5 w-5' />
                </div>
              </div>
              <p className='text-2xl font-bold text-slate-800 leading-tight'>
                {summary.totalStudents || 0}
              </p>
              <p className='text-base font-semibold text-slate-400'>
                individual active learners
              </p>
            </div>

            {/* Pending Reviews Card */}
            <div className='bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-3'>
              <div className='flex items-center justify-between'>
                <p className='text-base font-semibold text-slate-500'>
                  Pending Reviews
                </p>
                <div
                  className={`h-10 w-10 rounded-lg border flex items-center justify-center ${
                    summary.pendingReviews && summary.pendingReviews > 0
                      ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse'
                      : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                >
                  <FiStar className='h-5 w-5' />
                </div>
              </div>
              <p className='text-2xl font-bold text-slate-800 leading-tight'>
                {summary.pendingReviews || 0}
              </p>
              <p className='text-base font-semibold text-slate-400'>
                testimonials awaiting approval
              </p>
            </div>
          </div>

          {/* SVG Chart & Shortcuts Layout */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            {/* Chart Column */}
            <div className='lg:col-span-8'>{renderRevenueChart()}</div>

            {/* Quick Actions Shortcuts Column */}
            <div className='lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-5'>
              <div>
                <h2 className='text-lg font-bold text-slate-800'>
                  Operational Shortcuts
                </h2>
                <p className='text-base font-semibold text-slate-500 mt-0.5'>
                  Quick management routing
                </p>
              </div>

              <div className='grid grid-cols-1 gap-3'>
                <Link
                  href='/admin/courses/new'
                  className='flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-[#E61C24]/50 bg-slate-50 hover:bg-[#E61C24]/5 text-slate-600 hover:text-slate-900 transition-all duration-200 group text-base font-semibold'
                >
                  <span className='flex items-center gap-3'>
                    <FiBookOpen className='h-5 w-5 text-[#E61C24]' />
                    Add New Course
                  </span>
                  <FiChevronRight className='h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform' />
                </Link>

                <Link
                  href='/admin/courses'
                  className='flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-[#E61C24]/50 bg-slate-50 hover:bg-[#E61C24]/5 text-slate-600 hover:text-slate-900 transition-all duration-200 group text-base font-semibold'
                >
                  <span className='flex items-center gap-3'>
                    <FiBook className='h-5 w-5 text-indigo-500' />
                    Manage Courses ({summary.totalCourses})
                  </span>
                  <FiChevronRight className='h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform' />
                </Link>

                <Link
                  href='/admin/reviews'
                  className='flex items-center justify-between p-3.5 rounded-lg border border-slate-200 hover:border-[#E61C24]/50 bg-slate-50 hover:bg-[#E61C24]/5 text-slate-600 hover:text-slate-900 transition-all duration-200 group text-base font-semibold'
                >
                  <span className='flex items-center gap-3'>
                    <FiStar className='h-5 w-5 text-amber-500' />
                    Moderation Queue ({summary.pendingReviews})
                  </span>
                  <FiChevronRight className='h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform' />
                </Link>
              </div>
            </div>
          </div>

          {/* Activity Tables Layout (Recent transactions and reviews) */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            {/* Recent Sales (8 cols) */}
            <div
              id='enrollments'
              className='lg:col-span-8 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden scroll-mt-24'
            >
              <div className='px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div>
                  <h2 className='text-lg font-bold text-slate-800'>
                    {searchResults !== null
                      ? 'Enrollment Search Results'
                      : 'Recent Sales'}
                  </h2>
                  <p className='text-base font-semibold text-slate-500 mt-0.5'>
                    {searchResults !== null
                      ? `Found ${searchResults.length} matching enrollments`
                      : 'Last 5 transaction logs'}
                  </p>
                </div>
                <div className='flex items-center gap-2 w-full sm:w-auto'>
                  <form
                    onSubmit={handleEnrollmentSearch}
                    className='relative flex items-center w-full sm:w-auto'
                  >
                    <input
                      type='text'
                      placeholder='Search student or course...'
                      value={enrollmentSearchQuery}
                      onChange={(e) => setEnrollmentSearchQuery(e.target.value)}
                      className='w-full sm:w-64 pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#E61C24] rounded-lg text-slate-800 text-base font-semibold focus:outline-none placeholder-slate-400 transition-colors'
                    />
                    <FiSearch className='absolute left-3 text-slate-400 h-4.5 w-4.5' />
                    {enrollmentSearchQuery && (
                      <button
                        type='button'
                        onClick={handleClearEnrollmentSearch}
                        className='absolute right-3 text-slate-400 hover:text-slate-700 cursor-pointer flex items-center justify-center'
                      >
                        <FiX className='h-4.5 w-4.5' />
                      </button>
                    )}
                  </form>
                </div>
              </div>

              {(
                (searchResults !== null ? searchResults : recentEnrollments) ||
                []
              ).length === 0 ? (
                <div className='p-12 text-center text-slate-400 font-semibold text-base'>
                  {searchResults !== null
                    ? 'No matching enrollment records found.'
                    : 'No enrollment records found.'}
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-left border-collapse text-base'>
                    <thead>
                      <tr className='bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-base uppercase tracking-wider'>
                        <th className='px-6 py-3.5'>Student</th>
                        <th className='px-6 py-3.5'>Course</th>
                        <th className='px-4 py-3.5 text-center'>Status</th>
                        <th className='px-4 py-3.5 text-right'>Paid</th>
                        <th className='px-6 py-3.5 text-center'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                      {(
                        (searchResults !== null
                          ? searchResults
                          : recentEnrollments) || []
                      ).map((e) => (
                        <tr
                          key={e.id}
                          className='hover:bg-slate-50 transition-colors'
                        >
                          <td className='px-6 py-4'>
                            <p className='font-bold text-slate-800'>
                              {e.studentName}
                            </p>
                            <p className='text-base font-semibold text-slate-400 mt-0.5'>
                              {e.studentEmail}
                            </p>
                          </td>
                          <td className='px-6 py-4 font-semibold text-slate-600 max-w-xs truncate'>
                            {e.courseTitle}
                          </td>
                          <td className='px-4 py-4 text-center'>
                            <span
                              className={`inline-flex px-3 py-1 rounded-lg text-base font-bold capitalize ${statusColors[e.paymentStatus] || ''}`}
                            >
                              {e.paymentStatus}
                            </span>
                          </td>
                          <td className='px-6 py-4 text-right font-bold text-emerald-600'>
                            {formatCurrency(e.pricePaid)}
                          </td>
                          <td className='px-6 py-4 text-center'>
                            <button
                              type='button'
                              onClick={() =>
                                handleRemoveEnrollment(
                                  e.id,
                                  e.studentName,
                                  e.courseTitle,
                                )
                              }
                              className='p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors'
                              title='Remove Course (Unenroll)'
                            >
                              <FiTrash2 className='h-5 w-5' />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Testimonials Review Feed (4 cols) */}
            <div className='lg:col-span-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col'>
              <div className='px-6 py-5 border-b border-slate-100'>
                <h2 className='text-lg font-bold text-slate-800'>
                  Reviews Pending
                </h2>
                <p className='text-base font-semibold text-slate-500 mt-0.5'>
                  Testimonial moderation feed
                </p>
              </div>

              <div className='flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[360px]'>
                {recentReviews && recentReviews.length === 0 ? (
                  <div className='p-8 text-center text-slate-400 font-semibold text-base h-full flex items-center justify-center'>
                    All reviews are moderated!
                  </div>
                ) : (
                  recentReviews?.map((r) => (
                    <div
                      key={r.id}
                      className='p-5 space-y-3.5 hover:bg-slate-50 transition-colors'
                    >
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='font-bold text-slate-800 text-base'>
                            {r.studentName}
                          </p>
                          <p className='text-base font-bold text-[#E61C24] uppercase tracking-wider mt-0.5'>
                            {r.courseTitle}
                          </p>
                        </div>
                        <div className='flex items-center text-amber-600 gap-1 text-base font-bold bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200'>
                          <FiStar className='fill-amber-500 h-3.5 w-3.5' />
                          {r.rating}
                        </div>
                      </div>
                      <p className='text-base text-slate-500 font-medium italic leading-relaxed'>
                        &ldquo;{r.comment}&rdquo;
                      </p>
                      <div className='flex items-center gap-2.5 pt-1.5'>
                        <button
                          onClick={() => handleModerateReview(r.id, 'approved')}
                          className='flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base cursor-pointer transition-colors'
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleModerateReview(r.id, 'rejected')}
                          className='flex-1 py-2 rounded-lg border border-rose-200 hover:border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-base cursor-pointer transition-colors'
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── STAFF DASHBOARD ──────────────────────────────────────────────────── */}
      {role === 'staff' && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5'>
          <div className='bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex items-center gap-4'>
            <div className='h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0'>
              <FiFolder className='h-5 w-5' />
            </div>
            <div>
              <p className='text-base font-semibold text-slate-500'>
                Categories
              </p>
              <p className='text-2xl font-bold text-slate-800'>
                {summary.totalCategories || 0}
              </p>
            </div>
          </div>

          <div className='bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex items-center gap-4'>
            <div className='h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0'>
              <FiFileText className='h-5 w-5' />
            </div>
            <div>
              <p className='text-base font-semibold text-slate-500'>
                Blog Posts
              </p>
              <p className='text-2xl font-bold text-slate-800'>
                {summary.totalBlogs || 0}
              </p>
            </div>
          </div>

          <div className='bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex items-center gap-4'>
            <div className='h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0'>
              <FiHelpCircle className='h-5 w-5' />
            </div>
            <div>
              <p className='text-base font-semibold text-slate-500'>
                {' '}
                accordion FAQs
              </p>
              <p className='text-2xl font-bold text-slate-800'>
                {summary.totalFAQs || 0}
              </p>
            </div>
          </div>

          <div className='bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex items-center gap-4'>
            <div className='h-10 w-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0'>
              <FiStar className='h-5 w-5' />
            </div>
            <div>
              <p className='text-base font-semibold text-slate-500'>
                Pending Reviews
              </p>
              <p className='text-2xl font-bold text-slate-800'>
                {summary.pendingReviews || 0}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── INSTRUCTOR DASHBOARD ────────────────────────────────────────────── */}
      {role === 'instructor' && (
        <div className='space-y-6'>
          {/* Stats grid */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-5'>
            <div className='bg-white border border-slate-200 p-6 rounded-lg shadow-sm flex items-center gap-4'>
              <div className='h-10 w-10 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center text-[#E61C24] shrink-0'>
                <FiBookOpen className='h-5 w-5' />
              </div>
              <div>
                <p className='text-base font-semibold text-slate-500'>
                  Assigned Courses
                </p>
                <p className='text-2xl font-bold text-slate-800'>
                  {summary.totalCourses || 0}
                </p>
              </div>
            </div>

            <div className='bg-white border border-slate-200 p-6 rounded-lg shadow-sm flex items-center gap-4'>
              <div className='h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0'>
                <FiPlay className='h-5 w-5' />
              </div>
              <div>
                <p className='text-base font-semibold text-slate-500'>
                  Lessons Created
                </p>
                <p className='text-2xl font-bold text-slate-800'>
                  {summary.totalLessons || 0}
                </p>
              </div>
            </div>

            <div className='bg-white border border-slate-200 p-6 rounded-lg shadow-sm flex items-center gap-4'>
              <div className='h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0'>
                <FiUsers className='h-5 w-5' />
              </div>
              <div>
                <p className='text-base font-semibold text-slate-500'>
                  Active Students
                </p>
                <p className='text-2xl font-bold text-slate-800'>
                  {summary.totalStudents || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Student reviews shortcut */}
          <div className='bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex items-start gap-4'>
              <div className='h-11 w-11 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0'>
                <FiStar className='h-5 w-5' />
              </div>
              <div>
                <h2 className='text-lg font-bold text-slate-800'>
                  Student Reviews About You
                </h2>
                <p className='text-base font-semibold text-slate-500 mt-0.5'>
                  View ratings students left for your teaching. Approval is
                  handled by admins and staff only.
                </p>
              </div>
            </div>
            <Link
              href='/admin/my-reviews'
              className='inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shrink-0'
            >
              View My Reviews
              <FiChevronRight className='h-4.5 w-4.5' />
            </Link>
          </div>

          {/* Grid Layout: Your Syllabus + Live Classes Sidebar */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            {/* Left side: Your Syllabus */}
            <div className='lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4'>
              <div>
                <h2 className='text-lg font-bold text-slate-800'>
                  Your Syllabus
                </h2>
                <p className='text-base font-semibold text-slate-500 mt-0.5'>
                  Courses currently assigned to your instruction
                </p>
              </div>

              {courses && courses.length === 0 ? (
                <div className='text-center py-8 text-slate-400 font-semibold text-base'>
                  No courses assigned to your profile yet.
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-left border-collapse text-base'>
                    <thead>
                      <tr className='bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-sm uppercase tracking-wider'>
                        <th className='px-6 py-3.5'>Course Title</th>
                        <th className='px-6 py-3.5'>Price</th>
                        <th className='px-4 py-3.5 text-center'>Visibility</th>
                        <th className='px-6 py-3.5 text-right'>Actions</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100 font-semibold text-slate-700'>
                      {courses?.map((c) => (
                        <tr
                          key={c.id}
                          className='hover:bg-slate-50 transition-colors'
                        >
                          <td className='px-6 py-4'>
                            <div className='flex items-center gap-4'>
                              {/* Thumbnail */}
                              <div className='h-12 w-20 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 relative flex items-center justify-center select-none'>
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
                                <p className='font-bold text-slate-800 text-base leading-snug line-clamp-1'>
                                  {c.title}
                                </p>
                                <p className='text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider'>
                                  {c.level} • {c.duration}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 text-base text-[#E61C24] font-bold'>
                            {formatCurrency(c.price)}
                          </td>
                          <td className='px-4 py-4 text-center'>
                            <span
                              className={`inline-flex px-2.5 py-1 rounded text-xs font-bold uppercase select-none ${
                                c.status === 'published'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className='px-6 py-4 text-right'>
                            <Link
                              href={`/admin/lessons?courseId=${c.id}`}
                              className='inline-flex items-center gap-1.5 py-2 px-4 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors'
                            >
                              <FiList className='h-4.5 w-4.5' />
                              <span>Manage Syllabus</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right side: Live Classes Sidebar (Short form) */}
            <div className='lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col'>
              <div className='border-b border-slate-200 pb-4 flex items-center justify-between'>
                <div>
                  <h2 className='text-lg font-bold text-slate-800 flex items-center gap-2'>
                    <span className='h-2 w-2 rounded-full bg-[#E61C24] animate-pulse' />
                    Live Schedule
                  </h2>
                  <p className='text-base font-semibold text-slate-500 mt-0.5'>
                    Upcoming interactive classes
                  </p>
                </div>
                <span className='px-2 py-0.5 bg-[#E61C24]/10 border border-[#E61C24]/20 text-[#E61C24] text-xs font-bold rounded-md select-none shrink-0'>
                  {(data.liveLessons || []).length} Total
                </span>
              </div>

              <div className='flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[380px] mt-3 space-y-4 pr-1'>
                {!data.liveLessons || data.liveLessons.length === 0 ? (
                  <div className='text-center py-12 text-slate-400 font-semibold text-base'>
                    No live classes scheduled.
                  </div>
                ) : (
                  data.liveLessons.map((lesson) => {
                    const dateObj = lesson.liveDate
                      ? new Date(lesson.liveDate)
                      : null;
                    const formattedDate = dateObj
                      ? formatBdDateTime(dateObj, {
                          year: undefined,
                        })
                      : 'Not Scheduled';

                    const isUpcoming = dateObj
                      ? dateObj.getTime() > new Date().getTime()
                      : false;

                    return (
                      <div
                        key={lesson.id}
                        className='pt-4 first:pt-0 flex flex-col gap-2'
                      >
                        <div>
                          <div className='flex items-start justify-between gap-2'>
                            <h3 className='font-bold text-slate-800 text-base leading-snug line-clamp-2'>
                              {lesson.title}
                            </h3>
                            <span className='shrink-0 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200 select-none'>
                              {lesson.livePlatform}
                            </span>
                          </div>
                          <p className='text-xs font-bold text-slate-400 mt-1 truncate'>
                            {lesson.courseTitle}
                          </p>
                        </div>

                        <div className='flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-2 rounded-lg'>
                          <div className='flex items-center gap-1.5'>
                            <span
                              className={`h-2 w-2 rounded-full ${isUpcoming ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`}
                            />
                            <span className='text-xs font-bold text-slate-600'>
                              {formattedDate}
                            </span>
                          </div>
                          {lesson.liveUrl ? (
                            <a
                              href={lesson.liveUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='py-1 px-2.5 rounded bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-xs transition-colors shrink-0'
                            >
                              Join
                            </a>
                          ) : (
                            <span className='text-xs font-bold text-slate-400 shrink-0'>
                              Pending
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className='bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4'>
            <div>
              <h2 className='text-lg font-bold text-slate-800'>
                Student Course Progress
              </h2>
              <p className='text-base font-semibold text-slate-500 mt-0.5'>
                Live syllabus completion across your assigned courses
              </p>
            </div>

            {!data.studentProgress || data.studentProgress.length === 0 ? (
              <div className='text-center py-8 text-slate-400 font-semibold text-base'>
                No enrolled students found for your courses yet.
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-left border-collapse text-base'>
                  <thead>
                    <tr className='bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-sm uppercase tracking-wider'>
                      <th className='px-6 py-3.5'>Student</th>
                      <th className='px-6 py-3.5'>Course</th>
                      <th className='px-6 py-3.5 text-center'>Lessons</th>
                      <th className='px-6 py-3.5 text-center'>Progress</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100 font-semibold text-slate-700'>
                    {data.studentProgress.map((row) => (
                      <tr
                        key={row.id}
                        className='hover:bg-slate-50 transition-colors'
                      >
                        <td className='px-6 py-4'>
                          <p className='font-bold text-slate-800'>
                            {row.studentName}
                          </p>
                          <p className='text-sm font-semibold text-slate-400 mt-0.5'>
                            {row.studentEmail}
                          </p>
                        </td>
                        <td className='px-6 py-4 font-bold text-slate-800'>
                          {row.courseTitle}
                        </td>
                        <td className='px-6 py-4 text-center text-slate-600'>
                          {row.completedLessons}/{row.totalLessons}
                        </td>
                        <td className='px-6 py-4'>
                          <div className='flex flex-col items-center gap-1.5'>
                            <span
                              className={`inline-flex h-9 w-14 rounded-lg items-center justify-center font-bold text-sm border ${
                                row.progress === 100
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                  : 'bg-[#E61C24]/10 border-[#E61C24]/20 text-[#E61C24]'
                              }`}
                            >
                              {row.progress}%
                            </span>
                            <div className='w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden'>
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  row.progress === 100
                                    ? 'bg-emerald-500'
                                    : 'bg-[#E61C24]'
                                }`}
                                style={{ width: `${row.progress}%` }}
                              />
                            </div>
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
      )}
    </div>
  );
}
