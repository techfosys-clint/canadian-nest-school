import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs/promises'
import path from 'path'

export const isS3Configured = !!(
  process.env.S3_ENDPOINT &&
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY
)

let s3Client: S3Client | null = null
if (isS3Configured) {
  s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: 'auto',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  })
}

/**
 * Uploads a file buffer either to Cloudflare R2/S3 or local VPS storage.
 */
export async function uploadToStorage(
  buffer: Buffer,
  filename: string,
  folder: 'media' | 'study-materials' | 'ebooks',
  mimeType?: string
): Promise<string> {
  if (isS3Configured && s3Client) {
    const key = `${folder}/${filename}`
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      })
    )
    if (folder === 'ebooks') return filename
    if (folder === 'study-materials') {
      return `/api/study-materials/download?file=${filename}`
    } else {
      return `/media/${filename}`
    }
  } else {
    // Local VPS filesystem storage
    const targetFolder = folder === 'media' ? path.join(process.cwd(), 'public', 'media') : path.join(process.cwd(), 'storage', folder)
    await fs.mkdir(targetFolder, { recursive: true })
    const filePath = path.join(targetFolder, filename)
    await fs.writeFile(filePath, buffer)
    
    if (folder === 'ebooks') return filename
    if (folder === 'study-materials') {
      return `/api/study-materials/download?file=${filename}`
    } else {
      return `/media/${filename}`
    }
  }
}

/**
 * Retrieves a file either from Cloudflare R2/S3 or local VPS storage.
 */
export async function getFromStorage(
  filename: string,
  folder: 'media' | 'study-materials' | 'ebooks'
): Promise<{ buffer: Buffer; contentType?: string } | null> {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) return null
  if (isS3Configured && s3Client) {
    const key = `${folder}/${filename}`
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: key,
        })
      )
      if (!response.Body) return null
      const bytes = await response.Body.transformToByteArray()
      return {
        buffer: Buffer.from(bytes),
        contentType: response.ContentType,
      }
    } catch (e) {
      console.warn(`S3 file get failed for key ${key}, maybe not uploaded to R2 yet:`, e)
      return null
    }
  } else {
    // Local filesystem read
    const targetFolder = folder === 'media' ? path.join(process.cwd(), 'public', 'media') : path.join(process.cwd(), 'storage', folder)
    const filePath = path.join(targetFolder, filename)
    try {
      await fs.access(filePath)
      const buffer = await fs.readFile(filePath)
      return { buffer }
    } catch {
      return null
    }
  }
}
