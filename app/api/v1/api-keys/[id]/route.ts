import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import { ApiKeyService } from '@/lib/services/api-key.service'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params

    const data = await ApiKeyService.revoke(
      { id: session.user.id, role: session.user.role },
      { id }
    )

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
