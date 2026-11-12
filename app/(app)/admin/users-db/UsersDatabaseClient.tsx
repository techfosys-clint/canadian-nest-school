'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  FiChevronRight,
  FiDownload,
  FiLock,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUnlock,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

type CourseOption = { id: string; title: string };
type BatchOption = { id: string; name: string };
type EnrolledStudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  feeStatus: 'paid' | 'due';
  billingType: string;
  paidUntil: string | null;
};

export default function UsersDatabaseClient() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all, admin, staff, instructor, student

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseId, setCourseId] = useState('');

  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchId, setBatchId] = useState('');

  const [enrolledStudentIds, setEnrolledStudentIds] =
    useState<Set<string> | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<
    EnrolledStudentRow[]
  >([]);
  const [enrolledCourseTitle, setEnrolledCourseTitle] = useState('');
  const [enrolledLoading, setEnrolledLoading] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'due'>(
    'all',
  );

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users-db');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Failed to load user database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Load courses when Student filter is active
  useEffect(() => {
    if (roleFilter !== 'student') {
      setCourseId('');
      setBatchId('');
      setBatches([]);
      setEnrolledStudentIds(null);
      setEnrolledStudents([]);
      setEnrolledCourseTitle('');
      setPaymentFilter('all');
      return;
    }

    let cancelled = false;
    const loadCourses = async () => {
      setCoursesLoading(true);
      try {
        const res = await fetch('/api/admin/courses');
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            data.message || data.error || 'Failed to load courses',
          );
        }
        if (cancelled) return;
        const list: CourseOption[] = (data.data?.courses || []).map(
          (c: any) => ({
            id: c._id?.toString?.() || String(c._id),
            title: c.title || 'Untitled course',
          }),
        );
        setCourses(list);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setCourses([]);
          Swal.fire('Error', 'Failed to load courses for filtering.', 'error');
        }
      } finally {
        if (!cancelled) setCoursesLoading(false);
      }
    };

    loadCourses();
    return () => {
      cancelled = true;
    };
  }, [roleFilter]);

  // Load batches when a course is selected
  useEffect(() => {
    if (roleFilter !== 'student' || !courseId) {
      setBatches([]);
      setBatchId('');
      return;
    }

    let cancelled = false;
    const loadBatches = async () => {
      setBatchesLoading(true);
      setBatchId('');
      try {
        const res = await fetch(`/api/admin/batches?course=${courseId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load batches');
        }
        if (cancelled) return;
        const list: BatchOption[] = (data.batches || []).map((b: any) => ({
          id: b._id?.toString?.() || String(b._id),
          name: b.name || 'Untitled batch',
        }));
        setBatches(list);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setBatches([]);
          Swal.fire(
            'Error',
            'Failed to load batches for this course.',
            'error',
          );
        }
      } finally {
        if (!cancelled) setBatchesLoading(false);
      }
    };

    loadBatches();
    return () => {
      cancelled = true;
    };
  }, [roleFilter, courseId]);

  // Resolve enrolled student IDs for course/batch filters
  useEffect(() => {
    if (roleFilter !== 'student' || !courseId) {
      setEnrolledStudentIds(null);
      setEnrolledStudents([]);
      setEnrolledCourseTitle('');
      setPaymentFilter('all');
      setEnrolledLoading(false);
      return;
    }

    let cancelled = false;
    const loadEnrolled = async () => {
      setEnrolledLoading(true);
      try {
        const params = new URLSearchParams({ courseId });
        if (batchId) params.set('batchId', batchId);
        const res = await fetch(`/api/admin/users-db/enrolled?${params}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to filter enrolled students');
        }
        if (cancelled) return;
        setEnrolledStudentIds(new Set(data.studentIds || []));
        setEnrolledStudents(data.students || []);
        setEnrolledCourseTitle(data.courseTitle || '');
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setEnrolledStudentIds(new Set());
          setEnrolledStudents([]);
          Swal.fire('Error', 'Failed to filter students by course.', 'error');
        }
      } finally {
        if (!cancelled) setEnrolledLoading(false);
      }
    };

    loadEnrolled();
    return () => {
      cancelled = true;
    };
  }, [roleFilter, courseId, batchId]);

  const handleRoleChange = (role: string) => {
    setRoleFilter(role);
    if (role !== 'student') {
      setCourseId('');
      setBatchId('');
      setBatches([]);
      setEnrolledStudentIds(null);
      setEnrolledStudents([]);
      setEnrolledCourseTitle('');
      setPaymentFilter('all');
    }
  };

  const feeStatusById = useMemo(() => {
    const map = new Map<string, 'paid' | 'due'>();
    for (const row of enrolledStudents) map.set(row.id, row.feeStatus);
    return map;
  }, [enrolledStudents]);

  const handleDelete = async (id: string, type: string) => {
    const result = await Swal.fire({
      title: 'Delete Account?',
      text: 'This action cannot be undone. All data for this user will be lost.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#E61C24',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/admin/users-db?id=${id}&type=${type}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete');

        Swal.fire('Deleted!', 'The account has been deleted.', 'success');
        fetchUsers();
      } catch (err: any) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  const persistUserStatus = async (
    id: string,
    type: string,
    status: string,
  ) => {
    const res = await fetch('/api/admin/users-db', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type, status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update status');
  };

  const handleToggleStatus = async (
    id: string,
    type: string,
    currentStatus: string,
  ) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';

    const result = await Swal.fire({
      title: `${newStatus === 'suspended' ? 'Block' : 'Unblock'} Account?`,
      text:
        newStatus === 'suspended'
          ? 'The user will lose access to their account.'
          : "The user's access will be restored.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'suspended' ? '#E61C24' : '#10b981',
      cancelButtonColor: '#475569',
      confirmButtonText: `Yes, ${newStatus === 'suspended' ? 'block' : 'unblock'}!`,
    });

    if (!result.isConfirmed) return;

    try {
      await persistUserStatus(id, type, newStatus);
      fetchUsers();
      const toastResult = await Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'success',
        title: `Account ${newStatus === 'suspended' ? 'blocked' : 'unblocked'}`,
        showConfirmButton: true,
        confirmButtonText: 'Undo',
        confirmButtonColor: '#475569',
        timer: 6000,
        timerProgressBar: true,
      });

      if (toastResult.isConfirmed) {
        await persistUserStatus(id, type, currentStatus);
        fetchUsers();
        Swal.fire({
          toast: true,
          position: 'bottom-end',
          icon: 'info',
          title: 'Status reverted',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const openUserDetail = (user: any) => {
    router.push(`/admin/users-db/${user._id}?type=${user.type}`);
  };

  const showBatchFilter =
    roleFilter === 'student' &&
    !!courseId &&
    !batchesLoading &&
    batches.length > 0;

  const showPaymentFilter = roleFilter === 'student' && !!courseId;
  const showFeeColumn = showPaymentFilter;

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      if (!matchesSearch || !matchesRole) return false;

      if (roleFilter === 'student' && courseId && enrolledStudentIds) {
        if (!enrolledStudentIds.has(u._id)) return false;
        if (paymentFilter !== 'all') {
          const fee = feeStatusById.get(u._id);
          if (fee !== paymentFilter) return false;
        }
      }
      return true;
    });
  }, [
    users,
    search,
    roleFilter,
    courseId,
    enrolledStudentIds,
    paymentFilter,
    feeStatusById,
  ]);

  const exportRows = useMemo(() => {
    if (!courseId || enrolledStudents.length === 0) return [];
    const idSet = new Set(filteredUsers.map((u) => u._id));
    return enrolledStudents.filter((row) => {
      if (!idSet.has(row.id)) return false;
      if (paymentFilter !== 'all' && row.feeStatus !== paymentFilter)
        return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q)
      );
    });
  }, [courseId, enrolledStudents, filteredUsers, paymentFilter, search]);

  const batchLabel =
    batches.find((b) => b.id === batchId)?.name ||
    (batchId ? 'Selected batch' : 'All batches');

  const downloadCsv = () => {
    if (exportRows.length === 0) {
      Swal.fire(
        'Nothing to export',
        'No students match the current filters.',
        'info',
      );
      return;
    }
    const header = [
      'Name',
      'Email',
      'Phone',
      'Account Status',
      'Fee Status',
      'Billing Type',
      'Paid Until',
      'Course',
      'Batch',
    ];
    const lines = [
      header.join(','),
      ...exportRows.map((row) =>
        [
          row.name,
          row.email,
          row.phone,
          row.status,
          row.feeStatus,
          row.billingType,
          row.paidUntil ? new Date(row.paidUntil).toLocaleString() : '',
          enrolledCourseTitle,
          batchLabel,
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${courseId}${batchId ? `-${batchId}` : ''}-${paymentFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (exportRows.length === 0) {
      Swal.fire(
        'Nothing to export',
        'No students match the current filters.',
        'info',
      );
      return;
    }
    const escapeHtml = (value: string) =>
      String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const rowsHtml = exportRows
      .map(
        (row) => `<tr>
          <td>${escapeHtml(row.name)}</td>
          <td>${escapeHtml(row.email)}</td>
          <td>${escapeHtml(row.phone)}</td>
          <td>${escapeHtml(row.feeStatus.toUpperCase())}</td>
          <td>${escapeHtml(row.billingType)}</td>
          <td>${escapeHtml(row.paidUntil ? new Date(row.paidUntil).toLocaleDateString() : '—')}</td>
        </tr>`,
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><title>Student Export</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
        h1{font-size:20px;margin:0 0 8px}
        p{font-size:13px;color:#475569;margin:0 0 16px}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}
        th{background:#f8fafc}
      </style></head><body>
      <h1>${escapeHtml(enrolledCourseTitle || 'Course')} — Students</h1>
      <p>Batch: ${escapeHtml(batchLabel)} · Fee filter: ${paymentFilter.toUpperCase()} · Exported ${new Date().toLocaleString()}</p>
      <table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Fee</th><th>Billing</th><th>Paid Until</th></tr></thead>
      <tbody>${rowsHtml}</tbody></table>
      <script>window.onload=function(){window.print()}</script>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) {
      Swal.fire('Popup blocked', 'Allow popups to export PDF.', 'warning');
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const tableBusy = loading || enrolledLoading;

  return (
    <div className='p-4 sm:p-6 lg:p-8 space-y-6 max-w-400 mx-auto font-sans'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='h-12 w-12 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 flex items-center justify-center shrink-0'>
            <FiUsers className='h-6 w-6 text-[#E61C24]' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-slate-900 tracking-tight'>
              User Database
            </h1>
            <p className='text-base font-semibold text-slate-500 mt-1'>
              Manage platform students, instructors, and staff.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-4'>
        <div className='flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4'>
          <div className='relative w-full lg:max-w-md'>
            <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
              <FiSearch className='h-5 w-5 text-slate-400' />
            </div>
            <input
              type='text'
              placeholder='Search by name or email...'
              className='pl-10 w-full h-11 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61C24]/20 focus:border-[#E61C24] transition-all'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className='flex gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 hide-scrollbar'>
            {['all', 'student', 'instructor', 'staff', 'admin'].map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                className={`px-4 py-2 rounded-lg text-base font-bold capitalize transition-all whitespace-nowrap ${
                  roleFilter === role
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {roleFilter === 'student' && (
          <div className='flex flex-col sm:flex-row gap-3 pt-1 border-t border-slate-100'>
            <div className='flex-1 min-w-0'>
              <label
                htmlFor='users-db-course-filter'
                className='block text-base font-bold text-slate-700 mb-1.5'
              >
                Course
              </label>
              <select
                id='users-db-course-filter'
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                disabled={coursesLoading}
                className='w-full h-11 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#E61C24]/20 focus:border-[#E61C24] transition-all disabled:opacity-60'
              >
                <option value=''>
                  {coursesLoading ? 'Loading courses…' : 'All courses'}
                </option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {showBatchFilter && (
              <div className='flex-1 min-w-0'>
                <label
                  htmlFor='users-db-batch-filter'
                  className='block text-base font-bold text-slate-700 mb-1.5'
                >
                  Batch
                </label>
                <select
                  id='users-db-batch-filter'
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className='w-full h-11 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#E61C24]/20 focus:border-[#E61C24] transition-all'
                >
                  <option value=''>All batches</option>
                  {batches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {courseId && batchesLoading && (
              <div className='flex items-end'>
                <p className='text-base font-semibold text-slate-500 pb-2.5'>
                  Checking batches…
                </p>
              </div>
            )}

            {showPaymentFilter && (
              <div className='flex-1 min-w-0'>
                <label
                  htmlFor='users-db-payment-filter'
                  className='block text-base font-bold text-slate-700 mb-1.5'
                >
                  Fee status
                </label>
                <select
                  id='users-db-payment-filter'
                  value={paymentFilter}
                  onChange={(e) =>
                    setPaymentFilter(e.target.value as 'all' | 'paid' | 'due')
                  }
                  className='w-full h-11 bg-slate-50 border border-slate-200 rounded-lg text-base text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#E61C24]/20 focus:border-[#E61C24] transition-all'
                >
                  <option value='all'>All (paid + due)</option>
                  <option value='paid'>Paid / current</option>
                  <option value='due'>Due / overdue</option>
                </select>
              </div>
            )}
          </div>
        )}

        {showPaymentFilter && (
          <div className='flex flex-wrap items-center gap-2 pt-1'>
            <button
              type='button'
              onClick={downloadCsv}
              className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#E61C24]/40 text-slate-700 hover:text-[#E61C24] font-bold text-base transition-colors'
            >
              <FiDownload className='h-4 w-4' />
              Export Excel/CSV
            </button>
            <button
              type='button'
              onClick={downloadPdf}
              className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:border-[#E61C24]/40 text-slate-700 hover:text-[#E61C24] font-bold text-base transition-colors'
            >
              <FiDownload className='h-4 w-4' />
              Export PDF
            </button>
            <p className='text-base font-semibold text-slate-500'>
              {exportRows.length} student{exportRows.length === 1 ? '' : 's'} in
              export
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className='bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse min-w-200'>
            <thead>
              <tr className='bg-slate-50 border-b border-slate-200'>
                <th className='px-6 py-4 text-base font-bold text-slate-600 uppercase tracking-wider'>
                  User
                </th>
                <th className='px-6 py-4 text-base font-bold text-slate-600 uppercase tracking-wider'>
                  Role
                </th>
                <th className='px-6 py-4 text-base font-bold text-slate-600 uppercase tracking-wider'>
                  Status
                </th>
                {showFeeColumn && (
                  <th className='px-6 py-4 text-base font-bold text-slate-600 uppercase tracking-wider'>
                    Fee
                  </th>
                )}
                <th className='px-6 py-4 text-base font-bold text-slate-600 uppercase tracking-wider text-right'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {tableBusy ? (
                <tr>
                  <td
                    colSpan={showFeeColumn ? 5 : 4}
                    className='px-6 py-12 text-center'
                  >
                    <div className='flex flex-col items-center justify-center gap-3'>
                      <div className='h-8 w-8 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
                      <span className='text-base font-bold text-slate-500'>
                        {enrolledLoading
                          ? 'Filtering enrolled students...'
                          : 'Loading database...'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={showFeeColumn ? 5 : 4}
                    className='px-6 py-12 text-center'
                  >
                    <div className='flex flex-col items-center justify-center gap-3'>
                      <FiSearch className='h-8 w-8 text-slate-300' />
                      <span className='text-base font-bold text-slate-500'>
                        No users found matching your criteria.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user._id}
                    onClick={() => openUserDetail(user)}
                    className='hover:bg-slate-50/80 transition-colors group cursor-pointer'
                    title='View user details'
                  >
                    <td className='px-6 py-4'>
                      <div className='flex items-center gap-4'>
                        <div className='h-10 w-10 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0'>
                          {user.profilePic ? (
                            <Image
                              src={user.profilePic}
                              alt={user.name}
                              className='h-full w-full object-cover'
                              width={100}
                              height={100}
                            />
                          ) : (
                            <FiUser className='h-5 w-5 text-slate-400' />
                          )}
                        </div>
                        <div>
                          <p className='text-base font-bold text-slate-900 group-hover:text-[#E61C24] transition-colors'>
                            {user.name}
                          </p>
                          <p className='text-base font-semibold text-slate-500 mt-0.5'>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-base font-bold uppercase tracking-wider ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : user.role === 'instructor'
                              ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : user.role === 'staff'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {user.isSuperAdmin ? (
                          <FiShield className='mr-1 h-3 w-3' />
                        ) : null}
                        {user.role}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-base font-bold uppercase tracking-wider ${
                          user.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        />
                        {user.status || 'active'}
                      </span>
                    </td>
                    {showFeeColumn && (
                      <td className='px-6 py-4'>
                        {(() => {
                          const fee = feeStatusById.get(user._id);
                          if (!fee) {
                            return (
                              <span className='text-base font-semibold text-slate-400'>
                                —
                              </span>
                            );
                          }
                          return (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-base font-bold uppercase tracking-wider ${
                                fee === 'paid'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-100 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {fee}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    <td className='px-6 py-4'>
                      <div className='flex items-center justify-end gap-2'>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(
                              user._id,
                              user.type,
                              user.status,
                            );
                          }}
                          className={`p-2 rounded-lg transition-colors border ${
                            user.status === 'active'
                              ? 'text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-200'
                              : 'text-emerald-600 hover:bg-emerald-50 border-transparent hover:border-emerald-200'
                          }`}
                          title={
                            user.status === 'active'
                              ? 'Suspend Account'
                              : 'Activate Account'
                          }
                        >
                          {user.status === 'active' ? (
                            <FiLock className='h-4 w-4' />
                          ) : (
                            <FiUnlock className='h-4 w-4' />
                          )}
                        </button>

                        {!user.isSuperAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(user._id, user.type);
                            }}
                            className='p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors'
                            title='Delete Account'
                          >
                            <FiTrash2 className='h-4 w-4' />
                          </button>
                        )}

                        <span
                          className='p-2 text-slate-300 group-hover:text-[#E61C24] transition-colors'
                          title='View details'
                        >
                          <FiChevronRight className='h-4 w-4' />
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
