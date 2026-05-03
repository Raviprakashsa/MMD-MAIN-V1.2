import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import { ApiKeyService, CreateApiKeySchema } from '@/lib/services/api-key.service'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const includeRevoked = new URL(request.url).searchParams.get('includeRevoked') === 'true'

  try {
    const data = await ApiKeyService.list(
      { id: session.user.id, role: session.user.role },
      { includeRevoked }
    )

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  try {
    const payload = CreateApiKeySchema.parse(body)

    const data = await ApiKeyService.create(
      { id: session.user.id, role: session.user.role },
      payload
    )

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Validation failed' }, { status: 400 })
    }

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
