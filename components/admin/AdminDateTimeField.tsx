'use client'

import AdminDateField from '@/components/admin/AdminDateField'

const TIME_OPTIONS = Array.from({ length: 24 * 4 }, (_, i) => {
  const hours = Math.floor(i / 4)
  const minutes = (i % 4) * 15
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
})

function splitDateTime(value: string): { ymd: string; hm: string } {
  if (!value) return { ymd: '', hm: '10:00' }
  if (value.includes('T')) {
    const [ymd, time = '10:00'] = value.split('T')
    return { ymd: ymd || '', hm: time.slice(0, 5) || '10:00' }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { ymd: value, hm: '10:00' }
  }
  return { ymd: '', hm: '10:00' }
}

function formatTimeLabel(hm: string): string {
  const [hRaw, mRaw] = hm.split(':')
  const hours = Number(hRaw)
  const minutes = Number(mRaw)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return hm
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

type Props = {
  id?: string
  value: string
  onChange: (datetimeLocal: string) => void
  disabled?: boolean
  required?: boolean
}

/** Date calendar + 15-minute time select. Value is `YYYY-MM-DDTHH:mm` (BD). */
export default function AdminDateTimeField({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
}: Props) {
  const { ymd, hm } = splitDateTime(value)
  const timeValue = TIME_OPTIONS.includes(hm)
    ? hm
    : TIME_OPTIONS.reduce((closest, option) => {
        const [ch, cm] = closest.split(':').map(Number)
        const [oh, om] = option.split(':').map(Number)
        const [th, tm] = hm.split(':').map(Number)
        const currentDiff = Math.abs(ch * 60 + cm - (th * 60 + tm))
        const optionDiff = Math.abs(oh * 60 + om - (th * 60 + tm))
        return optionDiff < currentDiff ? option : closest
      }, '10:00')

  const emit = (nextYmd: string, nextHm: string) => {
    if (!nextYmd) {
      onChange('')
      return
    }
    onChange(`${nextYmd}T${nextHm}`)
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3'>
      <AdminDateField
        id={id}
        value={ymd}
        onChange={(nextYmd) => emit(nextYmd, timeValue)}
        placeholder='Select date'
        disabled={disabled}
        required={required}
      />
      <select
        aria-label='Time'
        value={timeValue}
        disabled={disabled || !ymd}
        onChange={(e) => emit(ymd, e.target.value)}
        className='bg-white border border-slate-200 rounded-lg p-3 text-base font-semibold text-slate-800 outline-none w-full cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
      >
        {TIME_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {formatTimeLabel(option)}
          </option>
        ))}
      </select>
    </div>
  )
}
