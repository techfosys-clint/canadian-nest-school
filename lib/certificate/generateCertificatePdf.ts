import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import type PDFKit from 'pdfkit'
import sharp from 'sharp'

/** Prefer assets/ (not volume-mounted). Fallbacks cover local/legacy paths. */
const CERTIFICATE_BACKGROUND_CANDIDATES = [
  path.join(process.cwd(), 'assets', 'certificates', 'certificate-background.webp'),
  path.join(
    process.cwd(),
    'public',
    'media',
    'certificate-background.webp',
  ),
  path.join(
    process.cwd(),
    'public',
    'media',
    'Certificate background.webp',
  ),
]

const NAME_FONT = path.join(
  process.cwd(),
  'node_modules',
  'dejavu-fonts-ttf',
  'ttf',
  'DejaVuSerif-Italic.ttf',
)

const BODY_FONT = path.join(
  process.cwd(),
  'node_modules',
  'dejavu-fonts-ttf',
  'ttf',
  'DejaVuSans.ttf',
)

const IMAGE_WIDTH = 1500
const IMAGE_HEIGHT = 1060
const PAGE_WIDTH = (IMAGE_WIDTH * 72) / 96
const PAGE_HEIGHT = (IMAGE_HEIGHT * 72) / 96

const GOLD = '#C4A035'
const BODY_COLOR = '#3F3F46'

export type CertificatePdfInput = {
  studentName: string
  description: string
}

function fitFontSize(
  doc: PDFKit.PDFDocument,
  text: string,
  fontPath: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
): number {
  let size = startSize
  while (size >= minSize) {
    doc.font(fontPath).fontSize(size)
    if (doc.widthOfString(text) <= maxWidth) return size
    size -= 2
  }
  return minSize
}

async function resolveReadablePath(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await fs.promises.access(candidate, fs.constants.R_OK)
      return candidate
    } catch {
      /* try next */
    }
  }
  return null
}

async function loadBackgroundBuffer(): Promise<Buffer> {
  const backgroundPath = await resolveReadablePath(CERTIFICATE_BACKGROUND_CANDIDATES)
  if (!backgroundPath) {
    throw new Error(
      `Certificate background missing. Tried: ${CERTIFICATE_BACKGROUND_CANDIDATES.join(' | ')}`,
    )
  }

  try {
    await fs.promises.access(NAME_FONT, fs.constants.R_OK)
    await fs.promises.access(BODY_FONT, fs.constants.R_OK)
  } catch {
    throw new Error(
      'Certificate fonts missing (dejavu-fonts-ttf). Run pnpm install.',
    )
  }

  const source = await fs.promises.readFile(backgroundPath)
  return sharp(source).jpeg({ quality: 95 }).toBuffer()
}

export function buildCertificateDescription(
  courseTitle: string,
  level?: string,
  summary?: string | null,
): string {
  const summaryText =
    typeof summary === 'string' ? summary.trim() : ''
  if (summaryText) return summaryText

  const levelLabels: Record<string, string> = {
    all: 'All Levels',
    beginner: 'Beginner Level',
    intermediate: 'Intermediate Level',
    advanced: 'Advanced Level',
  }

  const levelLabel = levelLabels[level || 'all'] || 'All Levels'
  const field = (courseTitle || '').trim() || 'this program'

  return `He/ she has successfully completed ${levelLabel} in the field of ${field}, demonstrating strong communication skills, pronunciation, and fluency. He/ she is competent and confident in practical English conversation, presentations, and daily communication.`
}

export async function generateCertificatePdf(
  input: CertificatePdfInput,
): Promise<Buffer> {
  const backgroundBuffer = await loadBackgroundBuffer()
  const contentWidth = PAGE_WIDTH * 0.76
  const contentX = (PAGE_WIDTH - contentWidth) / 2
  const nameY = PAGE_HEIGHT * 0.49
  const descriptionY = PAGE_HEIGHT * 0.585

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      margin: 0,
      autoFirstPage: true,
    })

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.image(backgroundBuffer, 0, 0, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
    })

    const nameFontSize = fitFontSize(
      doc,
      input.studentName,
      NAME_FONT,
      contentWidth,
      52,
      30,
    )

    doc
      .font(NAME_FONT)
      .fontSize(nameFontSize)
      .fillColor(GOLD)
      .text(input.studentName, 0, nameY, {
        width: PAGE_WIDTH,
        align: 'center',
      })

    doc
      .font(BODY_FONT)
      .fontSize(11)
      .fillColor(BODY_COLOR)
      .text(input.description, contentX, descriptionY, {
        width: contentWidth,
        align: 'center',
        lineGap: 3,
      })

    doc.end()
  })
}
