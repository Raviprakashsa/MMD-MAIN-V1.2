import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import { ProcessWebhookDeliveriesSchema, WebhookService } from '@/lib/services/webhook.service'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  try {
    const payload = ProcessWebhookDeliveriesSchema.parse(body)

    const data = await WebhookService.processPendingDeliveries(
      { id: session.user.id, role: session.user.role },
      {
        ...payload,
        limit: payload.limit ?? 15,
      }
    )

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Validation failed' }, { status: 400 })
    }

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json({ error: 'Failed to process webhook deliveries' }, { status: 500 })
  }
}
