'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  FiChevronRight,
  FiLock,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUnlock,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

export default function UsersDatabaseClient() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // all, admin, staff, instructor, student

  useEffect(() => {
    fetchUsers();
  }, []);

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

  const persistUserStatus = async (id: string, type: string, status: string) => {
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
      // A toast with an Undo action, in case the wrong row's button got
      // clicked — cheaper than a second confirm dialog on every click.
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
        fetchUsers();        Swal.fire({
          toast: true,
          position: 'bottom-end',
          icon: 'info',
          title: 'Status reverted',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err: any) {
      Swal.fire('Error', err.message, 'error');    }
  };

  const openUserDetail = (user: any) => {
    router.push(`/admin/users-db/${user._id}?type=${user.type}`);
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className='p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto font-sans'>
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
            <p className='text-sm font-semibold text-slate-500 mt-1'>
              Manage platform students, instructors, and staff.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm'>
        <div className='relative w-full sm:max-w-md'>
          <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
            <FiSearch className='h-5 w-5 text-slate-400' />
          </div>
          <input
            type='text'
            placeholder='Search by name or email...'
            className='pl-10 w-full h-11 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E61C24]/20 focus:border-[#E61C24] transition-all'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className='flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar'>
          {['all', 'student', 'instructor', 'staff', 'admin'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all whitespace-nowrap ${
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

      {/* Table */}
      <div className='bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-left border-collapse min-w-[800px]'>
            <thead>
              <tr className='bg-slate-50 border-b border-slate-200'>
                <th className='px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider'>
                  User
                </th>
                <th className='px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider'>
                  Role
                </th>
                <th className='px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider'>
                  Status
                </th>
                <th className='px-6 py-4 text-sm font-bold text-slate-600 uppercase tracking-wider text-right'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {loading ? (
                <tr>
                  <td colSpan={4} className='px-6 py-12 text-center'>
                    <div className='flex flex-col items-center justify-center gap-3'>
                      <div className='h-8 w-8 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
                      <span className='text-sm font-bold text-slate-500'>
                        Loading database...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className='px-6 py-12 text-center'>
                    <div className='flex flex-col items-center justify-center gap-3'>
                      <FiSearch className='h-8 w-8 text-slate-300' />
                      <span className='text-sm font-bold text-slate-500'>
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
                          <p className='text-sm font-bold text-slate-900 group-hover:text-[#E61C24] transition-colors'>
                            {user.name}
                          </p>
                          <p className='text-xs font-semibold text-slate-500 mt-0.5'>
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
