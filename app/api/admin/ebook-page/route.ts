import { getAuthorizedUser } from '@/lib/auth/auth'
import { connectToDatabase } from '@/lib/db/mongodb'
import { getFromStorage } from '@/lib/storage'

export async function GET(request: Request) {
  await connectToDatabase()
  if (!await getAuthorizedUser(['admin', 'staff'], 'products')) return new Response(null, { status: 403 })
  const key = new URL(request.url).searchParams.get('key')
  if (!key || !/^[a-f0-9-]{36}\.webp$/.test(key)) return new Response(null, { status: 400 })
  const asset = await getFromStorage(key, 'ebooks')
  if (!asset) return new Response(null, { status: 404 })
  return new Response(Uint8Array.from(asset.buffer), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' },
  })
}
