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
  FiAward,
  FiChevronDown,
  FiChevronRight,
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

// ── Sidebar Link & Group Type Definitions ──
interface SidebarLink {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
  permission: string
}

interface SidebarGroup {
  groupLabel: string
  groupIcon: React.ComponentType<{ className?: string }>
  links: SidebarLink[]
}

// ── All sidebar groups with nested links ──
const NAV_GROUPS: SidebarGroup[] = [
  {
    groupLabel: 'Academic',
    groupIcon: FiBookOpen,
    links: [
      { label: 'Courses', href: '/admin/courses', icon: FiBookOpen, roles: ['admin', 'instructor'], permission: 'courses' },
      { label: 'Categories', href: '/admin/categories', icon: FiBookmark, roles: ['admin', 'staff'], permission: 'categories' },
      { label: 'Lessons Syllabus', href: '/admin/lessons', icon: FiList, roles: ['admin', 'instructor'], permission: 'lessons' },
      { label: 'Grading Submissions', href: '/admin/submissions', icon: FiFileText, roles: ['admin', 'instructor'], permission: 'lessons' },
      { label: 'Live Classes', href: '/admin/live-classes', icon: FiRadio, roles: ['admin', 'instructor'], permission: 'live-classes' },
      { label: 'Batches', href: '/admin/batches', icon: FiUsers, roles: ['admin', 'instructor'], permission: 'batches' },
      { label: 'Attendance', href: '/admin/attendance', icon: FiList, roles: ['admin', 'instructor'], permission: 'attendance' },
    ],
  },
  {
    groupLabel: 'Students',
    groupIcon: FiUsers,
    links: [
      { label: 'Enrollments', href: '/admin/enrollments', icon: FiUsers, roles: ['admin'], permission: 'overview' },
      { label: 'Certificates', href: '/admin/certificates', icon: FiAward, roles: ['admin', 'staff'], permission: 'certificates' },
      { label: 'Reviews', href: '/admin/reviews', icon: FiStar, roles: ['admin', 'staff'], permission: 'reviews' },
    ],
  },
  {
    groupLabel: 'Content',
    groupIcon: FiFileText,
    links: [
      { label: 'Blog Posts', href: '/admin/blogs', icon: FiFileText, roles: ['admin', 'staff'], permission: 'blogs' },
      { label: 'FAQs', href: '/admin/faqs', icon: FiHelpCircle, roles: ['admin', 'staff'], permission: 'faqs' },
      { label: 'Media Library', href: '/admin/media', icon: FiImage, roles: ['admin', 'staff'], permission: 'media' },
    ],
  },
  {
    groupLabel: 'Commerce',
    groupIcon: FiTag,
    links: [
      { label: 'Coupons', href: '/admin/coupons', icon: FiTag, roles: ['admin', 'staff'], permission: 'coupons' },
    ],
  },
  {
    groupLabel: 'People',
    groupIcon: FiUserPlus,
    links: [
      { label: 'Staff Registry', href: '/admin/staff-register', icon: FiUserPlus, roles: ['admin'], permission: 'staff-register' },
    ],
  },
]

