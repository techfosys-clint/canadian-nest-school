'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import {
  FiLayout,
  FiBookOpen,
  FiList,
  FiStar,
  FiBookmark,
  FiHelpCircle,
  FiFileText,
  FiImage,
  FiLogOut,
  FiHome,
  FiMenu,
  FiX,
  FiUser,
  FiUserPlus,
  FiRadio,
  FiTag,
  FiUsers,
  FiTrendingUp,
  FiPlus,
  FiAward,
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface AdminSessionUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'staff' | 'instructor'
  profilePic?: string | null
  permissions?: string[]
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<AdminSessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isPublicAdminRoute = pathname === '/admin/login' || pathname.startsWith('/admin/super-admin')



  useEffect(() => {
    async function verifyAdminSession() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()

        if (res.ok && data.authenticated) {
          if (data.user.role === 'student') {
            // Students are strictly blocked from all admin routes and sent to their dashboard
            router.push('/dashboard')
            return
          }

          if (isPublicAdminRoute) {
            // Logged-in admin/staff/instructor shouldn't see the admin login page, send to admin dashboard
            router.push('/admin')
            return
          }

          if (!['admin', 'staff', 'instructor'].includes(data.user.role)) {
            router.push('/admin/login')
            return
          }

          setUser(data.user)
        } else {
          // Not authenticated
          if (!isPublicAdminRoute) {
            router.push('/admin/login')
          }
        }
      } catch (err) {
        console.error('Admin layout session check error:', err)
        if (!isPublicAdminRoute) {
          router.push('/admin/login')
        }
      } finally {
        setLoading(false)
      }
    }
    verifyAdminSession()
  }, [router, pathname, isPublicAdminRoute])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })

      Swal.fire({
        icon: 'success',
        title: 'Logged Out',
        text: 'Administrative session ended.',
        timer: 1500,
        showConfirmButton: false,
        background: '#ffffff',
        color: '#1a1a1a',
      })

      setTimeout(() => {
        window.location.href = '/admin/login'
      }, 1500)
    } catch (err) {
      console.error('Admin logout failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#615fff] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-slate-500">Verifying Admin Access...</p>
        </div>
      </div>
    )
  }

  if (isPublicAdminRoute) {
    return <>{children}</>
  }

  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Filter links based on custom permissions and role authorization
  const sidebarLinks = [
    { label: 'Overview', href: '/admin', icon: FiLayout, roles: ['admin', 'staff', 'instructor'], permission: 'overview' },
    { label: 'Manage Enrollments', href: '/admin/enrollments', icon: FiUsers, roles: ['admin'], permission: 'overview' },
    { label: 'Certificate Requests', href: '/admin/certificates', icon: FiAward, roles: ['admin', 'staff'], permission: 'certificates' },
    { label: 'Grading Submissions', href: '/admin/submissions', icon: FiFileText, roles: ['admin', 'instructor'], permission: 'lessons' },
    { label: 'Courses', href: '/admin/courses', icon: FiBookOpen, roles: ['admin', 'instructor'], permission: 'courses' },
    { label: 'Lessons Syllabus', href: '/admin/lessons', icon: FiList, roles: ['admin', 'instructor'], permission: 'lessons' },
    { label: 'Live Classes', href: '/admin/live-classes', icon: FiRadio, roles: ['admin', 'instructor'], permission: 'live-classes' },
    { label: 'Batches', href: '/admin/batches', icon: FiUsers, roles: ['admin', 'instructor'], permission: 'batches' },
    { label: 'Attendance', href: '/admin/attendance', icon: FiList, roles: ['admin', 'instructor'], permission: 'attendance' },
    { label: 'Reviews Moderate', href: '/admin/reviews', icon: FiStar, roles: ['admin', 'staff'], permission: 'reviews' },
    { label: 'Categories', href: '/admin/categories', icon: FiBookmark, roles: ['admin', 'staff'], permission: 'categories' },
    { label: 'FAQs Landing', href: '/admin/faqs', icon: FiHelpCircle, roles: ['admin', 'staff'], permission: 'faqs' },
    { label: 'Blog Posts', href: '/admin/blogs', icon: FiFileText, roles: ['admin', 'staff'], permission: 'blogs' },
    { label: 'Media Library', href: '/admin/media', icon: FiImage, roles: ['admin', 'staff'], permission: 'media' },
    { label: 'Staff Registry', href: '/admin/staff-register', icon: FiUserPlus, roles: ['admin'], permission: 'staff-register' },
    { label: 'Coupons Management', href: '/admin/coupons', icon: FiTag, roles: ['admin', 'staff'], permission: 'coupons' },
  ].filter((link) => {
    // 1. Root admin has access to everything
    if (user.role === 'admin') return true

    // 2. If user has custom permissions array, check if it contains the permission key
    if (user.permissions && user.permissions.length > 0) {
      if (link.permission === 'overview') return true
      return user.permissions.includes(link.permission)
    }

    // 3. Fallback: Role-based authorization if permissions array is empty or undefined
    return link.roles.includes(user.role)
  })

  return (
    <div className="h-screen bg-slate-50 flex font-sans overflow-hidden text-slate-800">
      
      {/* ── Desktop Sidebar Navigation (Clean Light) ── */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none h-full shadow-sm">
        
        {/* Sidebar Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-slate-200">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="h-9 w-9 rounded-lg bg-[#615fff] flex items-center justify-center font-bold text-slate-800 shadow-lg shadow-[#615fff]/30 transition-transform group-hover:scale-105 duration-300 text-base">
              T
            </span>
            <span className="text-xl font-bold font-display tracking-tight text-slate-800">
              Tutor Space
            </span>
          </Link>
        </div>

        {/* Sidebar Links */}
        <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
          <p className="text-base font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Management</p>
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-semibold transition-all duration-200 group ${
                  isActive 
                    ? 'bg-[#615fff] text-white shadow-md shadow-[#615fff]/20 border border-[#615fff]/20' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer User Info */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border border-[#615fff]/35 bg-slate-100 flex items-center justify-center text-base font-bold text-slate-700 overflow-hidden shrink-0">
              {user.profilePic ? (
                <img src={user.profilePic} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-slate-800 truncate leading-tight">{user.name}</p>
              <p className="text-base font-semibold text-[#615fff] truncate mt-0.5 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100 text-red-500 font-bold text-base transition-all duration-200 cursor-pointer"
          >
            <FiLogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* ── Mobile Sidebar Drawer Overlay ── */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)} 
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Mobile Sidebar Drawer Panel ── */}
      <aside className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between select-none transition-transform duration-350 lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div>
          <div className="h-20 flex items-center px-6 border-b border-slate-200 justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="h-9 w-9 rounded-lg bg-[#615fff] flex items-center justify-center font-bold text-slate-800 text-base">
                T
              </span>
              <span className="text-xl font-bold font-display tracking-tight text-slate-800">
                Tutor Space
              </span>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>

          <nav className="px-4 py-3 space-y-1">
            <p className="text-base font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">Management</p>
            {sidebarLinks.map((link) => {
              const isActive = pathname === link.href
              const Icon = link.icon
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-base font-semibold transition-all duration-200 group ${
                    isActive 
                      ? 'bg-[#615fff] text-white shadow-md' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{link.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border border-[#615fff]/35 bg-slate-100 flex items-center justify-center text-base font-bold text-slate-700 overflow-hidden shrink-0">
              {user.profilePic ? (
                <img src={user.profilePic} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(user.name)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-slate-800 truncate leading-none">{user.name}</p>
              <p className="text-base font-semibold text-[#615fff] truncate mt-1 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100 text-red-500 font-bold text-base transition-all duration-200 cursor-pointer"
          >
            <FiLogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main View Panel Container ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
        
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 w-full h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between select-none shrink-0 shadow-sm">
          
          {/* Mobile hamburger menu toggle */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 bg-white cursor-pointer"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-lg bg-[#615fff] flex items-center justify-center font-bold text-slate-800 text-sm">
                T
              </span>
              <span className="text-lg font-bold font-display tracking-tight text-slate-800">
                Tutor Space
              </span>
            </Link>
          </div>

          {/* Page Badge Title Indicator */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-bold text-slate-400 uppercase tracking-widest">
              Live Console
            </span>
          </div>

          {/* Header Action Shortcuts */}
          <div className="flex items-center gap-4.5 ml-auto lg:ml-0">
            
            {/* View Homepage Shortcut */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-base font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
            >
              <FiHome className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">Portal Homepage</span>
            </Link>

            {/* Student Portal Shortcut */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-base font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
            >
              <FiUser className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">Student Portal</span>
            </Link>

            {/* Admin Badge Info */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4.5">
              <div className="h-10 w-10 rounded-full border border-[#615fff]/30 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                {user.profilePic ? (
                  <img src={user.profilePic} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <FiUser className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-base font-bold text-slate-800 leading-none">{user.name}</p>
                <p className="text-base font-semibold text-[#615fff] mt-1 capitalize">{user.role} Account</p>
              </div>
            </div>

          </div>

        </header>

        {/* Scrollable Dashboard View */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

      </div>

    </div>
  )
}
