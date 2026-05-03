import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { AppError, NotFoundError } from '@/lib/core/app-error'

const UPLOAD_ROOT = path.join(process.cwd(), '.storage', 'uploads')
const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
const DEFAULT_DOWNLOAD_URL_TTL_SECONDS = 15 * 60
const MAX_DOWNLOAD_URL_TTL_SECONDS = 24 * 60 * 60

export const RESUME_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const

export const RESUME_ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'] as const

export const DOCUMENT_ALLOWED_MIME_TYPES = [
  ...RESUME_ALLOWED_MIME_TYPES,
  'image/png',
  'image/jpeg',
  'text/plain',
] as const

export const DOCUMENT_ALLOWED_EXTENSIONS = [...RESUME_ALLOWED_EXTENSIONS, '.png', '.jpg', '.jpeg', '.txt'] as const

interface UploadValidationConfig {
  allowedMimeTypes: readonly string[]
  allowedExtensions: readonly string[]
  maxBytes?: number
}

export interface UploadFileMetadata {
  fileName: string
  mimeType: string
  sizeBytes: number
}

interface StoreUploadFileInput {
  namespace: string
  fileName: string
  mimeType: string
  buffer: Buffer
}

export interface StoreUploadFileResult {
  storageKey: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

interface DownloadSignaturePayload {
  documentId: string
  expiresAt: number
  signature: string
}

function sanitizePathSegment(segment: string): string {
  const trimmed = segment.trim()
  const normalized = trimmed.replace(/[^a-zA-Z0-9_-]/g, '-')
  const collapsed = normalized.replace(/-+/g, '-')
  return collapsed || 'file'
}

function sanitizeFileName(fileName: string): string {
  const baseName = path.basename(fileName || 'file')
  const normalized = baseName.replace(/[^a-zA-Z0-9._-]/g, '-')
  const collapsed = normalized.replace(/-+/g, '-')
  return collapsed || 'file'
}

function sanitizeStorageKey(storageKey: string): string {
  const cleaned = storageKey
    .split(/[\\/]+/)
    .map((segment) => sanitizePathSegment(segment))
    .filter(Boolean)

  if (cleaned.length === 0) {
    throw new AppError('Invalid storage key', 400)
  }

  return cleaned.join(path.sep)
}

function resolveStoragePath(storageKey: string): string {
  const safeKey = sanitizeStorageKey(storageKey)
  const rootPath = path.resolve(UPLOAD_ROOT)
  const resolvedPath = path.resolve(rootPath, safeKey)

  if (!resolvedPath.startsWith(`${rootPath}${path.sep}`) && resolvedPath !== rootPath) {
    throw new AppError('Invalid storage path', 400)
  }

  return resolvedPath
}

function getUploadSigningSecret(): string {
  const secret = process.env.DOCUMENT_DOWNLOAD_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return 'development-document-download-secret'
    }
    throw new AppError('Document download secret is not configured', 500)
  }
  return secret
}

function computeDownloadSignature(documentId: string, expiresAt: number): string {
  const payload = `${documentId}:${expiresAt}`
  return createHmac('sha256', getUploadSigningSecret()).update(payload).digest('hex')
}

function normalizeExtension(fileName: string): string {
  return path.extname(fileName || '').toLowerCase()
}

function normalizeMimeType(mimeType: string): string {
  return (mimeType || '').toLowerCase().trim()
}

export function validateUploadFile(file: File, config: UploadValidationConfig): UploadFileMetadata {
  if (!(file instanceof File)) {
    throw new AppError('File is required', 400)
  }

  if (file.size <= 0) {
    throw new AppError('File is empty', 400)
  }

  const maxBytes = config.maxBytes ?? DEFAULT_MAX_UPLOAD_SIZE_BYTES
  if (file.size > maxBytes) {
    throw new AppError(`File exceeds size limit of ${Math.floor(maxBytes / (1024 * 1024))}MB`, 400)
  }

  const fileName = sanitizeFileName(file.name)
  const extension = normalizeExtension(fileName)
  const mimeType = normalizeMimeType(file.type)

  const allowedExtensions = new Set(config.allowedExtensions.map((item) => item.toLowerCase()))
  const allowedMimeTypes = new Set(config.allowedMimeTypes.map((item) => item.toLowerCase()))

  if (!allowedExtensions.has(extension)) {
    throw new AppError('Unsupported file extension', 400)
  }

  if (mimeType && !allowedMimeTypes.has(mimeType)) {
    throw new AppError('Unsupported file type', 400)
  }

  return {
    fileName,
    mimeType: mimeType || 'application/octet-stream',
    sizeBytes: file.size,
  }
}

export async function toBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function storeUploadFile(input: StoreUploadFileInput): Promise<StoreUploadFileResult> {
  const namespace = sanitizePathSegment(input.namespace)
  const fileName = sanitizeFileName(input.fileName)
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const safeFileName = `${randomUUID()}-${fileName}`
  const storageKey = path.posix.join(namespace, year, month, safeFileName)

  const absolutePath = resolveStoragePath(storageKey)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, input.buffer)

  return {
    storageKey,
    fileName,
    mimeType: input.mimeType,
    sizeBytes: input.buffer.byteLength,
  }
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  const absolutePath = resolveStoragePath(storageKey)

  try {
    return await fs.readFile(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new NotFoundError('Stored file not found')
    }
    throw error
  }
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const absolutePath = resolveStoragePath(storageKey)

  try {
    await fs.unlink(absolutePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}

export function buildDocumentDownloadPath(documentId: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + DEFAULT_DOWNLOAD_URL_TTL_SECONDS
  const signature = computeDownloadSignature(documentId, expiresAt)
  return `/api/documents/${encodeURIComponent(documentId)}/download?expires=${expiresAt}&signature=${signature}`
}

export function verifyDocumentDownloadSignature(payload: DownloadSignaturePayload): boolean {
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isInteger(payload.expiresAt) || payload.expiresAt <= now) {
    return false
  }

  if (payload.expiresAt > now + MAX_DOWNLOAD_URL_TTL_SECONDS) {
    return false
  }

  if (!/^[a-f0-9]{64}$/i.test(payload.signature)) {
    return false
  }

  const expected = computeDownloadSignature(payload.documentId, payload.expiresAt)
  const expectedBuffer = Buffer.from(expected, 'hex')
  const providedBuffer = Buffer.from(payload.signature, 'hex')

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return timingSafeEqual(expectedBuffer, providedBuffer)
}