// ── Collapsible Group Component ──
function NavGroup({
  group,
  pathname,
  user,
  onLinkClick,
}: {
  group: SidebarGroup
  pathname: string
  user: AdminSessionUser
  onLinkClick?: () => void
}) {
  // Filter links by role/permission
  const visibleLinks = group.links.filter((link) => {
    if (user.role === 'admin') return true
    if (user.permissions && user.permissions.length > 0) {
      if (link.permission === 'overview') return true
      return user.permissions.includes(link.permission)
    }
    return link.roles.includes(user.role)
  })

  if (visibleLinks.length === 0) return null

  const isGroupActive = visibleLinks.some((l) => pathname.startsWith(l.href) && l.href !== '/admin')
  const [open, setOpen] = useState(isGroupActive)
  const GroupIcon = group.groupIcon

  // Auto-open if a child is active
  useEffect(() => {
    if (isGroupActive) setOpen(true)
  }, [pathname, isGroupActive])

  return (
    <div className="space-y-0.5">
      {/* Group Header Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer group ${
          isGroupActive
            ? 'text-[#E61C24] bg-[#E61C24]/8'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
        }`}
      >
        <div className="flex items-center gap-2">
          <GroupIcon
            className={`h-4 w-4 ${isGroupActive ? 'text-[#E61C24]' : 'text-slate-400 group-hover:text-slate-600'}`}
          />
          <span className="uppercase tracking-wider">{group.groupLabel}</span>
        </div>
        <span
          className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
        >
          <FiChevronDown className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Collapsible Children */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="ml-3 pl-3 border-l border-slate-200 space-y-0.5 py-1">
          {visibleLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onLinkClick}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-base font-semibold transition-all duration-150 group/link ${
                  isActive
                    ? 'bg-[#E61C24] text-white shadow-sm shadow-[#E61C24]/20'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover/link:text-slate-600'
                  }`}
                />
                <span className="truncate">{link.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70 shrink-0" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Sidebar Nav Content (shared between desktop & mobile) ──
function SidebarNav({
  user,
  pathname,
  onLinkClick,
}: {
  user: AdminSessionUser
  pathname: string
  onLinkClick?: () => void
}) {
  const isOverviewActive = pathname === '/admin'

  return (
    <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
      {/* Overview — standalone link */}
      <Link
        href="/admin"
        onClick={onLinkClick}
        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-base font-semibold transition-all duration-200 group ${
          isOverviewActive
            ? 'bg-[#E61C24] text-white shadow-md shadow-[#E61C24]/20'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
        }`}
      >
        <FiLayout
          className={`h-4 w-4 ${isOverviewActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
        />
        <span>Overview</span>
      </Link>

      {/* Divider */}
      <div className="pt-2 pb-1">
        <div className="h-px bg-slate-100" />
      </div>

      {/* Collapsible Groups */}
      {NAV_GROUPS.map((group) => (
        <NavGroup
          key={group.groupLabel}
          group={group}
          pathname={pathname}
          user={user}
          onLinkClick={onLinkClick}
        />
      ))}
    </nav>
  )
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
            window.location.href = '/dashboard'
            return
          }

          if (isPublicAdminRoute) {
            window.location.href = '/admin'
            return
          }

          if (!['admin', 'staff', 'instructor'].includes(data.user.role)) {
            window.location.href = '/admin/login'
            return
          }

          setUser(data.user)
        } else {
          if (!isPublicAdminRoute) {
            window.location.href = '/admin/login'
          }
        }
      } catch (err) {
        console.error('Admin layout session check error:', err)
        if (!isPublicAdminRoute) {
          window.location.href = '/admin/login'
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
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
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

  // ── Sidebar Footer (shared) ──
  const SidebarFooter = () => (
    <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full border border-[#E61C24]/35 bg-slate-100 flex items-center justify-center text-base font-bold text-slate-700 overflow-hidden shrink-0">
          {user.profilePic ? (
            <img src={user.profilePic} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            getInitials(user.name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-slate-800 truncate leading-tight">{user.name}</p>
          <p className="text-base font-semibold text-[#E61C24] truncate mt-0.5 capitalize">{user.role}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-red-200 hover:border-red-400 bg-red-50 hover:bg-red-100 text-red-500 font-bold text-base transition-all duration-200 cursor-pointer"
      >
        <FiLogOut className="h-4 w-4" />
        <span>Sign Out</span>
      </button>
    </div>
  )

  return (
    <div className="h-screen bg-slate-50 flex font-sans overflow-hidden text-slate-800">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-200 shrink-0 select-none h-full shadow-sm">

        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 shrink-0">
          <Link href="/" className="flex items-center group">
            <img
              src="/logo.png"
              alt="Canadian Nest School"
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Tree Nav */}
        <SidebarNav user={user} pathname={pathname} />

        {/* Footer */}
        <SidebarFooter />
      </aside>

      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Mobile Sidebar Drawer ── */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-60 bg-white border-r border-slate-200 flex flex-col select-none transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200 justify-between shrink-0">
          <Link href="/" className="flex items-center group">
            <img
              src="/logo.png"
              alt="Canadian Nest School"
              className="h-12 w-auto object-contain"
            />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Tree Nav */}
        <SidebarNav
          user={user}
          pathname={pathname}
          onLinkClick={() => setSidebarOpen(false)}
        />

        {/* Footer */}
        <SidebarFooter />
      </aside>

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">

        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between select-none shrink-0 shadow-sm">

          {/* Mobile hamburger */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 bg-white cursor-pointer"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <Link href="/" className="flex items-center group">
              <img
                src="/logo.png"
                alt="Canadian Nest School"
                className="h-10 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Live Console Badge */}
          <div className="hidden sm:flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-bold text-slate-400 uppercase tracking-widest">
              Live Console
            </span>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-4 ml-auto lg:ml-0">

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-base font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
            >
              <FiHome className="h-4 w-4" />
              <span className="hidden sm:inline">Portal Homepage</span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-base font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all duration-200"
            >
              <FiUser className="h-4 w-4" />
              <span className="hidden sm:inline">Student Portal</span>
            </Link>

            {/* Admin Badge */}
            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="h-9 w-9 rounded-full border border-[#E61C24]/30 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                {user.profilePic ? (
                  <img src={user.profilePic} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <FiUser className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-base font-bold text-slate-800 leading-none">{user.name}</p>
                <p className="text-base font-semibold text-[#E61C24] mt-1 capitalize">{user.role} Account</p>
              </div>
            </div>

          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

      </div>

    </div>
  )
}
