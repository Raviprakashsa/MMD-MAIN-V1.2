import { NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/automation/cron/auth'
import { runWebhookDeliveries } from '@/lib/automation/cron/webhookDeliveries'
import { throttleRequest } from '@/lib/middleware/requestThrottle'

export async function GET(request: Request) {
  const throttle = throttleRequest(request, {
    keyPrefix: 'cron:webhook-deliveries',
    limit: 20,
    windowMs: 60_000,
  })

  if (!throttle.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(throttle.retryAfterSeconds),
        },
      }
    )
  }

  const authResult = authorizeCronRequest(request)
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const url = new URL(request.url)
  const limitParam = Number.parseInt(url.searchParams.get('limit') || '', 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 15

  try {
    const summary = await runWebhookDeliveries(limit)

    return NextResponse.json({
      success: true,
      limit,
      ...summary,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Webhook delivery run failed'

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
