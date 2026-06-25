'use client'

import React, { useState, useRef } from 'react'
import { FiUpload, FiCheck, FiAlertCircle, FiX, FiCopy } from 'react-icons/fi'
import Swal from 'sweetalert2'

interface VideoUploadWidgetProps {
  onUploadSuccess: (objectKey: string) => void
}

export default function VideoUploadWidget({ onUploadSuccess }: VideoUploadWidgetProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedVideo, setUploadedVideo] = useState<{
    objectKey: string
    filename: string
    size: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setUploadProgress(0)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress (actual progress depends on fetch API support)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) return prev
          return prev + Math.random() * 20
        })
      }, 500)

      const response = await fetch('/api/admin/videos/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || data.error || 'Upload failed')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.message || 'Upload failed')
      }

      setUploadedVideo({
        objectKey: data.data.objectKey,
        filename: data.data.filename,
        size: data.data.size,
      })

      Swal.fire({
        icon: 'success',
        title: 'Video Uploaded!',
        html: `<p style="font-size: 14px; margin: 12px 0;">Your video is ready. Use the key below in the lesson form:</p>
               <code style="background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: block; word-break: break-all;">
               ${data.data.objectKey}
               </code>`,
        confirmButtonColor: '#E61C24',
        background: '#121829',
        color: '#ffffff',
      })

      setTimeout(() => {
        onUploadSuccess(data.data.objectKey)
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
      setUploadProgress(0)
      Swal.fire({
        icon: 'error',
        title: 'Upload Failed',
        text: err.message || 'An error occurred during upload.',
        background: '#121829',
        color: '#ffffff',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    Swal.fire({
      icon: 'success',
      title: 'Copied!',
      text: 'Video key copied to clipboard.',
      timer: 1500,
      showConfirmButton: false,
      background: '#121829',
      color: '#ffffff',
    })
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-zinc-700 rounded-lg p-6 text-center hover:border-[#E61C24] transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />

        {!uploading && !uploadedVideo ? (
          <div className="flex flex-col items-center gap-3">
            <FiUpload className="h-8 w-8 text-zinc-500" />
            <div>
              <p className="text-base font-bold text-white">Click to upload video</p>
              <p className="text-base font-medium text-zinc-500 mt-1">
                MP4, WebM, MOV, MKV (max 500MB)
              </p>
            </div>
          </div>
        ) : uploading ? (
          <div className="space-y-3">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E61C24] transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-base font-bold text-white">{Math.round(uploadProgress)}% uploading...</p>
          </div>
        ) : uploadedVideo ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <FiCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-base font-bold text-white">Upload complete!</p>
            <p className="text-base font-medium text-zinc-400">{uploadedVideo.filename}</p>
            <p className="text-base font-medium text-zinc-500">{formatFileSize(uploadedVideo.size)}</p>
          </div>
        ) : null}
      </div>

      {uploadedVideo && (
        <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FiCheck className="h-5 w-5 text-emerald-400" />
            <span className="text-base font-bold text-emerald-300">Ready to use</span>
          </div>
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded gap-2">
            <code className="text-base font-mono text-zinc-300 break-all flex-1">
              {uploadedVideo.objectKey}
            </code>
            <button
              onClick={() => copyToClipboard(uploadedVideo.objectKey)}
              className="p-2 hover:bg-zinc-800 rounded transition-colors flex-shrink-0"
              title="Copy key"
            >
              <FiCopy className="h-5 w-5 text-zinc-400" />
            </button>
          </div>
          <p className="text-base font-medium text-zinc-400">
            Paste this key in the "Video Source" field below
          </p>
        </div>
      )}

      {error && (
        <div className="bg-rose-950/20 border border-rose-500/40 rounded-lg p-4 flex items-start gap-3">
          <FiAlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-base font-bold text-rose-300">Upload failed</p>
            <p className="text-base font-medium text-rose-200 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
