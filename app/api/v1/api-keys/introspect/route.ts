import { NextResponse } from 'next/server'
import { AppError } from '@/lib/core/app-error'
import { authenticateApiKeyRequest } from '@/lib/auth/api-key'

export async function GET(request: Request) {
  try {
    const context = await authenticateApiKeyRequest(request)

    return NextResponse.json({
      ok: true,
      data: {
        keyId: context.keyId,
        name: context.name,
        scopes: context.scopes,
        createdBy: context.createdBy,
      },
    })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json({ error: 'Failed to introspect API key' }, { status: 500 })
  }
}
