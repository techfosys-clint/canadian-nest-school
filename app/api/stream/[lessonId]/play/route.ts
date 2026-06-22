import { NextResponse } from 'next/server'
import { guardStream } from '@/lib/streamGuard'
import { getVideoObject } from '@/lib/stream'

type Props = {
  params: Promise<{ lessonId: string }>
}

// Stream large files; never cache the bytes at the edge.
export const dynamic = 'force-dynamic'

/**
 * Byte proxy. The browser's <video> element points here, so devtools only ever
 * shows `canadian-nest-school.com/api/stream/<id>/play` — the Cloudflare R2 URL is fetched
 * server-side and never reaches the client. Supports HTTP Range so seeking works.
 *
 * Session registration is intentionally skipped here (the authorize call already
 * did it) because the browser fires many Range requests per video.
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const { lessonId } = await params
    const result = await guardStream(request, lessonId, { registerSession: false })
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: result.code }, { status: result.status })
    }

    const range = request.headers.get('range') || undefined
    const obj = await getVideoObject(result.objectKey, range)
    if (!obj || !obj.Body) {
      return NextResponse.json({ error: 'Video file not found.' }, { status: 404 })
    }

    // The AWS SDK v3 body exposes a web stream we can hand straight to Response.
    const body = (obj.Body as any).transformToWebStream
      ? (obj.Body as any).transformToWebStream()
      : (obj.Body as any)

    const headers = new Headers()
    headers.set('Content-Type', obj.ContentType || 'video/mp4')
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', 'no-store')
    if (obj.ContentLength != null) headers.set('Content-Length', String(obj.ContentLength))
    if (obj.ContentRange) headers.set('Content-Range', obj.ContentRange)

    // 206 when a range was served, otherwise 200 for the full object.
    const status = range && obj.ContentRange ? 206 : 200

    return new Response(body, { status, headers })
  } catch (error: any) {
    console.error('Stream proxy error:', error)
    return NextResponse.json({ error: error.message || 'Streaming failed.' }, { status: 500 })
  }
}
