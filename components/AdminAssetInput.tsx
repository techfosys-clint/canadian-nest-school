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
      <span className='font-semibold text-slate-800'>{busy ? 'Uploadingâ€¦' : kind === 'ebook' ? 'Choose a PDF or page images' : 'Choose an intro video'}</span>
      <span className='text-slate-500'>
        {kind === 'ebook' ? 'PNG, JPEG or WebP Â· Up to 8 MB per page. Select pages in reading order.' : 'MP4 or WebM Â· Up to 25 MB'}
      </span>
      <input className='sr-only' type='file' disabled={busy} multiple={kind === 'ebook'}
        accept={kind === 'ebook' ? 'application/pdf,image/png,image/jpeg,image/webp' : 'video/mp4,video/webm'}
        onChange={async event => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (!files.length) return
          setBusy(true)
          try {
            async function upload(file: File) {
              const body = new FormData()
              body.set('kind', kind)
              body.set('file', file)
              const response = await fetch('/api/admin/product-assets', { method: 'POST', body })
              const data = await response.json()
              if (!response.ok || !data.url) throw new Error(data.error || 'Upload failed. Previously imported pages are kept.')
              onUpload([data.url])
            }
            for (const [index, file] of files.entries()) {
              if (kind === 'ebook' && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
                if (file.size > 25 * 1024 * 1024) throw new Error('Choose a PDF up to 25 MB.')
                const pdfjs = await import('pdfjs-dist')
                pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
                const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
                try {
                  const pdf = await task.promise
                  if (pdf.numPages > 500) throw new Error('A PDF can contain up to 500 pages.')
                  for (let number = 1; number <= pdf.numPages; number++) {
                    setStatus('Importing PDF page ' + number + ' of ' + pdf.numPages + '…')
                    const page = await pdf.getPage(number)
                    const size = page.getViewport({ scale: 1 })
                    const viewport = page.getViewport({ scale: Math.min(1600 / size.width, 2200 / size.height) })
                    const canvas = document.createElement('canvas')
                    canvas.width = Math.ceil(viewport.width)
                    canvas.height = Math.ceil(viewport.height)
                    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise
                    const image = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
                      blob => blob ? resolve(blob) : reject(new Error('Could not render PDF page.')), 'image/webp', 0.9,
                    ))
                    await upload(new File([image], 'page-' + number + '.webp', { type: 'image/webp' }))
                    page.cleanup()
                    canvas.width = 0
                    canvas.height = 0
                  }
                } finally {
                  await task.destroy()
                }
              } else {
                setStatus('Uploading ' + (index + 1) + ' of ' + files.length + '…')
                await upload(file)
              }
            }
            setStatus('Upload complete. Save to apply.')
          } catch (error) {
            setStatus(error instanceof Error ? error.message : 'Upload failed. Previously imported pages are kept.')
          } finally {
            setBusy(false)
          }
        }} />
      {status && <span role='status' className='font-medium text-slate-700'>{status}</span>}
    </label>
  )
}
