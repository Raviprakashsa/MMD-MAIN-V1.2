import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import { DocumentService } from '@/lib/services/document.service'
import {
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_ALLOWED_MIME_TYPES,
  toBuffer,
  validateUploadFile,
} from '@/lib/storage/document-storage'
import { DocumentEntitySchema } from '@/lib/validators/common'

export const runtime = 'nodejs'

const UploadDocumentRequestSchema = z.object({
  entityType: DocumentEntitySchema,
  entityId: z.string().min(1),
  name: z.string().trim().min(1).max(160).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  tags: z.string().optional(),
})

function extractNameFromFile(fileName: string): string {
  return fileName.replace(/\.[a-zA-Z0-9]+$/, '') || fileName
}

function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode })
  }

  return NextResponse.json(
    { error: 'Failed to upload document' },
    { status: 500 }
  )
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const parsed = UploadDocumentRequestSchema.safeParse({
      entityType: formData.get('entityType'),
      entityId: formData.get('entityId'),
      name: formData.get('name'),
      category: formData.get('category'),
      tags: formData.get('tags'),
    })

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || 'Invalid payload' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Document file is required' }, { status: 400 })
    }

    const validatedFile = validateUploadFile(file, {
      allowedMimeTypes: DOCUMENT_ALLOWED_MIME_TYPES,
      allowedExtensions: DOCUMENT_ALLOWED_EXTENSIONS,
    })

    const tags = parsed.data.tags
      ? parsed.data.tags.split(',').map((item) => item.trim()).filter(Boolean)
      : []

    const documentName = parsed.data.name || extractNameFromFile(validatedFile.fileName)
    const fileBuffer = await toBuffer(file)

    const doc = await DocumentService.uploadManaged(
      {
        id: session.user.id,
        role: session.user.role,
      },
      {
        entityType: parsed.data.entityType,
        entityId: parsed.data.entityId,
        name: documentName,
        category: parsed.data.category,
        tags,
        fileName: validatedFile.fileName,
        mimeType: validatedFile.mimeType,
        sizeBytes: validatedFile.sizeBytes,
        fileBuffer,
      }
    )

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
