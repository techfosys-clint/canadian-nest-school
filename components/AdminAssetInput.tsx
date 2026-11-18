'use client'

import { useState } from 'react'
import { FiUploadCloud } from 'react-icons/fi'

export default function AdminAssetInput({ kind, onUpload }: {
  kind: 'ebook' | 'video'
  onUpload: (keys: string[]) => void
}) {
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <label className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center text-base transition-colors focus-within:border-[#E61C24]/60 focus-within:ring-2 focus-within:ring-[#E61C24]/10 ${busy ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-[#E61C24]/60 hover:bg-red-50/30'}`}>
      <span className='flex h-12 w-12 items-center justify-center rounded-lg bg-[#E61C24]/10 text-[#E61C24]'>
        <FiUploadCloud className='h-6 w-6' aria-hidden='true' />
      </span>
      <span className='font-semibold text-slate-800'>{busy ? 'Uploading…' : kind === 'ebook' ? 'Choose eBook page images' : 'Choose an intro video'}</span>
      <span className='text-slate-500'>
        {kind === 'ebook' ? 'PNG, JPEG or WebP · Up to 8 MB per page. Select pages in reading order.' : 'MP4 or WebM · Up to 25 MB'}
      </span>
      <input className='sr-only' type='file' disabled={busy} multiple={kind === 'ebook'}
        accept={kind === 'ebook' ? 'image/png,image/jpeg,image/webp' : 'video/mp4,video/webm'}
        onChange={async event => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (!files.length) return
          setBusy(true)
          try {
            const keys = []
            for (const [index, file] of files.entries()) {
              setStatus('Uploading ' + (index + 1) + ' of ' + files.length + '…')
              const body = new FormData()
              body.set('kind', kind)
              body.set('file', file)
              const response = await fetch('/api/admin/product-assets', { method: 'POST', body })
              const data = await response.json()
              if (!response.ok || !data.url) throw new Error(data.error || 'Upload failed.')
              keys.push(data.url)
            }
            onUpload(keys)
            setStatus('Upload complete. Save to apply.')
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Upload failed.')
          } finally {
            setBusy(false)
          }
        }} />
      {status && <span role='status' className='font-medium text-slate-700'>{status}</span>}
    </label>
  )
}
