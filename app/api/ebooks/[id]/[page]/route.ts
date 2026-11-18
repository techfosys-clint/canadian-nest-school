import sharp from 'sharp'
import { getPurchasedEbook } from '@/lib/purchasedEbook'
import { getFromStorage } from '@/lib/storage'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; page: string }> }) {
  const { id, page } = await params
  const ebook = await getPurchasedEbook(id)
  const index = Number(page)
  const key = Number.isSafeInteger(index) && index > 0 ? ebook?.ebookPages?.[index - 1] : undefined
  if (!ebook || !key || !/^[a-f0-9-]{36}\.webp$/.test(key)) return new Response(null, { status: 404 })
  const asset = await getFromStorage(key, 'ebooks')
  if (!asset) return new Response(null, { status: 404 })
  const image = sharp(asset.buffer)
  const { width, height } = await image.metadata()
  const fontSize = Math.max(12, Math.floor(width / 34))
  const mark = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
    '<defs><pattern id="mark" width="' + width + '" height="' + fontSize * 10 + '" patternUnits="userSpaceOnUse">' +
    '<text x="8" y="' + fontSize * 4 + '" fill="#475569" fill-opacity=".42" font-size="' + fontSize + '">' +
    'Order ' + ebook.orderId + '</text></pattern></defs><rect width="100%" height="100%" fill="url(#mark)"/></svg>',
  )
  const rendered = await image.composite([{ input: mark }]).webp().toBuffer()
  return new Response(Uint8Array.from(rendered), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
