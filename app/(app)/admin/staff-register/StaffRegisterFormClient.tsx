'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiUser, FiMail, FiPhone, FiLock, FiShield, FiUserPlus, FiArrowLeft, FiUploadCloud, FiImage, FiX } from 'react-icons/fi'
import Swal from 'sweetalert2'
import MediaPickerModal from '@/components/MediaPickerModal'
import type { MediaItem } from '@/components/MediaPickerModal'

export default function StaffRegisterFormClient() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [designation, setDesignation] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'instructor' | 'admin'>('staff')
  const [permissions, setPermissions] = useState<string[]>(['reviews', 'categories', 'faqs', 'blogs', 'media'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Profile Picture States
  const [profilePicId, setProfilePicId] = useState('')
  const [profilePicUrl, setProfilePicUrl] = useState('')
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

    if (!name || !email || !password || !role) {
      setError('Please fill in all required fields.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          password,
          role,
          designation: designation || undefined,
          permissions: role === 'admin' ? ['courses', 'lessons', 'reviews', 'categories', 'faqs', 'blogs', 'media'] : permissions,
          profilePic: profilePicId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.')
      }

      router.push('/admin/staff-register?success=registered')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-white border border-slate-200 rounded-lg p-6 md:p-8 shadow-xl space-y-6 select-text">
      
      {/* Header and Back Button - Borderless */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#615fff]/15 flex items-center justify-center">
            <FiUserPlus className="text-[#615fff] h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 leading-none">Add Faculty Member</h2>
            <p className="text-sm font-semibold text-slate-500 mt-1.5">Register a new administrative or teacher account</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.push('/admin/staff-register')}
          className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-slate-100 hover:bg-slate-100 border-none text-slate-600 hover:text-slate-800 rounded-lg text-sm font-bold transition-all cursor-pointer shadow-sm"
        >
          <FiArrowLeft className="h-4.5 w-4.5" />
          <span>Back to Registry</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-base font-sans">
        {error && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-base">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Row 1: Name and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-base font-bold text-slate-600">Full Name *</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-[#615fff]/40 text-slate-800 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Email Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-base font-bold text-slate-600">Email Address *</label>
              <div className="relative">
                <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="email"
                  required
                  placeholder="e.g. jane@tutorspace.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-[#615fff]/40 text-slate-800 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Phone and Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-base font-bold text-slate-600">Phone Number (Optional)</label>
              <div className="relative">
                <FiPhone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="tel"
                  placeholder="e.g. +88017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-[#615fff]/40 text-slate-800 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-base font-bold text-slate-600">Default Password *</label>
              <div className="relative">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-[#615fff]/40 text-slate-800 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Designation / Job Title Role field */}
          <div className="flex flex-col gap-1.5 pt-2">
            <label className="text-base font-bold text-slate-600">Staff Job Designation / Professional Role (Optional)</label>
            <div className="relative">
              <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                placeholder="e.g. Software Engineer, UI/UX Designer, Project Manager"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-slate-100 border-none focus:ring-2 focus:ring-[#615fff]/40 text-slate-800 rounded-lg pl-11 pr-4 py-3.5 text-base font-semibold outline-none transition-all shadow-sm"
              />
            </div>
            <p className="text-xs text-slate-400 font-semibold mt-1">This designation will display on public views (like the Mentors page).</p>
          </div>

          {/* Profile Picture Upload row */}
          <div className="flex flex-col gap-2 pt-2">
            <label className="text-base font-bold text-slate-600">Profile Picture (Optional)</label>
            <div className="flex items-center gap-5 flex-wrap bg-slate-100 p-4 rounded-lg shadow-sm border-none">
              <div className="h-16 w-16 rounded-full bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <FiUser className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <label className={`flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer transition-colors shadow-sm ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <FiUploadCloud className="h-4.5 w-4.5" />
                  <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                </label>
                
                <button
                  type="button"
                  onClick={() => setShowMediaPicker(true)}
                  className="flex items-center gap-1.5 px-4.5 py-2 rounded-lg bg-[#615fff]/15 hover:bg-[#615fff]/25 text-[#9693ff] font-bold text-sm cursor-pointer transition-colors"
                >
                  <FiImage className="h-4.5 w-4.5" />
                  <span>Media Library</span>
                </button>

                {profilePicUrl && (
                  <button
                    type="button"
                    onClick={() => { setProfilePicId(''); setProfilePicUrl('') }}
                    className="p-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <FiX className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Role Privilege Level */}
          <div className="flex flex-col gap-2 pt-2">
            <label className="text-base font-bold text-slate-600">Security Privilege Level *</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Staff Option */}
              <label
                onClick={() => handleRoleChange('staff')}
                className={`flex items-start gap-3 p-4 rounded-lg border-none cursor-pointer transition-all duration-200 select-none ${
                  role === 'staff'
                    ? 'bg-[#615fff]/10 text-slate-800 shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  checked={role === 'staff'}
                  onChange={() => handleRoleChange('staff')}
                  className="hidden"
                />
                <FiShield className={`h-5 w-5 shrink-0 mt-0.5 ${role === 'staff' ? 'text-[#a5b4fc]' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="font-bold text-base leading-none">Console Staff</p>
                  <p className="text-xs font-semibold text-slate-400 mt-2 leading-relaxed">Manage FAQs, Blogs, Categories</p>
                </div>
              </label>

              {/* Instructor Option */}
              <label
                onClick={() => handleRoleChange('instructor')}
                className={`flex items-start gap-3 p-4 rounded-lg border-none cursor-pointer transition-all duration-200 select-none ${
                  role === 'instructor'
                    ? 'bg-[#615fff]/10 text-slate-800 shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  checked={role === 'instructor'}
                  onChange={() => handleRoleChange('instructor')}
                  className="hidden"
                />
                <FiShield className={`h-5 w-5 shrink-0 mt-0.5 ${role === 'instructor' ? 'text-[#a5b4fc]' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="font-bold text-base leading-none">Instructor</p>
                  <p className="text-xs font-semibold text-slate-400 mt-2 leading-relaxed">Manage Syllabus, Create Lessons</p>
                </div>
              </label>

              {/* Admin Option */}
              <label
                onClick={() => handleRoleChange('admin')}
                className={`flex items-start gap-3 p-4 rounded-lg border-none cursor-pointer transition-all duration-200 select-none ${
                  role === 'admin'
                    ? 'bg-[#615fff]/10 text-slate-800 shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  checked={role === 'admin'}
                  onChange={() => handleRoleChange('admin')}
                  className="hidden"
                />
                <FiShield className={`h-5 w-5 shrink-0 mt-0.5 ${role === 'admin' ? 'text-[#a5b4fc]' : 'text-slate-400'}`} />
                <div className="text-left">
                  <p className="font-bold text-base leading-none">Operations</p>
                  <p className="text-xs font-semibold text-slate-400 mt-2 leading-relaxed">Full system access, Add other staff</p>
                </div>
              </label>
            </div>
          </div>

          {/* Row 4: Custom Page Permissions */}
          {role !== 'admin' && (
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-200/60">
              <div>
                <label className="text-base font-bold text-slate-600">Custom Page Permissions</label>
                <p className="text-xs font-semibold text-slate-500 mt-1">Configure exactly which pages this administrative account can read and write</p>
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
                      className={`flex items-center gap-3 p-3.5 rounded-lg border-none cursor-pointer select-none transition-all duration-200 ${
                        isChecked
                          ? 'bg-[#615fff]/10 text-slate-800'
                          : 'bg-slate-100 text-slate-500 hover:text-slate-800'
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
                        className="h-4.5 w-4.5 rounded border-none text-[#615fff] focus:ring-0 cursor-pointer"
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
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base transition-all duration-200 cursor-pointer disabled:opacity-50 border-none shadow-md"
          >
            <FiUserPlus className="h-5 w-5" />
            <span>{loading ? 'Registering Faculty...' : 'Register Faculty Account'}</span>
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
