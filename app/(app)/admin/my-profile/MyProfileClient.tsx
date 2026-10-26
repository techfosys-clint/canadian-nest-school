'use client'

import type { MediaItem } from '@/components/MediaPickerModal'
import MediaPickerModal from '@/components/MediaPickerModal'
import RichTextEditor from '@/components/RichTextEditor'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import {
  FiImage,
  FiLock,
  FiPhone,
  FiUploadCloud,
  FiUser,
} from 'react-icons/fi'
import Swal from 'sweetalert2'

export default function MyProfileClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [designation, setDesignation] = useState('')
  const [bio, setBio] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [profilePicId, setProfilePicId] = useState('')
  const [profilePicUrl, setProfilePicUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/my-profile', { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || !data.user) {
          throw new Error(data.error || 'Failed to load profile.')
        }
        setName(data.user.name || '')
        setEmail(data.user.email || '')
        setPhone(data.user.phone || '')
        setDesignation(data.user.designation || '')
        setBio(data.user.bio || '')
        setRole(data.user.role || '')
        setProfilePicId(data.user.profilePicId || '')
        setProfilePicUrl(data.user.profilePicUrl || '')
      } catch (err: any) {
        setError(err.message || 'Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('alt', name ? `Profile of ${name}` : 'Profile picture')
    try {
      const res = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setProfilePicId(data.media.id)
      setProfilePicUrl(data.media.url)
    } catch (err: any) {
      setError(`Image upload failed: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    if (password && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/my-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone || undefined,
          designation: designation || undefined,
          bio,
          profilePic: profilePicId || undefined,
          password: password || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Save failed.')
      }
      setPassword('')
      await Swal.fire({
        icon: 'success',
        title: 'Profile saved',
        timer: 1400,
        showConfirmButton: false,
      })
    } catch (err: any) {
      setError(err.message || 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='container mx-auto px-6 py-12 text-base text-slate-500'>
        Loading profile…
      </div>
    )
  }

  return (
    <div className='container mx-auto px-6 py-8 space-y-8 max-w-3xl'>
      <div className='border-b border-slate-200/80 pb-6 space-y-1'>
        <h1 className='text-3xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2'>
          <FiUser className='text-[#E61C24]' />
          My profile
        </h1>
        <p className='text-base font-semibold text-slate-500'>
          Update your public instructor details. Bio appears on course pages
          next to your name when filled in.
          {role ? ` Signed in as ${role}.` : ''}
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className='bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm space-y-5'
      >
        {error && (
          <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-base font-semibold text-rose-700'>
            {error}
          </div>
        )}

        <div className='flex flex-col gap-2'>
          <label className='text-base font-bold text-slate-600'>Name</label>
          <input
            type='text'
            value={name}
            onChange={(e) => setName(e.target.value)}
            className='w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none'
            required
          />
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-base font-bold text-slate-600'>Email</label>
          <input
            type='email'
            value={email}
            disabled
            className='w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 font-semibold text-base opacity-80'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-base font-bold text-slate-600'>Phone</label>
          <div className='relative'>
            <FiPhone className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5' />
            <input
              type='text'
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className='w-full pl-11 pr-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none'
            />
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-base font-bold text-slate-600'>
            Designation (optional)
          </label>
          <input
            type='text'
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            placeholder='e.g. Lead Instructor'
            className='w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none'
          />
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-base font-bold text-slate-600'>
            Public bio (optional)
          </label>
          <RichTextEditor
            label=''
            value={bio}
            onChange={setBio}
            placeholder='Introduce yourself for students on course pages…'
          />
        </div>

        <div className='flex flex-col gap-3'>
          <label className='text-base font-bold text-slate-600'>
            Profile picture
          </label>
          <div className='flex items-center gap-4 flex-wrap'>
            <div className='h-16 w-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden'>
              {profilePicUrl ? (
                <Image
                  src={profilePicUrl}
                  alt='Profile'
                  width={64}
                  height={64}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='h-full w-full flex items-center justify-center text-slate-400'>
                  <FiUser className='h-6 w-6' />
                </div>
              )}
            </div>
            <label className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold text-base cursor-pointer hover:bg-slate-200'>
              <FiUploadCloud className='h-5 w-5' />
              {uploading ? 'Uploading…' : 'Upload'}
              <input
                type='file'
                accept='image/*'
                className='hidden'
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
            <button
              type='button'
              onClick={() => setShowMediaPicker(true)}
              className='inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 text-[#E61C24] font-bold text-base'
            >
              <FiImage className='h-5 w-5' />
              Library
            </button>
          </div>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-base font-bold text-slate-600'>
            New password (optional)
          </label>
          <div className='relative'>
            <FiLock className='absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5' />
            <input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='Leave blank to keep current password'
              className='w-full pl-11 pr-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none'
            />
          </div>
        </div>

        <div className='flex justify-end pt-2'>
          <button
            type='submit'
            disabled={saving}
            className='px-6 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base disabled:opacity-50'
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        onSelect={(item: MediaItem) => {
          setProfilePicId(item.id)
          setProfilePicUrl(item.url)
          setShowMediaPicker(false)
        }}
        title='Pick profile picture'
      />
    </div>
  )
}
