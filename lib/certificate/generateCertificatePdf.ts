import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

/** Prefer assets/ (not volume-mounted). Fallbacks cover local/legacy paths. */
const CERTIFICATE_BACKGROUND_CANDIDATES = [
  path.join(
    process.cwd(),
    'assets',
    'certificates',
    'certificate-background.webp',
  ),
  path.join(process.cwd(), 'public', 'media', 'certificate-background.webp'),
];

const NAME_FONT = path.join(
  process.cwd(),
  'node_modules',
  'dejavu-fonts-ttf',
  'ttf',
  'DejaVuSerif-Italic.ttf',
);

const BODY_FONT = path.join(
  process.cwd(),
  'node_modules',
  'dejavu-fonts-ttf',
  'ttf',
  'DejaVuSans.ttf',
);

const IMAGE_WIDTH = 1500;
const IMAGE_HEIGHT = 1060;
const PAGE_WIDTH = (IMAGE_WIDTH * 72) / 96;
const PAGE_HEIGHT = (IMAGE_HEIGHT * 72) / 96;

const GOLD = '#C4A035';
const BODY_COLOR = '#3F3F46';

export type CertificatePdfInput = {
  studentName: string;
  description: string;
};

function fitFontSize(
  doc: PDFKit.PDFDocument,
  text: string,
  fontPath: string,
  maxWidth: number,
  startSize: number,
  minSize: number,
): number {
  let size = startSize;
  while (size >= minSize) {
    doc.font(fontPath).fontSize(size);
    if (doc.widthOfString(text) <= maxWidth) return size;
    size -= 2;
  }
  return minSize;
}

async function resolveReadablePath(
  candidates: string[],
): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await fs.promises.access(candidate, fs.constants.R_OK);
      return candidate;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function loadBackgroundBuffer(): Promise<Buffer> {
  const backgroundPath = await resolveReadablePath(
    CERTIFICATE_BACKGROUND_CANDIDATES,
  );
  if (!backgroundPath) {
    throw new Error(
      `Certificate background missing. Tried: ${CERTIFICATE_BACKGROUND_CANDIDATES.join(' | ')}`,
    );
  }

  try {
    await fs.promises.access(NAME_FONT, fs.constants.R_OK);
    await fs.promises.access(BODY_FONT, fs.constants.R_OK);
  } catch {
    throw new Error(
      'Certificate fonts missing (dejavu-fonts-ttf). Run pnpm install.',
    );
  }

  const source = await fs.promises.readFile(backgroundPath);
  return sharp(source).jpeg({ quality: 95 }).toBuffer();
}

export function formatCertificateDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Fixed certificate body text under the student name. */
export function buildCertificateDescription(
  courseTitle: string,
  completionDate?: Date | string | null,
): string {
  const courseName = (courseTitle || '').trim() || 'this';
  const awardedOn =
    completionDate instanceof Date
      ? formatCertificateDate(completionDate)
      : typeof completionDate === 'string' && completionDate.trim()
        ? completionDate.trim()
        : formatCertificateDate(new Date());

  return (
    `For successfully completing the ${courseName} program. ` +
    `This certificate recognizes their exceptional dedication, continuous skill development, ` +
    `and strong commitment to learning in accordance with international educational standards.\n\n` +
    `Awarded on this day, ${awardedOn}`
  );
}

export async function generateCertificatePdf(
  input: CertificatePdfInput,
): Promise<Buffer> {
  const backgroundBuffer = await loadBackgroundBuffer();
  const contentWidth = PAGE_WIDTH * 0.76;
  const contentX = (PAGE_WIDTH - contentWidth) / 2;
  const nameY = PAGE_HEIGHT * 0.49;
  const descriptionY = PAGE_HEIGHT * 0.585;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      margin: 0,
      autoFirstPage: true,
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.image(backgroundBuffer, 0, 0, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
    });

    const nameFontSize = fitFontSize(
      doc,
      input.studentName,
      NAME_FONT,
      contentWidth,
      52,
      30,
    );

    doc
      .font(NAME_FONT)
      .fontSize(nameFontSize)
      .fillColor(GOLD)
      .text(input.studentName, 0, nameY, {
        width: PAGE_WIDTH,
        align: 'center',
      });

    doc
      .font(BODY_FONT)
      .fontSize(11)
      .fillColor(BODY_COLOR)
      .text(input.description, contentX, descriptionY, {
        width: contentWidth,
        align: 'center',
        lineGap: 3,
      });

    doc.end();
  });
}
