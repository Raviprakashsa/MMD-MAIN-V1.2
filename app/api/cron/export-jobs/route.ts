import { NextResponse } from 'next/server'
import { runExportJobs } from '@/lib/automation/cron/exportJobs'
import { authorizeCronRequest } from '@/lib/automation/cron/auth'
import { throttleRequest } from '@/lib/middleware/requestThrottle'

export async function GET(request: Request) {
  const throttle = throttleRequest(request, {
    keyPrefix: 'cron:export-jobs',
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
  const limitParam = Number.parseInt(url.searchParams.get('limit') || '10', 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 25) : 10

  try {
    const summary = await runExportJobs(limit)
    return NextResponse.json({
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Export jobs cron error:', error)
    return NextResponse.json(
      { error: 'Failed to process export jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}
