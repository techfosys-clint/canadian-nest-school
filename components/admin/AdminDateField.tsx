'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { FiCalendar, FiX } from 'react-icons/fi'
import 'react-day-picker/style.css'
import './admin-day-picker.css'

function ymdToLocalDate(ymd: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return undefined
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function localDateToYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatYmdLabel(ymd: string): string {
  const date = ymdToLocalDate(ymd)
  if (!date) return ymd
  return date.toLocaleDateString('en-BD', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type Props = {
  id?: string
  value: string
  onChange: (ymd: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  allowClear?: boolean
  className?: string
}

export default function AdminDateField({
  id,
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  required = false,
  allowClear = false,
  className = '',
}: Props) {
  const autoId = useId()
  const fieldId = id || autoId
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = ymdToLocalDate(value)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={fieldId}
        type='button'
        disabled={disabled}
        aria-required={required}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center gap-2 bg-white border border-slate-200 hover:border-slate-300 focus:border-[#E61C24]/80 rounded-lg p-3 text-base font-semibold text-left outline-none transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
      >
        <FiCalendar className='h-5 w-5 text-slate-400 shrink-0' />
        <span
          className={`flex-1 truncate ${value ? 'text-slate-800' : 'text-slate-400'}`}
        >
          {value ? formatYmdLabel(value) : placeholder}
        </span>
        {allowClear && value ? (
          <span
            role='button'
            tabIndex={0}
            aria-label='Clear date'
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                e.stopPropagation()
                onChange('')
              }
            }}
            className='p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          >
            <FiX className='h-4 w-4' />
          </span>
        ) : null}
      </button>

      {open && !disabled ? (
        <div className='absolute z-40 mt-2 left-0 rounded-lg border border-slate-200 bg-white p-3 shadow-lg shadow-slate-200/60 admin-day-picker'>
          <DayPicker
            mode='single'
            selected={selected}
            defaultMonth={selected || new Date()}
            onSelect={(date) => {
              if (!date) return
              onChange(localDateToYmd(date))
              setOpen(false)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
