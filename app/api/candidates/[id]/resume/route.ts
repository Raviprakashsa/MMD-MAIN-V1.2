import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { AppError, NotFoundError } from '@/lib/core/app-error'
import connectDB from '@/lib/db/mongodb'
import Candidate from '@/lib/db/models/Candidate'
import { readStoredFile } from '@/lib/storage/document-storage'

export const runtime = 'nodejs'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER'] as const

interface CandidateResumeProjection {
  _id: { toString: () => string }
  resumeStorageKey?: string
  resumeMimeType?: string
  resumeFileName?: string
  resumeUrl?: string
}

function hasAccessRole(role: string): boolean {
  return ALLOWED_ROLES.some((allowedRole) => allowedRole === role)
}

function sanitizeDownloadFileName(fileName: string): string {
  const normalized = fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
  const collapsed = normalized.replace(/-+/g, '-')
  return collapsed || 'resume'
}

function toContentDisposition(fileName: string): string {
  const sanitized = sanitizeDownloadFileName(fileName)
  const encoded = encodeURIComponent(sanitized)
  return `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`
}

function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  return NextResponse.json(
    { error: 'Failed to download candidate resume' },
    { status: 500 }
  )
}

export async function GET(
  _: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!hasAccessRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await context.params

    await connectDB()
    const candidate = await Candidate.findOne({ _id: id, deletedAt: null })
      .select('resumeStorageKey resumeMimeType resumeFileName resumeUrl')
      .lean() as CandidateResumeProjection | null

    if (!candidate) {
      throw new NotFoundError('Candidate not found')
    }

    if (candidate.resumeStorageKey) {
      const fileBuffer = await readStoredFile(candidate.resumeStorageKey)
      const fileName = candidate.resumeFileName || 'resume'
      const mimeType = candidate.resumeMimeType || 'application/octet-stream'
      const body = new Uint8Array(fileBuffer)

      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(body.byteLength),
          'Content-Disposition': toContentDisposition(fileName),
          'Cache-Control': 'private, max-age=120',
        },
      })
    }

    if (candidate.resumeUrl && /^https?:\/\//i.test(candidate.resumeUrl)) {
      return NextResponse.redirect(candidate.resumeUrl)
    }

    throw new NotFoundError('Resume file not found')
  } catch (error) {
    return toErrorResponse(error)
  }
}
