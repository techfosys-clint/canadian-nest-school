'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FiUserPlus,
  FiSearch,
  FiMail,
  FiPhone,
  FiTrash2,
  FiUser,
  FiCalendar,
  FiFilter,
  FiEdit2
} from 'react-icons/fi'
import Swal from 'sweetalert2'

interface StaffMember {
  id: string
  name: string
  email: string
  phone?: string
  role: 'admin' | 'staff' | 'instructor'
  designation?: string
  createdAt: string
  permissions?: string[]
  profilePic?: {
    id?: string
    url: string
  }
}

interface StaffListPageClientProps {
  initialStaff: StaffMember[]
}

export default function StaffListPageClient({ initialStaff }: StaffListPageClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff' | 'instructor'>('all')

  // Pop-up free inline alert and confirm states
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Listen to success query parameter
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const successType = params.get('success')
    if (successType === 'registered') {
      setSuccessMsg('Faculty member account has been registered successfully!')
    } else if (successType === 'updated') {
      setSuccessMsg('Faculty member profile details updated successfully!')
    } else if (successType === 'deleted') {
      setSuccessMsg('Faculty member account has been deleted.')
    }

    if (successType) {
      // Clear URL params without full page reload
      window.history.replaceState({}, document.title, window.location.pathname)
      const timer = setTimeout(() => setSuccessMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  const executeDeleteStaff = async (id: string, name: string) => {
    setConfirmDeleteId(null)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete staff member.')
      }

      setSuccessMsg(`${name}'s account has been successfully deleted.`)
      setTimeout(() => setSuccessMsg(null), 4000)
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not delete staff member.')
      setTimeout(() => setErrorMsg(null), 5000)
    }
  }

  // Filter Logic
  const filteredStaff = initialStaff.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(search.toLowerCase()) ||
      member.email.toLowerCase().includes(search.toLowerCase()) ||
      (member.phone && member.phone.includes(search))
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="space-y-6 select-text">
      
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 rounded-lg font-bold text-base animate-fadeIn">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-450 rounded-lg font-bold text-base animate-fadeIn">
          {errorMsg}
        </div>
      )}
      
      {/* Search and Filters Bar - Borderless */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-none rounded-lg p-4 shadow-md">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#242427] border-none focus:ring-2 focus:ring-[#615fff]/40 text-slate-800 rounded-lg pl-11 pr-4 py-2.5 text-base font-semibold outline-none transition-all shadow-inner"
          />
        </div>

        {/* Filters and CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-[#242427] p-1.5 rounded-lg shadow-inner">
            <FiFilter className="text-slate-400 h-4.5 w-4.5 ml-2" />
            <div className="flex gap-1">
              {(['all', 'admin', 'instructor', 'staff'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3.5 py-1.5 rounded text-sm font-bold capitalize select-none cursor-pointer transition-all border-none ${
                    roleFilter === r
                      ? 'bg-[#615fff] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {r === 'all' ? 'All Roles' : r}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.push('/admin/staff-register/new')}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 bg-[#615fff] hover:bg-[#5248e8] text-white font-bold text-base rounded-lg transition-all cursor-pointer select-none border-none shadow-lg shadow-[#615fff]/15"
          >
            <FiUserPlus className="h-5 w-5" />
            <span>Register Faculty</span>
          </button>
        </div>
      </div>

      {/* Faculty and Staff Table - Borderless */}
      <div className="bg-white border-none rounded-lg overflow-hidden shadow-lg">
        {filteredStaff.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <FiUser className="h-12 w-12 text-slate-400 mx-auto" />
            <p className="text-base font-semibold text-slate-500">No faculty or staff members match the query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base font-sans border-collapse">
              <thead>
                <tr className="border-b border-slate-200/40 text-slate-500 font-bold bg-slate-50/50 text-sm tracking-wider uppercase">
                  <th className="px-6 py-4">Faculty Member</th>
                  <th className="px-6 py-4">Privilege Role</th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4">Date Registered</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/20 font-semibold text-slate-600">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-[#242427]/30 transition-colors">
                    
                    {/* Member Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {member.profilePic?.url ? (
                          <img src={member.profilePic.url} alt={member.name} className="h-10 w-10 rounded-full object-cover shrink-0 shadow-sm" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-[#615fff]/15 flex items-center justify-center font-bold text-base text-[#615fff] uppercase shrink-0 select-none shadow-sm">
                            {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="text-slate-800 font-bold text-base leading-tight">{member.name}</p>
                          {member.designation && (
                            <p className="text-[#a5b4fc] text-xs font-bold mt-1 tracking-wide">{member.designation}</p>
                          )}
                          <p className="text-slate-400 text-[10px] font-semibold mt-1">ID: {member.id}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-1 rounded text-xs font-bold capitalize select-none ${
                        member.role === 'admin'
                          ? 'bg-rose-500/10 text-rose-400 border-none'
                          : member.role === 'instructor'
                          ? 'bg-emerald-500/10 text-emerald-400 border-none'
                          : 'bg-slate-100 text-slate-600 border-none'
                      }`}>
                        {member.role}
                      </span>
                    </td>

                    {/* Contact Details */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-600 text-base">
                          <FiMail className="h-4 w-4 text-slate-400 shrink-0" />
                          <span>{member.email}</span>
                        </div>
                        {member.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                            <FiPhone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{member.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Registered Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      <div className="flex items-center gap-1.5 text-base">
                        <FiCalendar className="h-4.5 w-4.5 text-slate-400" />
                        <span>
                          {member.createdAt
                            ? new Date(member.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right space-x-1.5 min-w-[140px]">
                      {confirmDeleteId === member.id ? (
                        <div className="inline-flex items-center gap-1.5 bg-[#242427] p-1 rounded-lg border border-rose-500/25">
                          <span className="text-xs font-bold text-rose-400 px-1">Confirm?</span>
                          <button
                            onClick={() => executeDeleteStaff(member.id, member.name)}
                            className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-slate-800 rounded text-xs font-bold transition-colors cursor-pointer border-none"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-100 hover:bg-zinc-700 text-slate-600 hover:text-slate-800 rounded text-xs font-bold transition-colors cursor-pointer border-none"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => router.push(`/admin/staff-register/${member.id}/edit`)}
                            className="p-2 text-slate-400 hover:text-[#615fff] hover:bg-[#615fff]/10 rounded-lg transition-all cursor-pointer border-none inline-flex items-center"
                            title="Edit Profile"
                          >
                            <FiEdit2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(member.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer border-none inline-flex items-center"
                            title="Delete Account"
                          >
                            <FiTrash2 className="h-4.5 w-4.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
