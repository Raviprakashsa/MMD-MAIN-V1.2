import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import { WebhookService } from '@/lib/services/webhook.service'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params

    const data = await WebhookService.retryDelivery(
      { id: session.user.id, role: session.user.role },
      { id }
    )

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json({ error: 'Failed to retry webhook delivery' }, { status: 500 })
  }
}
