'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiUser, FiMail, FiPhone, FiLock, FiShield, FiUserPlus, FiArrowLeft, FiUploadCloud, FiImage, FiX } from 'react-icons/fi'
import Swal from 'sweetalert2'
import MediaPickerModal from '@/components/MediaPickerModal'
import type { MediaItem } from '@/components/MediaPickerModal'

interface StaffEditFormClientProps {
  initialStaff: {
    id: string
    name: string
    email: string
    phone?: string
    role: 'admin' | 'staff' | 'instructor'
    designation?: string
    permissions?: string[]
    profilePicId?: string
    profilePicUrl?: string
  }
}

export default function StaffEditFormClient({ initialStaff }: StaffEditFormClientProps) {
  const router = useRouter()
  const [name, setName] = useState(initialStaff.name)
  const [email, setEmail] = useState(initialStaff.email)
  const [phone, setPhone] = useState(initialStaff.phone || '')
  const [designation, setDesignation] = useState(initialStaff.designation || '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'instructor' | 'admin'>(initialStaff.role)
  const [permissions, setPermissions] = useState<string[]>(initialStaff.permissions || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile Picture States
  const [profilePicId, setProfilePicId] = useState(initialStaff.profilePicId || '')
  const [profilePicUrl, setProfilePicUrl] = useState(initialStaff.profilePicUrl || '')
  const [uploading, setUploading] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  const handleRoleChange = (newRole: 'staff' | 'instructor' | 'admin') => {
    setRole(newRole)
    if (newRole === 'staff') {
      setPermissions(['reviews', 'categories', 'faqs', 'blogs', 'media'])
    } else if (newRole === 'instructor') {
      setPermissions(['courses', 'lessons'])
    } else if (newRole === 'admin') {
      setPermissions(['courses', 'lessons', 'reviews', 'categories', 'faqs', 'blogs', 'media'])
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const form = new FormData()
    form.append('file', file)
    form.append('alt', name ? `Profile of ${name}` : 'Staff Profile Pic')

    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfilePicId(data.media.id)
      setProfilePicUrl(data.media.url)
    } catch (err: any) {
      setError(`Image Upload Failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  function handleMediaPickerSelect(item: MediaItem) {
    setProfilePicId(item.id)
    setProfilePicUrl(item.url)
    setShowMediaPicker(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name || !email || !role) {
      setError('Please fill in all required fields.')
      return
    }

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch(`/api/admin/staff/${initialStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          password: password || undefined,
          role,
          designation: designation || undefined,
          permissions: role === 'admin' ? ['courses', 'lessons', 'reviews', 'categories', 'faqs', 'blogs', 'media'] : permissions,
          profilePic: profilePicId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Update failed.')
      }

      router.push('/admin/staff-register?success=updated')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-white border border-slate-200/80 rounded-lg p-6 md:p-8 shadow-sm space-y-8 select-text">
      
      {/* Header and Back Button */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-rose-50 flex items-center justify-center border border-rose-100">
            <FiShield className="text-[#E61C24] h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-none">Edit Faculty Member</h2>
            <p className="text-sm font-medium text-slate-500 mt-2">Modify information for administrative or teacher account</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/staff-register')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-sm"
        >
          <FiArrowLeft className="h-4.5 w-4.5" />
          <span>Back to Registry</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 text-base font-sans">
        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 font-semibold text-sm flex items-center gap-2">
            <FiX className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Row 1: Name and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Full Name *</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-medium outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Email Address *</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="email"
                  required
                  placeholder="e.g. jane@tutorspace.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-medium outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Phone and Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Phone Number */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Phone Number <span className="text-slate-400 font-normal">(Optional)</span></label>
              <div className="relative">
                <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="tel"
                  placeholder="e.g. +88017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-medium outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-700">Change Password <span className="text-slate-400 font-normal">(Optional)</span></label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-medium outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Designation / Job Title Role field */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-700">Staff Job Designation / Professional Role <span className="text-slate-400 font-normal">(Optional)</span></label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                placeholder="e.g. Software Engineer, UI/UX Designer, Project Manager"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-slate-800 rounded-lg pl-11 pr-4 py-3 text-base font-medium outline-none transition-all shadow-sm"
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">This designation will display on public views (like the Mentors page).</p>
          </div>

          {/* Profile Picture Upload row */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-slate-700">Profile Picture</label>
            <div className="flex items-center gap-5 flex-wrap bg-slate-50 border border-slate-200 p-5 rounded-lg shadow-sm">
              <div className="h-16 w-16 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <FiUser className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm cursor-pointer transition-colors shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <FiUploadCloud className="h-4.5 w-4.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 font-semibold text-sm cursor-pointer transition-colors shadow-sm"
                >
                  <FiImage className="h-4.5 w-4.5" />
                  <span>Media Library</span>
                </button>

                {profilePicUrl && (
                  <button
                    type="button"
                    onClick={() => { setProfilePicId(''); setProfilePicUrl('') }}
                    className="p-2 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer shadow-sm ml-2"
                  >
                    <FiX className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Security Privilege Level */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
            <div>
              <label className="text-sm font-bold text-slate-700">Security Privilege Level *</label>
              <p className="text-xs text-slate-500 font-medium mt-1">Select the primary access level for this account.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Staff Option */}
              <label
                onClick={() => handleRoleChange('staff')}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 select-none ${
                  role === 'staff'
                    ? 'bg-rose-50 border-rose-200 text-slate-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <input type="radio" name="role" checked={role === 'staff'} onChange={() => handleRoleChange('staff')} className="hidden" />
                <FiShield className={`h-5 w-5 shrink-0 mt-0.5 ${role === 'staff' ? 'text-rose-500' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className={`font-bold text-base leading-none ${role === 'staff' ? 'text-slate-800' : 'text-slate-700'}`}>Console Staff</p>
                  <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">Manage FAQs, Blogs, Categories</p>
                </div>
              </label>

              {/* Instructor Option */}
              <label
                onClick={() => handleRoleChange('instructor')}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 select-none ${
                  role === 'instructor'
                    ? 'bg-rose-50 border-rose-200 text-slate-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <input type="radio" name="role" checked={role === 'instructor'} onChange={() => handleRoleChange('instructor')} className="hidden" />
                <FiShield className={`h-5 w-5 shrink-0 mt-0.5 ${role === 'instructor' ? 'text-rose-500' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className={`font-bold text-base leading-none ${role === 'instructor' ? 'text-slate-800' : 'text-slate-700'}`}>Instructor</p>
                  <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">Manage Syllabus, Create Lessons</p>
                </div>
              </label>

              {/* Admin Option */}
              <label
                onClick={() => handleRoleChange('admin')}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200 select-none ${
                  role === 'admin'
                    ? 'bg-rose-50 border-rose-200 text-slate-800 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <input type="radio" name="role" checked={role === 'admin'} onChange={() => handleRoleChange('admin')} className="hidden" />
                <FiShield className={`h-5 w-5 shrink-0 mt-0.5 ${role === 'admin' ? 'text-rose-500' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className={`font-bold text-base leading-none ${role === 'admin' ? 'text-slate-800' : 'text-slate-700'}`}>Operations</p>
                  <p className="text-xs font-medium text-slate-500 mt-2 leading-relaxed">Full system access, Add other staff</p>
                </div>
              </label>
            </div>
          </div>

          {/* Custom Page Permissions */}
          {role !== 'admin' && (
            <div className="flex flex-col gap-4 pt-6 border-t border-slate-100">
              <div>
                <label className="text-sm font-bold text-slate-700">Custom Page Permissions</label>
                <p className="text-xs font-medium text-slate-500 mt-1">Configure exactly which pages this administrative account can read and write</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: 'courses', label: 'Courses Management' },
                  { key: 'lessons', label: 'Lessons Syllabus' },
                  { key: 'reviews', label: 'Reviews Moderate' },
                  { key: 'categories', label: 'Categories' },
                  { key: 'faqs', label: 'FAQs Landing' },
                  { key: 'blogs', label: 'Blog Posts' },
                  { key: 'media', label: 'Media Library' },
                ].map((perm) => {
                  const isChecked = permissions.includes(perm.key)
                  return (
                    <label
                      key={perm.key}
                      className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer select-none transition-all duration-200 shadow-sm ${
                        isChecked
                          ? 'bg-rose-50 border-rose-200 text-slate-800'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setPermissions(permissions.filter((p) => p !== perm.key))
                          } else {
                            setPermissions([...permissions, perm.key])
                          }
                        }}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />
                      <span className="text-sm font-bold">{perm.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-slate-100">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-all duration-200 cursor-pointer disabled:opacity-50 border-none shadow-md"
          >
            <FiUserPlus className="h-5 w-5" />
            <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>

      {/* Media Library Picker Modal */}
      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={handleMediaPickerSelect}
        title="Select Profile Picture"
      />

    </div>
  )
}
