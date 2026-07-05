'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUser, FiLogOut, FiLayout, FiMenu, FiX, FiChevronDown, FiShoppingCart } from 'react-icons/fi'
import { useCart } from '@/context/CartContext'

interface User {
  id: string
  name: string
  email: string
  role: string
  profilePic?: string
}

const NAV_LINKS = [
  { label: 'Home',        href: '/',            match: '/' },
  { label: 'Courses',     href: '/courses',     match: '/courses' },
  { label: 'Shop',        href: '/shop',        match: '/shop' },
  { label: 'Instructors', href: '/instructors', match: '/instructors' },
  { label: 'About Us',    href: '/about',       match: '/about' },
  { label: 'Contact Us',  href: '/contact',     match: '/contact' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { itemCount } = useCart()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Active link check
  const isActive = (match: string): boolean => {
    if (match === '/') return pathname === '/'
    return pathname === match || pathname.startsWith(match + '/')
  }

  // Track scroll position for transparent to sticky background transition
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true)
      } else {
        setIsScrolled(false)
      }
    }
    handleScroll()
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fetch authentication status on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()
        if (data.success && data.authenticated) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (err) {
        console.error('Failed to check auth status', err)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setUserMenuOpen(false)
      window.location.reload()
    } catch (err) {
      console.error('Failed to logout', err)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <>
      <motion.header
        initial={{ y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md shadow-zinc-200/30 py-0'
            : 'bg-transparent py-1'
        }`}
      >
        <div className="container mx-auto px-6 h-22 flex items-center justify-between">

          {/* Left Side: Logo */}
          <Link href="/" className="flex items-center group">
            <img
              src="/logo.png"
              alt="Canadian Nest School"
              className="h-15 w-auto object-contain transition-transform group-hover:scale-102 duration-300"
            />
          </Link>


          {/* Middle: Navigation Menu (Desktop) */}
          <nav className="hidden lg:flex items-center gap-8 text-base font-semibold">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.match)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative pb-1.5 pt-1 transition-colors duration-200 group ${
                    active
                      ? 'text-[#E61C24]'
                      : isScrolled
                        ? 'text-zinc-500 hover:text-zinc-900'
                        : 'text-[#0A163A]/80 hover:text-[#0A163A]'
                  }`}
                >
                  <span>{link.label}</span>
                  <span
                    className={`absolute bottom-0 left-0 h-[2px] bg-[#E61C24] transition-all duration-300 origin-left ${
                      active ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              )
            })}
          </nav>

          {/* Right Side: Cart, User Icon & Mobile Toggle */}
          <div className="flex items-center gap-4">

            <Link
              href="/shop/cart"
              className={`relative p-2 transition-colors duration-200 group cursor-pointer flex items-center justify-center ${
                isScrolled ? 'text-zinc-500 hover:text-zinc-900' : 'text-[#0A163A]/70 hover:text-[#0A163A]'
              }`}
              aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ''}`}
            >
              <FiShoppingCart className="h-5 w-5 group-hover:scale-105 transition-transform" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-[#E61C24] text-white text-[11px] font-bold leading-none">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            
            {/* Dashboard Button next to Profile Pic (Visible when logged in) */}
            {!loading && user && (
              <Link
                href={user.role === 'student' ? '/dashboard' : '/admin'}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24] text-[#E61C24] hover:text-white font-bold text-base transition-all duration-300 cursor-pointer gap-2 shadow-sm shadow-[#E61C24]/5"
              >
                <FiLayout className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}

            {/* User Profile / Login Menu (User icon acts as Login trigger) */}
            <div className="relative" ref={dropdownRef}>
              {loading ? (
                <div className="h-8 w-8 rounded-full bg-zinc-100 animate-pulse" />
              ) : user ? (
                // Authenticated User Avatar Trigger
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 focus:outline-none group cursor-pointer"
                >
                  <div className="h-8 w-8 rounded-full bg-zinc-50 flex items-center justify-center text-xs font-bold text-[#E61C24] shadow-md shadow-[#E61C24]/10 transition-all overflow-hidden">
                    {user.profilePic ? (
                      <img 
                        src={typeof user.profilePic === 'object' && (user.profilePic as any).url ? (user.profilePic as any).url : user.profilePic} 
                        alt={user.name} 
                        className="h-full w-full object-cover" 
                      />
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>
                  <FiChevronDown className={`h-4 w-4 text-zinc-400 group-hover:text-zinc-900 transition-transform duration-300 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                // Anonymous User Trigger (Takes them directly to /login page)
                <Link
                  href="/login"
                  className={`p-2 transition-colors duration-200 group cursor-pointer flex items-center justify-center ${
                    isScrolled ? 'text-zinc-500 hover:text-zinc-900' : 'text-[#0A163A]/70 hover:text-[#0A163A]'
                  }`}
                >
                  <FiUser className="h-5 w-5 group-hover:scale-105 transition-transform" />
                </Link>
              )}

              {/* Framer Motion Profile Dropdown Menu - Borderless Premium design */}
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 15, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-3 w-64 rounded-lg bg-white p-3 shadow-2xl shadow-zinc-300/60 z-50 text-zinc-800"
                  >
                    {user ? (
                      // Logged In Options
                      <>
                        <div className="px-3 py-2.5 bg-zinc-50/70 rounded-lg mb-2">
                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Signed in as</p>
                          <p className="text-base font-bold text-zinc-800 truncate">{user.name}</p>
                          <p className="text-base text-zinc-550 font-semibold truncate">{user.email}</p>
                          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-lg bg-[#E61C24]/10 text-xs font-bold text-[#E61C24] uppercase">
                            {['admin', 'staff', 'instructor'].includes(user.role) ? 'student' : user.role}
                          </span>
                        </div>

                        {user.role === 'admin' ? (
                          <>
                            <Link
                              href="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-semibold text-zinc-650 hover:text-[#121212] hover:bg-zinc-50 transition-all duration-200"
                            >
                              <FiLayout className="h-4.5 w-4.5 text-[#E61C24]" />
                              Admin Console
                            </Link>
                            <Link
                              href="/dashboard"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-semibold text-zinc-650 hover:text-[#121212] hover:bg-zinc-50 transition-all duration-200"
                            >
                              <FiUser className="h-4.5 w-4.5 text-[#E61C24]" />
                              Student Portal
                            </Link>
                          </>
                        ) : (
                          <Link
                            href={user.role === 'student' ? '/dashboard' : '/admin'}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-semibold text-zinc-650 hover:text-[#121212] hover:bg-zinc-50 transition-all duration-200"
                          >
                            <FiLayout className="h-4.5 w-4.5 text-[#E61C24]" />
                            Dashboard
                          </Link>
                        )}

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-base font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 text-left cursor-pointer"
                        >
                          <FiLogOut className="h-4.5 w-4.5" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      // Logged Out Options
                      <>
                        <div className="px-3 py-2.5 bg-zinc-50/70 rounded-lg mb-3">
                          <p className="text-base font-bold text-[#0A163A]">Welcome</p>
                          <p className="text-base text-zinc-550 font-semibold mt-0.5">Join Canadian Nest to access premium courses.</p>
                        </div>

                        <Link
                          href="/login"
                          onClick={() => setUserMenuOpen(false)}
                          className="block w-full text-center px-3 py-2.5 rounded-lg text-base font-bold bg-[#E61C24] hover:bg-[#E61C24]/90 text-white shadow-md shadow-[#E61C24]/15 transition-all mb-2"
                        >
                          Sign In
                        </Link>

                        <Link
                          href="/register"
                          onClick={() => setUserMenuOpen(false)}
                          className="block w-full text-center px-3 py-2.5 rounded-lg text-base font-bold bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-all"
                        >
                          Create Account
                        </Link>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Register Button (Visible when logged out) - Max 8px border radius */}
            {!loading && !user && (
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center justify-center px-10 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#E61C24]/95 text-white font-bold text-base shadow-md shadow-[#E61C24]/15 hover:shadow-[#E61C24]/25 transition-all duration-300 cursor-pointer"
              >
                Register
              </Link>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 lg:hidden transition-colors ${
                isScrolled ? 'text-zinc-500 hover:text-zinc-900' : 'text-[#0A163A]/70 hover:text-[#0A163A]'
              }`}
            >
              {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>

          </div>
        </div>
      </motion.header>

      {/* Framer Motion Mobile Drawer Menu - Slides in from the right */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-[100] lg:hidden"
            />

            {/* Sidebar Content Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 right-0 w-[300px] bg-white shadow-2xl z-[100] flex flex-col lg:hidden border-l border-zinc-200"
            >
              {/* Header inside the sidebar */}
              <div className="flex items-center justify-between p-6 border-b border-zinc-100">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center group">
                  <img
                    src="/logo.png"
                    alt="Canadian Nest School"
                    className="h-13 w-auto object-contain"
                  />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 -mr-2 rounded-lg text-zinc-500 hover:text-[#0A163A] hover:bg-zinc-100 transition-colors"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex flex-col gap-2 p-6 flex-grow overflow-y-auto">
                <Link
                  href="/shop/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`py-3 px-4 transition-all rounded-lg text-base font-semibold flex items-center justify-between ${
                    isActive('/shop/cart')
                      ? 'text-[#E61C24] bg-[#E61C24]/8 font-bold'
                      : 'text-zinc-650 hover:text-[#0A163A] hover:bg-[#E61C24]/5'
                  }`}
                >
                  <span>Cart</span>
                  {itemCount > 0 && (
                    <span className="min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-lg bg-[#E61C24] text-white text-sm font-bold">
                      {itemCount > 99 ? '99+' : itemCount}
                    </span>
                  )}
                </Link>
                {NAV_LINKS.map((link) => {
                  const active = isActive(link.match)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`py-3 px-4 transition-all rounded-lg text-base font-semibold ${
                        active
                          ? 'text-[#E61C24] bg-[#E61C24]/8 font-bold'
                          : 'text-zinc-650 hover:text-[#0A163A] hover:bg-[#E61C24]/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </nav>

              {/* Action Buttons inside Sidebar */}
              <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 flex flex-col gap-3">
                {!loading && !user && (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-3 rounded-lg text-base font-bold text-[#E61C24] bg-[#E61C24]/8 hover:bg-[#E61C24]/15 transition-all"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full text-center py-3 rounded-lg text-base font-bold bg-[#E61C24] hover:bg-[#c3131a] text-white shadow-md shadow-[#E61C24]/15 transition-all"
                    >
                      Register
                    </Link>
                  </>
                )}
                {!loading && user && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-zinc-200/60 shadow-xs">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-50 flex items-center justify-center text-xs font-bold text-[#E61C24] shadow-sm overflow-hidden">
                        {user.profilePic ? (
                          <img
                            src={typeof user.profilePic === 'object' && (user.profilePic as any).url ? (user.profilePic as any).url : user.profilePic}
                            alt={user.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="text-base font-bold text-zinc-800 truncate leading-snug">{user.name}</p>
                        <p className="text-xs text-zinc-500 truncate leading-normal">{user.email}</p>
                      </div>
                    </div>

                    <Link
                      href={user.role === 'student' ? '/dashboard' : '/admin'}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-base font-bold text-[#E61C24] bg-[#E61C24]/8 hover:bg-[#E61C24]/15 transition-all"
                    >
                      <FiLayout className="h-4.5 w-4.5" />
                      <span>Go to Dashboard</span>
                    </Link>

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-base font-bold text-rose-500 bg-rose-50 hover:bg-rose-100 hover:text-rose-600 transition-all cursor-pointer text-left"
                    >
                      <FiLogOut className="h-4.5 w-4.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
