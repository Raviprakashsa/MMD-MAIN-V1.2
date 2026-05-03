import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import { DocumentService } from '@/lib/services/document.service'
import { readStoredFile, verifyDocumentDownloadSignature } from '@/lib/storage/document-storage'

export const runtime = 'nodejs'

function sanitizeDownloadFileName(fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
  const collapsed = safe.replace(/-+/g, '-')
  return collapsed || 'document'
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
    { error: 'Failed to download document' },
    { status: 500 }
  )
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const expiresRaw = searchParams.get('expires')
    const signature = searchParams.get('signature')

    if (!expiresRaw || !signature) {
      return NextResponse.json({ error: 'Missing download signature' }, { status: 401 })
    }

    const expiresAt = Number.parseInt(expiresRaw, 10)
    if (!Number.isInteger(expiresAt)) {
      return NextResponse.json({ error: 'Invalid download signature' }, { status: 401 })
    }

    const isValidSignature = verifyDocumentDownloadSignature({
      documentId: id,
      expiresAt,
      signature,
    })

    if (!isValidSignature) {
      return NextResponse.json({ error: 'Invalid or expired download signature' }, { status: 401 })
    }

    const payload = await DocumentService.getDownloadPayload(
      {
        id: session.user.id,
        role: session.user.role,
      },
      id
    )

    if (payload.storageKey) {
      const fileBuffer = await readStoredFile(payload.storageKey)
      const fileName = payload.fileName || 'document'
      const body = new Uint8Array(fileBuffer)

      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': payload.mimeType || 'application/octet-stream',
          'Content-Length': String(body.byteLength),
          'Content-Disposition': toContentDisposition(fileName),
          'Cache-Control': 'private, max-age=120',
        },
      })
    }

    if (payload.redirectUrl) {
      return NextResponse.redirect(payload.redirectUrl)
    }

    return NextResponse.json({ error: 'Document file not found' }, { status: 404 })
  } catch (error) {
    return toErrorResponse(error)
  }
}
