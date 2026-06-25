'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FiUser, FiMail, FiPhone, FiCamera, FiSave, FiLock } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  profilePic?: string | null
  role: string
}

export default function StudentProfile() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [imageFile, setImageFile] = useState<{ base64: string; name: string; mimeType: string } | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/auth/me')
        const data = await res.json()

        if (!res.ok || !data.authenticated || (data.user.role !== 'student' && data.user.role !== 'admin')) {
          router.push('/login')
          return
        }

        setUser(data.user)
        setName(data.user.name || '')
        setPhone(data.user.phone || '')
        setImagePreview(data.user.profilePic || null)
      } catch (err) {
        console.error('Error loading profile:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Profile image size must be under 2MB.',
        confirmButtonColor: '#E61C24',
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setImagePreview(base64String)
      setImageFile({
        base64: base64String,
        name: file.name,
        mimeType: file.type,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please enter your full name.',
        confirmButtonColor: '#E61C24',
      })
      return
    }

    // Password fields validation
    if (currentPassword || newPassword || confirmNewPassword) {
      if (!currentPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please enter your current password to set a new password.',
          confirmButtonColor: '#E61C24',
        })
        return
      }
      if (newPassword.length < 6) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'New password must be at least 6 characters long.',
          confirmButtonColor: '#E61C24',
        })
        return
      }
      if (newPassword !== confirmNewPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'New password and confirmation do not match.',
          confirmButtonColor: '#E61C24',
        })
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          profilePic: imageFile,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Your profile has been updated successfully.',
          timer: 1500,
          showConfirmButton: false,
        })
        
        // Clear password fields
        setCurrentPassword('')
        setNewPassword('')
        setConfirmNewPassword('')

        // Reload page to propagate changes to both layouts
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        throw new Error(data.error || 'Failed to update profile.')
      }
    } catch (err: any) {
      console.error('Update profile failed:', err)
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message || 'An error occurred while saving changes.',
        confirmButtonColor: '#E61C24',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50/50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
          <p className="text-base font-bold text-zinc-600">Loading profile data...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="container mx-auto px-6 py-8 pb-16">
      
      {/* Page Title & Heading */}
      <div className="mb-8 select-none">
        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-[#E61C24]/15 border border-[#E61C24]/30 text-base font-bold text-[#E61C24] uppercase tracking-wider mb-3">
          Account Settings
        </span>
        <h1 className="text-3xl font-bold font-display text-zinc-900 leading-tight">
          My Profile
        </h1>
        <p className="text-base font-semibold text-zinc-400 mt-1">
          Manage your personal details, credentials, and profile image.
        </p>
      </div>

      {/* Main Profile Design Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Card: Avatar & Image Preview Control */}
        <div className="bg-white rounded-lg border border-zinc-200/80 p-6 text-center flex flex-col items-center justify-center self-start select-none">
          
          <div className="relative group mb-6 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            
            {/* Profile Avatar circle with hover effect */}
            <div className="h-32 w-32 rounded-full border-2 border-[#E61C24]/20 bg-zinc-100 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:border-[#E61C24]">
              {imagePreview ? (
                <img src={imagePreview} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-[#E61C24]">
                  {getInitials(name)}
                </span>
              )}
            </div>

            {/* Glowing camera hover badge overlay */}
            <div className="absolute bottom-1 right-1 h-9 w-9 bg-[#E61C24] hover:bg-[#E61C24]/90 text-white rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <FiCamera className="h-4.5 w-4.5" />
            </div>

          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          <h3 className="text-lg font-bold text-zinc-800">{name || 'Student Account'}</h3>
          <p className="text-base font-semibold text-[#E61C24] mt-1 uppercase tracking-wider">
            {['admin', 'staff', 'instructor'].includes(user.role) ? 'student' : user.role}
          </p>
          <p className="text-sm font-semibold text-zinc-400 mt-4 leading-relaxed max-w-xs">
            Upload a high-quality JPG or PNG picture. Images are cropped into exact sizes automatically.
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-6 px-5 py-2.5 rounded-lg border border-zinc-200 hover:border-zinc-350 hover:bg-zinc-50 text-zinc-600 font-bold text-base transition-all duration-300 w-full flex items-center justify-center gap-2 cursor-pointer"
          >
            <FiCamera className="h-4.5 w-4.5" />
            <span>Upload Image</span>
          </button>

        </div>

        {/* Right Card: Main Profile Edit Form */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-zinc-200/80 p-6 md:p-8">
          
          <h2 className="text-xl font-bold text-zinc-800 mb-6 pb-3 border-b border-zinc-100 flex items-center gap-2.5 select-none">
            <FiUser className="text-[#E61C24] h-5 w-5" />
            <span>Personal Information</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Full Name input */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-base font-bold text-zinc-700 block">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center rounded-lg bg-zinc-50 border border-zinc-200 focus-within:border-[#E61C24]/60 transition-colors">
                <FiUser className="absolute left-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-transparent border-none outline-none w-full pl-11 pr-4 py-3.5 text-base font-semibold text-zinc-800 placeholder-zinc-400"
                />
              </div>
            </div>

            {/* Email Input (Disabled/Read-only for safety) */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-base font-bold text-zinc-700 block">
                Email Address
              </label>
              <div className="relative flex items-center rounded-lg bg-zinc-100 border border-zinc-200/80 select-none">
                <FiMail className="absolute left-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  id="email"
                  type="email"
                  disabled
                  value={user.email}
                  className="bg-transparent border-none outline-none w-full pl-11 pr-4 py-3.5 text-base font-semibold text-zinc-500 cursor-not-allowed"
                />
                <FiLock className="absolute right-3.5 h-4 w-4 text-zinc-400" />
              </div>
              <p className="text-sm font-semibold text-zinc-400 mt-1 select-none">
                Your login email address is verified and locked. Contact support to change it.
              </p>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <label htmlFor="phone" className="text-base font-bold text-zinc-700 block">
                Phone Number
              </label>
              <div className="relative flex items-center rounded-lg bg-zinc-50 border border-zinc-200 focus-within:border-[#E61C24]/60 transition-colors">
                <FiPhone className="absolute left-3.5 h-4.5 w-4.5 text-zinc-400" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number (e.g. +880123456789)"
                  className="bg-transparent border-none outline-none w-full pl-11 pr-4 py-3.5 text-base font-semibold text-zinc-800 placeholder-zinc-400"
                />
              </div>
            </div>

            {/* Change Password Section */}
            <h2 className="text-xl font-bold text-zinc-800 pt-6 mt-6 border-t border-zinc-100 pb-3 flex items-center gap-2.5 select-none">
              <FiLock className="text-[#E61C24] h-5 w-5" />
              <span>Change Password</span>
            </h2>
            <p className="text-sm font-semibold text-zinc-400 -mt-2 mb-4 select-none">
              {"Leave these fields blank if you do not want to update your password."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Password */}
              <div className="space-y-2 md:col-span-2">
                <label htmlFor="currentPassword" className="text-base font-bold text-zinc-700 block">
                  Current Password
                </label>
                <div className="relative flex items-center rounded-lg bg-zinc-50 border border-zinc-200 focus-within:border-[#E61C24]/60 transition-colors">
                  <FiLock className="absolute left-3.5 h-4.5 w-4.5 text-zinc-400" />
                  <input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-transparent border-none outline-none w-full pl-11 pr-4 py-3.5 text-base font-semibold text-zinc-800 placeholder-zinc-400"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-base font-bold text-zinc-700 block">
                  New Password
                </label>
                <div className="relative flex items-center rounded-lg bg-zinc-50 border border-zinc-200 focus-within:border-[#E61C24]/60 transition-colors">
                  <FiLock className="absolute left-3.5 h-4.5 w-4.5 text-zinc-400" />
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    className="bg-transparent border-none outline-none w-full pl-11 pr-4 py-3.5 text-base font-semibold text-zinc-800 placeholder-zinc-400"
                  />
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-2">
                <label htmlFor="confirmNewPassword" className="text-base font-bold text-zinc-700 block">
                  Confirm New Password
                </label>
                <div className="relative flex items-center rounded-lg bg-zinc-50 border border-zinc-200 focus-within:border-[#E61C24]/60 transition-colors">
                  <FiLock className="absolute left-3.5 h-4.5 w-4.5 text-zinc-400" />
                  <input
                    id="confirmNewPassword"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="bg-transparent border-none outline-none w-full pl-11 pr-4 py-3.5 text-base font-semibold text-zinc-800 placeholder-zinc-400"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-4 border-t border-zinc-100 flex items-center justify-end select-none">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3.5 bg-[#E61C24] hover:bg-[#E61C24]/95 disabled:bg-[#E61C24]/50 text-white font-bold text-base rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <FiSave className="h-5 w-5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

      </div>

    </div>
  )
}
