'use client'

import { useEffect, useState } from 'react'
import { FiCheck, FiMessageSquare } from 'react-icons/fi'
import Swal from 'sweetalert2'

export default function SmsRemindersClient() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [offsetsText, setOffsetsText] = useState('5, 3, 1')
  const [maxMessages, setMaxMessages] = useState(3)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/sms-reminder-settings')
        const data = await res.json()
        if (res.ok && data.settings) {
          setEnabled(!!data.settings.enabled)
          setOffsetsText(
            (data.settings.offsetDaysBeforeEnd || [5, 3, 1]).join(', '),
          )
          setMaxMessages(Number(data.settings.maxMessagesPerPeriod ?? 3))
        }
      } catch {
        /* ignore */
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const offsetDaysBeforeEnd = offsetsText
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n >= 0)

      const res = await fetch('/api/admin/sms-reminder-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          offsetDaysBeforeEnd,
          maxMessagesPerPeriod: maxMessages,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save.')
      }
      await Swal.fire({
        icon: 'success',
        title: 'SMS settings saved',
        timer: 1400,
        showConfirmButton: false,
      })
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Save failed',
        text: err.message || 'Could not save settings.',
        confirmButtonColor: '#E61C24',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='container mx-auto px-6 py-12 text-base text-slate-500'>
        Loading SMS settings…
      </div>
    )
  }

  return (
    <div className='container mx-auto px-6 py-8 space-y-8'>
      <div className='border-b border-slate-200/80 pb-6 space-y-1'>
        <h1 className='text-3xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2'>
          <FiMessageSquare className='text-[#E61C24]' />
          Monthly fee SMS reminders
        </h1>
        <p className='text-base font-semibold text-slate-500'>
          Global offsets are days before each enrollment&apos;s period end
          (paidUntil). Cron uses these settings with CRON_SECRET.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className='bg-white border border-slate-200/60 rounded-lg p-6 shadow-sm space-y-5 max-w-xl'
      >
        <div className='flex items-center gap-3'>
          <input
            type='checkbox'
            id='smsEnabled'
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className='h-5 w-5 accent-[#E61C24] rounded cursor-pointer'
          />
          <label
            htmlFor='smsEnabled'
            className='text-base font-bold text-slate-600 cursor-pointer'
          >
            Enable SMS fee reminders
          </label>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-base font-bold text-slate-600'>
            Offset days before period end
          </label>
          <input
            type='text'
            value={offsetsText}
            onChange={(e) => setOffsetsText(e.target.value)}
            placeholder='5, 3, 1'
            className='w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none'
          />
          <p className='text-base text-slate-500'>
            Comma-separated. Example: 5, 3, 1 means SMS on those days before
            paidUntil.
          </p>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-base font-bold text-slate-600'>
            Max SMS per enrollment per billing period
          </label>
          <input
            type='number'
            min={0}
            value={maxMessages}
            onChange={(e) => setMaxMessages(Number(e.target.value) || 0)}
            className='w-full px-4 py-3 rounded-lg bg-slate-100 border border-slate-200 focus:border-[#E61C24]/60 text-slate-800 font-semibold text-base focus:outline-none'
          />
        </div>

        <div className='flex justify-end pt-2'>
          <button
            type='submit'
            disabled={saving}
            className='px-6 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base transition-colors flex items-center gap-2 disabled:opacity-50'
          >
            <FiCheck className='h-5 w-5' />
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
