import { NextResponse } from 'next/server'
import { runDailyAlerts } from '@/lib/automation/cron/dailyAlerts'
import { authorizeCronRequest } from '@/lib/automation/cron/auth'
import { throttleRequest } from '@/lib/middleware/requestThrottle'

// This endpoint can be triggered by:
// 1. Vercel Cron (add to vercel.json)
// 2. External cron service (e.g., cron-job.org)
// 3. Manual trigger for testing

export async function GET(request: Request) {
  const throttle = throttleRequest(request, {
    keyPrefix: 'cron:daily-alerts',
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

  try {
    await runDailyAlerts()
    return NextResponse.json({
      success: true,
      message: 'Daily alerts processed',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Daily alerts cron error:', error)
    return NextResponse.json(
      { error: 'Failed to process daily alerts' },
      { status: 500 }
    )
  }
}

// POST also supported for webhook triggers
export async function POST(request: Request) {
  return GET(request)
}
