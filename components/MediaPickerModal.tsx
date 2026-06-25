'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  FiUploadCloud, FiImage, FiSearch, FiX, FiCheck,
  FiGrid, FiUpload, FiAlertCircle,
} from 'react-icons/fi'

export interface MediaItem {
  id: string
  filename: string
  url: string
  alt: string
  mimeType: string
  filesize: number
  width: number | null
  height: number | null
  thumbnailUrl: string
  createdAt: string
}

interface UploadProgress {
  name: string
  status: 'uploading' | 'done' | 'error'
  url?: string
  error?: string
}

interface MediaPickerModalProps {
  open: boolean
  onClose: () => void
  onSelect: (item: MediaItem) => void
  title?: string
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function MediaPickerModal({
  open,
  onClose,
  onSelect,
  title = 'Select from Media Library',
}: MediaPickerModalProps) {
  const [tab, setTab] = useState<'library' | 'upload'>('library')
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [hovered, setHovered] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Fetch library when modal opens
  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/admin/media')
      .then(r => r.json())
      .then(data => {
        if (data.media) {
          setMediaItems(data.media.map((m: any) => ({
            id: m._id,
            filename: m.filename,
            url: m.url,
            alt: m.alt || m.filename,
            mimeType: m.mimeType || 'image/jpeg',
            filesize: m.filesize || 0,
            width: m.width || null,
            height: m.height || null,
            thumbnailUrl: m.sizes?.thumbnail?.url || m.url,
            createdAt: m.createdAt,
          })))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [open])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch('')
      setUploads([])
      setTab('library')
      setDragOver(false)
    }
  }, [open])

  const filtered = mediaItems.filter(m =>
    m.filename.toLowerCase().includes(search.toLowerCase()) ||
    m.alt.toLowerCase().includes(search.toLowerCase())
  )

