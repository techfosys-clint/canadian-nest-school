'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiSave, FiImage, FiUploadCloud, FiTrash2, FiPlus, FiTag } from 'react-icons/fi'
import Swal from 'sweetalert2'
import { parseJsonResponse } from '@/lib/safeJson'
import RichTextEditor from '@/components/RichTextEditor'
import MediaPickerModal from '@/components/MediaPickerModal'
import type { MediaItem } from '@/components/MediaPickerModal'

interface ProductFormProps {
  initialData?: {
    id: string
    title: string
    slug: string
    shortDescription?: string
    description?: string
    price: number
    comparePrice?: number
    thumbnail?: string
    images?: string[]
    productType: 'book' | 'merchandise' | 'other'
    author?: string
    sku?: string
    category?: string
    stock?: number | null
    status: 'draft' | 'published'
  }
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}

export default function ProductFormClient({ initialData }: ProductFormProps) {
  const router = useRouter()
  const isEditMode = !!initialData

  const [title, setTitle] = useState(initialData?.title || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState<number | ''>(initialData?.price ?? '')
  const [comparePrice, setComparePrice] = useState<number | ''>(initialData?.comparePrice ?? '')
  const [productType, setProductType] = useState<'book' | 'merchandise' | 'other'>(initialData?.productType || 'book')
  const [author, setAuthor] = useState(initialData?.author || '')
  const [sku, setSku] = useState(initialData?.sku || '')
  const [category, setCategory] = useState(initialData?.category || '')
  const [stock, setStock] = useState<number | ''>(initialData?.stock ?? '')
  const [status, setStatus] = useState<'draft' | 'published'>(initialData?.status || 'draft')

  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '')
  const [images, setImages] = useState<string[]>(initialData?.images || [])

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)
  const [showThumbnailPicker, setShowThumbnailPicker] = useState(false)
  const [showGalleryPicker, setShowGalleryPicker] = useState(false)

  const thumbnailFileRef = useRef<HTMLInputElement>(null)
  const galleryFileRef = useRef<HTMLInputElement>(null)

  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setTitle(val)
    if (!isEditMode) setSlug(slugify(val))
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingThumbnail(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('alt', title ? `Cover for ${title}` : 'Product cover')
    try {
      const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await parseJsonResponse(res)
      if (!res.ok) throw new Error(data.error || 'Failed to upload image.')
      setThumbnail(data.media.url)
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message || 'Could not upload image.', background: '#ffffff', color: '#1a1a1a' })
    } finally {
      setUploadingThumbnail(false)
      if (thumbnailFileRef.current) thumbnailFileRef.current.value = ''
    }
  }

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadingGallery(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt', title || 'Product image')
        const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
        const data = await parseJsonResponse(res)
        if (!res.ok) throw new Error(data.error || 'Failed to upload image.')
        setImages((prev) => [...prev, data.media.url])
      }
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Upload Failed', text: err.message || 'Could not upload gallery image.', background: '#ffffff', color: '#1a1a1a' })
    } finally {
      setUploadingGallery(false)
      if (galleryFileRef.current) galleryFileRef.current.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!title.trim() || !slug.trim()) {
      setErrorMsg('Title and slug are required.')
      return
    }
    if (price === '' || Number(price) < 0) {
      setErrorMsg('A valid price is required.')
      return
    }

    setSaving(true)
    const payload = {
      title: title.trim(),
      slug: slugify(slug),
      shortDescription: shortDescription || undefined,
      description: description || undefined,
      price: Number(price),
      comparePrice: comparePrice === '' ? undefined : Number(comparePrice),
      thumbnail,
      images,
      productType,
      author: author || undefined,
      sku: sku || undefined,
      category: category || undefined,
      stock: stock === '' ? null : Number(stock),
      status,
    }

    try {
      const url = isEditMode ? `/api/admin/products/${initialData!.id}` : '/api/admin/products'
      const method = isEditMode ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await parseJsonResponse(res)

      if (res.ok && data.success) {
        await Swal.fire({
          icon: 'success',
          title: isEditMode ? 'Product Updated' : 'Product Created',
          text: `"${payload.title}" was saved successfully.`,
          timer: 1400,
          showConfirmButton: false,
          background: '#ffffff',
          color: '#1a1a1a',
        })
        router.push('/admin/products')
        router.refresh()
      } else {
        setErrorMsg(data.error || 'Failed to save product.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving the product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/products')}
              className="h-10 w-10 border border-slate-200 hover:border-slate-300 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-800 bg-white transition-colors cursor-pointer"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
              <FiTag className="text-[#E61C24]" />
              <span>{isEditMode ? 'Edit Product' : 'Add New Product'}</span>
            </h1>
          </div>
          <p className="text-base font-semibold text-slate-500 pl-13">
            Manage books and other items sold on the public shop page.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: main fields */}
        <div className="lg:col-span-2 space-y-6">
          {errorMsg && (
            <div className="flex items-center gap-2.5 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-500 text-base font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">Basic Information</h2>

            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Product Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={handleTitleChange}
                placeholder="e.g. Phonics Foundation Workbook"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Slug *</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="phonics-foundation-workbook"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-slate-600">Product Type *</label>
                <select
                  value={productType}
                  onChange={(e: any) => setProductType(e.target.value)}
                  className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors cursor-pointer"
                >
                  <option value="book">Book</option>
                  <option value="merchandise">Merchandise</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-slate-600">Author {productType === 'book' ? '*' : '(optional)'}</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-slate-600">Category (optional)</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Grammar Books, Stationery"
                  className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-base font-bold text-slate-600">SKU (optional)</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. BOOK-001"
                  className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Short Description</label>
              <textarea
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                rows={2}
                placeholder="One or two lines shown on the shop grid card"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors resize-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">Full Description</h2>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Describe the product, its contents, condition, or specifications..."
            />
          </div>

          {/* Gallery Images */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Gallery Images</h2>
              <div className="flex items-center gap-2">
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24]/20 border border-[#E61C24]/20 text-[#E61C24] font-bold text-sm cursor-pointer transition-all ${uploadingGallery ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input
                    ref={galleryFileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                  <FiUploadCloud className="h-4 w-4" />
                  {uploadingGallery ? 'Uploading...' : 'Upload'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowGalleryPicker(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm cursor-pointer transition-all"
                >
                  <FiImage className="h-4 w-4" />
                  Choose from Library
                </button>
              </div>
            </div>

            {images.length === 0 ? (
              <div className="text-center py-8 bg-slate-100 rounded-lg border border-dashed border-slate-200 p-6">
                <p className="text-base font-semibold text-slate-500">No gallery images added yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 h-7 w-7 rounded-lg bg-rose-500/90 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">Thumbnail</h2>
            <div className="aspect-square rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
              {uploadingThumbnail ? (
                <div className="h-8 w-8 border-2 border-[#E61C24] border-t-transparent rounded-full animate-spin" />
              ) : thumbnail ? (
                <img src={thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <FiImage className="h-8 w-8" />
                  <span className="text-sm font-semibold">No thumbnail</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <label className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24]/20 border border-[#E61C24]/20 text-[#E61C24] font-bold text-sm cursor-pointer transition-all ${uploadingThumbnail ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  ref={thumbnailFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
                <FiUploadCloud className="h-4 w-4" />
                Upload
              </label>
              <button
                type="button"
                onClick={() => setShowThumbnailPicker(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-sm cursor-pointer transition-all"
              >
                <FiImage className="h-4 w-4" />
                Library
              </button>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">Pricing & Inventory</h2>

            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Price (৳) *</label>
              <input
                type="number"
                required
                min={0}
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Compare-at Price (৳) <span className="text-slate-400 font-semibold">(optional, shown struck-through)</span></label>
              <input
                type="number"
                min={0}
                step="any"
                value={comparePrice}
                onChange={(e) => setComparePrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-base font-bold text-slate-600">Stock Quantity <span className="text-slate-400 font-semibold">(blank = unlimited)</span></label>
              <input
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Unlimited"
                className="bg-slate-100 border border-slate-200 focus:border-[#E61C24]/80 focus:ring-1 focus:ring-[#E61C24]/80 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors"
              />
            </div>
          </div>

          {/* Status */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight border-b border-slate-100 pb-3">Status</h2>
            <select
              value={status}
              onChange={(e: any) => setStatus(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-800 rounded-lg p-3 text-base font-semibold outline-none w-full transition-colors cursor-pointer"
            >
              <option value="draft">Draft (hidden from shop)</option>
              <option value="published">Published (visible on shop)</option>
            </select>
          </div>

          {/* Save Actions */}
          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#E61C24] hover:bg-[#CC181F] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 hover:scale-[1.01] transition-all cursor-pointer disabled:opacity-50"
          >
            <FiSave className="h-5 w-5" />
            <span>{saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Product'}</span>
          </button>
        </div>
      </form>

      {/* Thumbnail Media Picker */}
      <MediaPickerModal
        open={showThumbnailPicker}
        onClose={() => setShowThumbnailPicker(false)}
        onSelect={(media: MediaItem) => setThumbnail(media.url)}
        title="Pick Product Thumbnail"
      />

      {/* Gallery Media Picker */}
      <MediaPickerModal
        open={showGalleryPicker}
        onClose={() => setShowGalleryPicker(false)}
        onSelect={(media: MediaItem) => setImages((prev) => [...prev, media.url])}
        title="Add Gallery Image"
      />
    </div>
  )
}
