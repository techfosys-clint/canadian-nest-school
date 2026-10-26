import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CANDIDATES = [
  path.join(
    process.cwd(),
    'assets',
    'certificates',
    'certificate-background.webp',
  ),
  path.join(process.cwd(), 'public', 'media', 'certificate-background.webp'),
]

/**
 * Serves the certificate background image used by the real PDF generator,
 * so the public course-page sample matches production certificates.
 */
export async function GET() {
  for (const candidate of CANDIDATES) {
    try {
      await fs.promises.access(candidate, fs.constants.R_OK)
      const buf = await fs.promises.readFile(candidate)
      return new NextResponse(buf, {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      })
    } catch {
      /* try next */
    }
  }

  return NextResponse.json(
    { error: 'Certificate background not found.' },
    { status: 404 },
  )
}