  async function uploadFiles(files: File[]) {
    if (!files.length) return
    setUploading(true)
    setTab('upload')

    const progressList: UploadProgress[] = files.map(f => ({ name: f.name, status: 'uploading' }))
    setUploads(progressList)

    const newItems: MediaItem[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '))
      try {
        const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (res.ok && data.media) {
          const item: MediaItem = {
            id: data.media.id,
            filename: data.media.filename,
            url: data.media.url,
            alt: data.media.alt,
            mimeType: file.type,
            filesize: file.size,
            width: null,
            height: null,
            thumbnailUrl: data.media.sizes?.thumbnail?.url || data.media.url,
            createdAt: new Date().toISOString(),
          }
          newItems.push(item)
          setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'done', url: item.url } : u))
        } else {
          setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error', error: data.error || 'Failed' } : u))
        }
      } catch (err: any) {
        setUploads(prev => prev.map((u, idx) => idx === i ? { ...u, status: 'error', error: err.message } : u))
      }
    }

    if (newItems.length > 0) {
      setMediaItems(prev => [...newItems, ...prev])
    }
    setUploading(false)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    uploadFiles(files)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf')
    uploadFiles(files)
  }, [])

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }
  function handleDragLeave() { setDragOver(false) }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-[#0e1422] border border-zinc-800 rounded-lg shadow-2xl w-full max-w-4xl mx-4 flex flex-col"
        style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-[#E61C24]/15 border border-[#E61C24]/20 flex items-center justify-center">
              <FiImage className="h-4.5 w-4.5 text-[#E61C24]" />
            </div>
            <div>
              <h2 className="font-bold text-white text-xl leading-tight">{title}</h2>
              <p className="text-sm font-semibold text-zinc-500">{mediaItems.length} assets in library</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer">
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          <button
            onClick={() => setTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold transition-all cursor-pointer ${tab === 'library' ? 'bg-[#E61C24] text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}
          >
            <FiGrid className="h-4 w-4" /> Library
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold transition-all cursor-pointer ${tab === 'upload' ? 'bg-[#E61C24] text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'}`}
          >
            <FiUpload className="h-4 w-4" /> Upload New
            {uploads.length > 0 && (
              <span className="ml-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-center font-bold">
                {uploads.filter(u => u.status === 'done').length}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6 py-4">

          {tab === 'library' && (
            <>
              {/* Search */}
              <div className="flex items-center gap-2 bg-[#121829] border border-zinc-800 rounded-lg px-4 py-2.5 mb-4 focus-within:border-[#E61C24]/50 transition-colors shrink-0">
                <FiSearch className="h-4.5 w-4.5 text-zinc-500 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by filename or alt text..."
                  className="bg-transparent border-none outline-none w-full text-base font-semibold text-white placeholder-zinc-500"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="text-zinc-500 hover:text-white cursor-pointer">
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>
                {loading ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="h-8 w-8 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                    <FiImage className="h-10 w-10 text-zinc-700" />
                    <p className="text-base font-semibold text-zinc-500">
                      {search ? 'No assets match your search.' : 'No media in library yet. Upload files first.'}
                    </p>
                    {!search && (
                      <button onClick={() => setTab('upload')} className="px-4 py-2 bg-[#E61C24]/15 hover:bg-[#E61C24]/25 border border-[#E61C24]/20 text-[#E61C24] rounded-lg font-bold text-base transition-all cursor-pointer">
                        Go to Upload
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                    {filtered.map(item => {
                      const isImg = item.mimeType.startsWith('image/')
                      const isHov = hovered === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => { onSelect(item); onClose() }}
                          onMouseEnter={() => setHovered(item.id)}
                          onMouseLeave={() => setHovered(null)}
                          className={`group relative rounded-lg overflow-hidden border transition-all duration-150 text-left cursor-pointer ${isHov ? 'border-[#E61C24] shadow-lg shadow-[#E61C24]/20 scale-[1.02]' : 'border-zinc-800 hover:border-zinc-600'}`}
                        >
                          <div className="aspect-square bg-[#0e1322] flex items-center justify-center overflow-hidden">
                            {isImg ? (
                              <img
                                src={item.thumbnailUrl || item.url}
                                alt={item.alt}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1 p-2 text-center">
                                <FiImage className="h-6 w-6 text-zinc-600" />
                                <span className="text-xs font-bold text-zinc-600 uppercase">
                                  {item.mimeType.split('/')[1]?.slice(0, 4) || 'file'}
                                </span>
                              </div>
                            )}
                            {/* Hover overlay */}
                            <div className={`absolute inset-0 bg-[#E61C24]/20 flex items-center justify-center transition-opacity duration-150 ${isHov ? 'opacity-100' : 'opacity-0'}`}>
                              <div className="h-8 w-8 rounded-full bg-[#E61C24] flex items-center justify-center shadow-lg">
                                <FiCheck className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="p-1.5 bg-[#0e1322]">
                            <p className="text-xs font-bold text-zinc-400 truncate">{item.filename}</p>
                            <p className="text-xs font-semibold text-zinc-600">{formatBytes(item.filesize)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'upload' && (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
              {/* Drop zone */}
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200 flex flex-col items-center justify-center gap-4 shrink-0 ${dragOver ? 'border-[#E61C24] bg-[#E61C24]/8' : 'border-zinc-800 hover:border-zinc-700 bg-[#121829]'}`}
              >
                <div className={`h-16 w-16 rounded-full flex items-center justify-center transition-all ${dragOver ? 'bg-[#E61C24]/20 scale-110' : 'bg-zinc-800/50'}`}>
                  <FiUploadCloud className={`h-8 w-8 transition-all ${dragOver ? 'text-[#E61C24]' : 'text-zinc-500'}`} />
                </div>
                <div>
                  <p className="text-base font-bold text-white">
                    {dragOver ? 'Drop to upload!' : 'Drag & Drop files here'}
                  </p>
                  <p className="text-base font-semibold text-zinc-500 mt-1">
                    or click below to browse — supports bulk selection
                  </p>
                </div>
                <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-base transition-all cursor-pointer ${uploading ? 'opacity-50 pointer-events-none bg-zinc-800 text-zinc-500' : 'bg-[#E61C24] hover:bg-[#CC181F] text-white shadow-md shadow-[#E61C24]/20'}`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*,application/pdf"
                    multiple
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={uploading}
                  />
                  <FiUpload className="h-4.5 w-4.5" />
                  {uploading ? 'Uploading...' : 'Browse & Select Files'}
                </label>
                <p className="text-sm font-semibold text-zinc-600">PNG, JPEG, WEBP, GIF, PDF, MP4 supported</p>
              </div>

              {/* Upload progress list */}
              {uploads.length > 0 && (
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#27272a transparent' }}>
                  <p className="text-base font-bold text-zinc-400 mb-2">
                    Upload Progress — {uploads.filter(u => u.status === 'done').length}/{uploads.length} complete
                  </p>
                  {uploads.map((u, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${u.status === 'done' ? 'bg-emerald-500/8 border-emerald-500/20' : u.status === 'error' ? 'bg-rose-500/8 border-rose-500/20' : 'bg-[#121829] border-zinc-800'}`}>
                      <div className="shrink-0">
                        {u.status === 'uploading' && (
                          <div className="h-5 w-5 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
                        )}
                        {u.status === 'done' && (
                          <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                            <FiCheck className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {u.status === 'error' && (
                          <div className="h-5 w-5 rounded-full bg-rose-500 flex items-center justify-center">
                            <FiAlertCircle className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-white truncate">{u.name}</p>
                        {u.status === 'uploading' && <p className="text-sm font-semibold text-zinc-500">Uploading...</p>}
                        {u.status === 'done' && <p className="text-sm font-semibold text-emerald-400">Uploaded successfully</p>}
                        {u.status === 'error' && <p className="text-sm font-semibold text-rose-400">{u.error}</p>}
                      </div>
                      {u.status === 'done' && u.url && (
                        <button
                          type="button"
                          onClick={() => {
                            const item = mediaItems.find(m => m.url === u.url)
                            if (item) { onSelect(item); onClose() }
                          }}
                          className="shrink-0 px-3 py-1.5 bg-[#E61C24]/15 hover:bg-[#E61C24] border border-[#E61C24]/20 hover:border-[#E61C24] text-[#E61C24] hover:text-white rounded-lg text-sm font-bold transition-all cursor-pointer"
                        >
                          Use this
                        </button>
                      )}
                    </div>
                  ))}

                  {!uploading && uploads.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setTab('library'); setUploads([]) }}
                      className="w-full mt-2 py-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-base transition-all cursor-pointer"
                    >
                      View in Library →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
