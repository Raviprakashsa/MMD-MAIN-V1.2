import { NextResponse } from 'next/server'
import { runReportSchedules } from '@/lib/automation/cron/reportSchedules'
import { authorizeCronRequest } from '@/lib/automation/cron/auth'
import { throttleRequest } from '@/lib/middleware/requestThrottle'

export async function GET(request: Request) {
  const throttle = throttleRequest(request, {
    keyPrefix: 'cron:report-schedules',
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
  const limitParam = Number.parseInt(url.searchParams.get('limit') || '25', 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 25

  try {
    const summary = await runReportSchedules(limit)
    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Report schedules cron error:', error)
    return NextResponse.json(
      { error: 'Failed to execute report schedules' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
