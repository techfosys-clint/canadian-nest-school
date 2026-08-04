import path from 'path'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    const filename = decodeURIComponent(pathSegments.join('/'))

    const { getFromStorage } = await import('@/lib/storage')
    const fileData = await getFromStorage(filename, 'media')

    if (!fileData) {
      return new Response('Media not found.', { status: 404 })
    }

    const ext = path.extname(filename).toLowerCase()
    let contentType = fileData.contentType || 'image/jpeg'
    if (!fileData.contentType) {
      if (ext === '.webp') contentType = 'image/webp'
      else if (ext === '.png') contentType = 'image/png'
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
      else if (ext === '.svg') contentType = 'image/svg+xml'
      else if (ext === '.gif') contentType = 'image/gif'
    }

    return new Response(fileData.buffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Media Proxy Route Error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
