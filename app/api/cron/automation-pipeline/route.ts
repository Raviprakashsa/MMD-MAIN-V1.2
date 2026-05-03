import { NextResponse } from 'next/server'
import { authorizeCronRequest } from '@/lib/automation/cron/auth'
import { runRealtimeAutomationPipeline } from '@/lib/automation/cron/realtimePipeline'
import { throttleRequest } from '@/lib/middleware/requestThrottle'

function clampLimit(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, 100)
}

export async function GET(request: Request) {
  const throttle = throttleRequest(request, {
    keyPrefix: 'cron:automation-pipeline',
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
  const externalSourceLimit = clampLimit(url.searchParams.get('externalSourceLimit'), 10)
  const externalRequestTimeoutMs = clampLimit(url.searchParams.get('externalTimeoutMs'), 6) * 1000
  const reportScheduleLimit = clampLimit(url.searchParams.get('reportLimit'), 25)
  const exportJobLimit = clampLimit(url.searchParams.get('exportLimit'), 15)
  const webhookDeliveryLimit = clampLimit(url.searchParams.get('webhookLimit'), 25)

  try {
    const data = await runRealtimeAutomationPipeline(
      externalSourceLimit,
      externalRequestTimeoutMs,
      reportScheduleLimit,
      exportJobLimit,
      webhookDeliveryLimit
    )

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Automation pipeline execution failed'

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
