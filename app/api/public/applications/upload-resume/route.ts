import { NextResponse } from 'next/server'
import { z } from 'zod'

import connectDB from '@/lib/db/mongodb'
import ApplicationForm from '@/lib/db/models/ApplicationForm'
import Requirement from '@/lib/db/models/Requirement'
import { AppError } from '@/lib/core/app-error'
import { throttleRequest } from '@/lib/middleware/requestThrottle'
import {
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_ALLOWED_MIME_TYPES,
  storeUploadFile,
  toBuffer,
  validateUploadFile,
} from '@/lib/storage/document-storage'

export const runtime = 'nodejs'

const UploadResumeSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid application link'),
})

const CLOSED_STATUSES = ['CLOSED_HIRED', 'CLOSED_NOT_HIRED', 'ON_HOLD'] as const
const ACCEPTING_STATUSES = ['ACTIVE', 'SOURCING'] as const

function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  return NextResponse.json(
    { error: 'Failed to upload resume file' },
    { status: 500 }
  )
}

export async function POST(request: Request) {
  try {
    const throttle = throttleRequest(request, {
      keyPrefix: 'public:applications:upload-resume',
      limit: 12,
      windowMs: 60_000,
    })

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'Too many upload attempts. Please retry shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(throttle.retryAfterSeconds),
          },
        }
      )
    }

    const formData = await request.formData()
    const parsed = UploadResumeSchema.safeParse({
      slug: formData.get('slug'),
    })

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid payload' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Resume file is required' }, { status: 400 })
    }

    const validatedFile = validateUploadFile(file, {
      allowedMimeTypes: RESUME_ALLOWED_MIME_TYPES,
      allowedExtensions: RESUME_ALLOWED_EXTENSIONS,
    })

    await connectDB()

    const shareableUrl = `/apply/${parsed.data.slug}`
    const appForm = await ApplicationForm.findOne({ shareableUrl, isActive: true }).select('requirementId').lean()
    if (!appForm) {
      throw new AppError('Form not found or inactive', 404)
    }

    const requirement = await Requirement.findById(appForm.requirementId).select('status').lean()
    if (!requirement) {
      throw new AppError('Requirement not found', 404)
    }

    if (CLOSED_STATUSES.includes(requirement.status as (typeof CLOSED_STATUSES)[number])) {
      throw new AppError('This position is closed or on hold', 400)
    }

    if (!ACCEPTING_STATUSES.includes(requirement.status as (typeof ACCEPTING_STATUSES)[number])) {
      throw new AppError('Applications are not accepted for this status', 400)
    }

    const buffer = await toBuffer(file)
    const stored = await storeUploadFile({
      namespace: `application-${parsed.data.slug}`,
      fileName: validatedFile.fileName,
      mimeType: validatedFile.mimeType,
      buffer,
    })

    return NextResponse.json(
      {
        storageKey: stored.storageKey,
        fileName: stored.fileName,
        mimeType: stored.mimeType,
        sizeBytes: stored.sizeBytes,
      },
      { status: 201 }
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}
