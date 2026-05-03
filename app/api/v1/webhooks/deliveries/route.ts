import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import {
  ListWebhookDeliveriesSchema,
  QueueWebhookEventSchema,
  WebhookService,
} from '@/lib/services/webhook.service'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = new URL(request.url).searchParams
  const payload = {
    webhookId: searchParams.get('webhookId') || undefined,
    event: searchParams.get('event') || undefined,
    status: searchParams.get('status') || undefined,
    limit: searchParams.get('limit') ? Number.parseInt(searchParams.get('limit') as string, 10) : undefined,
  }

  try {
    const validatedPayload = ListWebhookDeliveriesSchema.parse(payload)

    const data = await WebhookService.listDeliveries(
      { id: session.user.id, role: session.user.role },
      {
        ...validatedPayload,
        limit: validatedPayload.limit ?? 25,
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

    return NextResponse.json({ error: 'Failed to list webhook deliveries' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  try {
    const payload = QueueWebhookEventSchema.parse(body)

    const data = await WebhookService.queueOutboundEvent(
      { id: session.user.id, role: session.user.role },
      {
        ...payload,
        maxAttempts: payload.maxAttempts ?? 3,
      }
    )

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Validation failed' }, { status: 400 })
    }

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    return NextResponse.json({ error: 'Failed to queue webhook event' }, { status: 500 })
  }
}
