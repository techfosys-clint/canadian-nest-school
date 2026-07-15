'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  FiAward,
  FiBell,
  FiBook,
  FiBookOpen,
  FiLayout,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiRadio,
  FiSearch,
  FiShield,
  FiStar,
  FiUser,
  FiX,
} from 'react-icons/fi';
import Swal from 'sweetalert2';

interface UserSession {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePic?: string | null;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (
          !res.ok ||
          !data.authenticated ||
          (data.user.role !== 'student' && data.user.role !== 'admin')
        ) {
          router.push('/login');
          return;
        }

        setUser(data.user);
      } catch (err) {
        console.error('Failed to verify session', err);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });

      Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        text: 'You have logged out successfully.',
        timer: 1500,
        showConfirmButton: false,
      });

      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-zinc-50'>
        <div className='flex flex-col items-center gap-4'>
          <div className='h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin' />
          <p className='text-base font-bold text-zinc-600'>
            Loading Student Portal...
          </p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const sidebarLinks = [
    { label: 'Overview', href: '/dashboard', icon: FiLayout },
    { label: 'My Courses', href: '/dashboard/courses', icon: FiBookOpen },
    { label: 'Study Hub', href: '/dashboard/study-hub', icon: FiBook },
    { label: 'Live Classes', href: '/dashboard/live-classes', icon: FiRadio },
    {
      label: 'My Certificates',
      href: '/dashboard/certificates',
      icon: FiAward,
    },
    { label: 'My Orders', href: '/dashboard/orders', icon: FiPackage },
    { label: 'My Reviews', href: '/dashboard/reviews', icon: FiStar },
    { label: 'Profile Settings', href: '/dashboard/profile', icon: FiUser },
  ];

  if (user.role === 'admin') {
    sidebarLinks.push({
      label: 'Admin Console',
      href: '/admin',
      icon: FiShield,
    });
  }

  return (
    <div className='h-screen bg-zinc-50/50 flex font-sans overflow-hidden'>
      {/* 1. Sidebar for Desktop (Sleek, Premium Dark slate theme) */}
      <aside className='hidden lg:flex flex-col w-64 bg-[#0A1128] text-zinc-300 border-r border-[#152347] shrink-0 select-none h-full'>
        {/* Sidebar Brand Header */}
        <div className='h-20 flex items-center px-6 border-b border-[#152347] justify-between'>
          <Link
            href='/'
            className='flex items-center group bg-white px-3 py-1.5 rounded-lg shadow-sm'
          >
            <Image
              src='/logo.png'
              alt='Canadian Nest School'
              className='h-13 w-auto object-contain'
              width={100}
              height={100}
            />
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <nav className='flex-1 px-4 py-3 space-y-1'>
          <p className='text-xs font-bold text-[#4c6093] uppercase tracking-wider px-3 mb-2'>
            LMS Menu
          </p>
          {sidebarLinks.map((link) => {
            const isActive =
              link.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#E61C24] text-white'
                    : 'hover:bg-[#152347] hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Student Info Footer */}
        <div className='p-4 border-t border-[#152347] bg-[#070d20]'>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-full border border-[#E61C24]/30 bg-[#152347] flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0'>
              {user.profilePic ? (
                <Image
                  src={user.profilePic}
                  alt={user.name}
                  className='h-full w-full object-cover'
                  width={100}
                  height={100}
                />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-base font-bold text-white truncate leading-tight'>
                {user.name}
              </p>
              <p className='text-sm font-semibold text-[#E61C24] truncate mt-0.5'>
                Student Account
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg border border-red-500/20 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold text-base transition-all cursor-pointer'
          >
            <FiLogOut className='h-4.5 w-4.5' />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Drawer Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden'
        />
      )}

      {/* 3. Mobile Sidebar Drawer Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0A1128] text-zinc-300 border-r border-[#152347] flex flex-col justify-between select-none transition-transform duration-300 lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className='h-20 flex items-center px-6 border-b border-[#152347] justify-between'>
            <Link
              href='/'
              className='flex items-center group bg-white px-3 py-1.5 rounded-lg shadow-sm'
            >
              <Image
                src='/logo.png'
                alt='Canadian Nest School'
                className='h-13 w-auto object-contain'
                width={100}
                height={100}
              />
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className='p-1 rounded-lg hover:bg-[#152347] text-zinc-400 hover:text-white'
            >
              <FiX className='h-6 w-6' />
            </button>
          </div>

          <nav className='px-4 py-3 space-y-1'>
            <p className='text-xs font-bold text-[#4c6093] uppercase tracking-wider px-3 mb-2'>
              LMS Menu
            </p>
            {sidebarLinks.map((link) => {
              const isActive =
                link.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
              const Icon = link.icon;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-[#E61C24] text-white'
                      : 'hover:bg-[#152347] hover:text-white'
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className='p-4 border-t border-[#152347] bg-[#070d20]'>
          <div className='flex items-center gap-3'>
            <div className='h-10 w-10 rounded-full border border-[#E61C24]/30 bg-[#152347] flex items-center justify-center text-xs font-bold text-white overflow-hidden shrink-0'>
              {user.profilePic ? (
                <Image
                  src={user.profilePic}
                  alt={user.name}
                  className='h-full w-full object-cover'
                  width={100}
                  height={100}
                />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className='min-w-0 flex-1'>
              <p className='text-base font-bold text-white truncate leading-none'>
                {user.name}
              </p>
              <p className='text-sm font-semibold text-[#E61C24] truncate mt-1'>
                Student
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className='w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-500/20 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold text-base transition-all cursor-pointer'
          >
            <FiLogOut className='h-4.5 w-4.5' />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 4. Main Page Container */}
      <div className='flex-1 flex flex-col min-w-0 h-full overflow-hidden'>
        {/* Sticky Top Header (Clean, Premium White Backdrop blur) */}
        <header className='sticky top-0 z-30 w-full h-20 bg-white/80 backdrop-blur-md border-b border-zinc-200/60 px-6 flex items-center justify-between select-none shrink-0'>
          {/* Mobile hamburger menu toggle */}
          <div className='flex items-center gap-3 lg:hidden'>
            <button
              onClick={() => setSidebarOpen(true)}
              className='p-2 rounded-lg border border-zinc-200 hover:border-zinc-350 text-zinc-600 hover:text-zinc-900 bg-white'
            >
              <FiMenu className='h-5 w-5' />
            </button>
            <Link href='/' className='flex items-center group'>
              <Image
                src='/logo.png'
                alt='Canadian Nest School'
                className='h-11 w-auto object-contain'
                width={100}
                height={100}
              />
            </Link>
          </div>

          {/* Desktop Mock Search (adds premium touch) */}
          <div className='hidden lg:flex items-center gap-2.5 w-80 px-3.5 py-2 rounded-lg bg-zinc-50 border border-zinc-200/80 focus-within:border-[#E61C24]/60 transition-colors'>
            <FiSearch className='h-4.5 w-4.5 text-zinc-400' />
            <input
              type='text'
              placeholder='Search courses, streak, assignments...'
              className='bg-transparent border-none outline-none w-full text-base font-semibold text-zinc-800 placeholder-zinc-400'
            />
          </div>

          {/* Top Bar Right side Actions */}
          <div className='flex items-center gap-4.5 ml-auto lg:ml-0'>
            {/* Go to Courses Page Shortcut */}
            <Link
              href='/courses'
              className='hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-base font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors'
            >
              <FiBookOpen className='h-4.5 w-4.5' />
              <span>Courses Page</span>
            </Link>

            {/* Notification Bell Icon */}
            <button
              onClick={() => {
                Swal.fire({
                  icon: 'info',
                  title: 'Notifications',
                  text: 'You have no new notifications.',
                  confirmButtonColor: '#E61C24',
                });
              }}
              className='relative p-2 rounded-lg border border-zinc-200 hover:border-zinc-350 text-zinc-500 hover:text-zinc-900 bg-white transition-colors cursor-pointer'
            >
              <FiBell className='h-5 w-5' />
              <span className='absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-ping' />
              <span className='absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500' />
            </button>

            {/* User Profile Summary */}
            <div className='flex items-center gap-3 border-l border-zinc-200 pl-4.5'>
              <div className='h-10 w-10 rounded-full border border-[#E61C24]/20 bg-zinc-100 flex items-center justify-center overflow-hidden shrink-0'>
                {user.profilePic ? (
                  <Image
                    src={user.profilePic}
                    alt={user.name}
                    className='h-full w-full object-cover'
                    width={100}
                    height={100}
                  />
                ) : (
                  <FiUser className='h-5 w-5 text-zinc-500' />
                )}
              </div>
              <div className='hidden sm:block'>
                <p className='text-base font-bold text-zinc-800 leading-none'>
                  {user.name}
                </p>
                <p className='text-sm font-semibold text-zinc-400 mt-1'>
                  Student
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Nested Dashboard Views */}
        <div className='flex-1 overflow-y-auto'>{children}</div>
      </div>
    </div>
  );
}
