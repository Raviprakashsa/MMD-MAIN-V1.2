import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { auth } from '@/lib/auth'
import { AppError } from '@/lib/core/app-error'
import connectDB from '@/lib/db/mongodb'
import WebhookDelivery from '@/lib/db/models/WebhookDelivery'
import ExportJob from '@/lib/db/models/ExportJob'
import ReportSchedule from '@/lib/db/models/ReportSchedule'
import IntegrationConfig from '@/lib/db/models/IntegrationConfig'
import AutomationPipelineRun from '@/lib/db/models/AutomationPipelineRun'
import { AutomationPipelineService, RunAutomationPipelineSchema } from '@/lib/services/automation-pipeline.service'

type StageHealth = 'healthy' | 'warning' | 'critical'

type CountByStatus = Record<string, number>

interface PipelineStage {
  id: string
  name: string
  health: StageHealth
  queueDepth: number
  latencyMs: number
}

interface FailurePulse {
  id: number
  x: number
  y: number
  intensity: number
}

const MINUTE_MS = 60_000

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function deterministicNoise(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

function toKey(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function toMinuteDates(count: number): Date[] {
  const now = new Date()
  now.setSeconds(0, 0)

  return Array.from({ length: count }, (_, idx) => new Date(now.getTime() - (count - idx - 1) * MINUTE_MS))
}

function toTimelineLabels(dates: Date[]): string[] {
  return dates.map((date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  )
}

function sumSeries(a: number[], b: number[]): number[] {
  return a.map((value, idx) => value + (b[idx] ?? 0))
}

function scaleSeries(values: number[], baselineMax: number): number[] {
  const maxValue = Math.max(baselineMax, ...values, 1)
  return values.map((value) => clamp(0, Math.round((value / maxValue) * 100), 100))
}

function classifyHealth(queueDepth: number, latencyMs: number): StageHealth {
  if (queueDepth > 60 || latencyMs > 700) return 'critical'
  if (queueDepth > 30 || latencyMs > 420) return 'warning'
  return 'healthy'
}

function ageMinutes(value: Date | null | undefined): number {
  if (!value) return 0
  const diff = Date.now() - value.getTime()
  return clamp(0, Math.round(diff / MINUTE_MS), 9_999)
}

async function countByStatus(model: typeof WebhookDelivery | typeof ExportJob): Promise<CountByStatus> {
  const rows = await model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  const result: CountByStatus = {}

  for (const row of rows as Array<{ _id: string; count: number }>) {
    result[row._id] = row.count
  }

  return result
}

async function countByMinute(
  model: typeof WebhookDelivery | typeof ExportJob | typeof ReportSchedule,
  field: string,
  minutes: number,
  extraMatch: Record<string, unknown> = {}
): Promise<number[]> {
  const dates = toMinuteDates(minutes)
  const start = dates[0]
  const keys = dates.map(toKey)

  const rows = await model.aggregate([
    {
      $match: {
        ...extraMatch,
        [field]: { $gte: start },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%dT%H:%M',
            date: `$${field}`,
            timezone: 'UTC',
          },
        },
        count: { $sum: 1 },
      },
    },
  ])

  const rowMap = new Map((rows as Array<{ _id: string; count: number }>).map((row) => [row._id, row.count]))

  return keys.map((key) => rowMap.get(key) ?? 0)
}

function buildQueueTrend(created: number[], resolved: number[], currentQueue: number): number[] {
  const net = created.reduce((sum, value, idx) => sum + value - (resolved[idx] ?? 0), 0)
  let running = Math.max(0, currentQueue - net)

  return created.map((value, idx) => {
    running = Math.max(0, running + value - (resolved[idx] ?? 0))
    return running
  })
}

function makeFailurePulses(notifyPressure: number, dispatchPressureSeries: number[]): FailurePulse[] {
  const latestDispatch = dispatchPressureSeries[dispatchPressureSeries.length - 1] ?? 0
  const normalizedNotify = clamp(0, notifyPressure / 100, 1)
  const normalizedDispatch = clamp(0, latestDispatch / 100, 1)

  return Array.from({ length: 18 }, (_, index) => {
    const x = 8 + (index % 6) * 18
    const y = 15 + Math.floor(index / 6) * 28
    const noise = deterministicNoise(index + latestDispatch * 0.31 + notifyPressure * 0.17)
    const intensity = clamp(0.08, normalizedNotify * 0.6 + normalizedDispatch * 0.3 + noise * 0.35, 1)

    return {
      id: index,
      x,
      y,
      intensity: Number(intensity.toFixed(4)),
    }
  })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await connectDB()

    const [
      webhookByStatus,
      exportByStatus,
      reportDue,
      reportDeadLetter,
      reportStaleLocks,
      activeExternalSources,
      latestPipelineRun,
      oldestWebhookQueued,
      oldestExportQueued,
      oldestReportDue,
      webhookDelivered24,
      exportCompleted24,
      reportRuns24,
      webhookCreated12,
      webhookResolved12,
      webhookFailed12,
      exportCreated12,
      exportResolved12,
      exportFailed12,
    ] = await Promise.all([
      countByStatus(WebhookDelivery),
      countByStatus(ExportJob),
      ReportSchedule.countDocuments({ isActive: true, deadLetteredAt: null, nextRunAt: { $lte: new Date() } }),
      ReportSchedule.countDocuments({ deadLetteredAt: { $ne: null } }),
      ReportSchedule.countDocuments({
        isActive: true,
        processingStartedAt: { $lte: new Date(Date.now() - 15 * MINUTE_MS) },
      }),
      IntegrationConfig.countDocuments({ isActive: true, provider: { $in: ['JOB_BOARD', 'ATS'] } }),
      AutomationPipelineRun.findOne().sort({ createdAt: -1 }).lean(),
      WebhookDelivery.findOne({ status: { $in: ['PENDING', 'PROCESSING', 'FAILED'] } }).sort({ createdAt: 1 }).select('createdAt').lean(),
      ExportJob.findOne({ status: { $in: ['PENDING', 'PROCESSING', 'FAILED'] } }).sort({ createdAt: 1 }).select('createdAt').lean(),
      ReportSchedule.findOne({ isActive: true, deadLetteredAt: null, nextRunAt: { $lte: new Date() } }).sort({ nextRunAt: 1 }).select('nextRunAt').lean(),
      countByMinute(WebhookDelivery, 'deliveredAt', 24, { deliveredAt: { $ne: null } }),
      countByMinute(ExportJob, 'completedAt', 24, { completedAt: { $ne: null } }),
      countByMinute(ReportSchedule, 'lastRunAt', 24, { lastRunAt: { $ne: null } }),
      countByMinute(WebhookDelivery, 'createdAt', 12),
      countByMinute(WebhookDelivery, 'deliveredAt', 12, { deliveredAt: { $ne: null } }),
      countByMinute(WebhookDelivery, 'updatedAt', 12, { status: { $in: ['FAILED', 'DEAD_LETTER'] } }),
      countByMinute(ExportJob, 'createdAt', 12),
      countByMinute(ExportJob, 'completedAt', 12, { completedAt: { $ne: null } }),
      countByMinute(ExportJob, 'updatedAt', 12, { status: { $in: ['FAILED', 'DEAD_LETTER'] } }),
    ])

    const webhookPending = webhookByStatus.PENDING ?? 0
    const webhookProcessing = webhookByStatus.PROCESSING ?? 0
    const webhookFailed = webhookByStatus.FAILED ?? 0
    const webhookDeadLetter = webhookByStatus.DEAD_LETTER ?? 0

    const exportPending = exportByStatus.PENDING ?? 0
    const exportProcessing = exportByStatus.PROCESSING ?? 0
    const exportFailed = exportByStatus.FAILED ?? 0
    const exportDeadLetter = exportByStatus.DEAD_LETTER ?? 0

    const webhookQueue = webhookPending + webhookProcessing + webhookFailed
    const exportQueue = exportPending + exportProcessing + exportFailed
    const notifyQueue = webhookFailed + webhookDeadLetter + exportFailed + exportDeadLetter + reportDeadLetter

    const oldestWebhookAge = ageMinutes(oldestWebhookQueued?.createdAt)
    const oldestExportAge = ageMinutes(oldestExportQueued?.createdAt)
    const oldestDueAge = ageMinutes(oldestReportDue?.nextRunAt)

    const throughputSeries = sumSeries(sumSeries(webhookDelivered24, exportCompleted24), reportRuns24)
    const throughputAvg =
      throughputSeries.length > 0
        ? Math.round(throughputSeries.reduce((sum, value) => sum + value, 0) / throughputSeries.length)
        : 0

    const ingressCreated12 = sumSeries(webhookCreated12, exportCreated12)
    const resolved12 = sumSeries(sumSeries(webhookResolved12, exportResolved12), reportRuns24.slice(-12))

    const webhookQueueTrend = buildQueueTrend(webhookCreated12, webhookResolved12, webhookQueue)
    const exportQueueTrend = buildQueueTrend(exportCreated12, exportResolved12, exportQueue)
    const dispatchTrend = sumSeries(webhookFailed12, exportFailed12)

    const intakeStageQueue = reportDue + exportPending
    const normalizeStageQueue = exportPending + Math.round(exportProcessing * 0.6)
    const enrichStageQueue = webhookPending + reportStaleLocks
    const matchStageQueue = webhookProcessing + exportProcessing
    const notifyStageQueue = notifyQueue
    const persistStageQueue = Math.max(0, ingressCreated12.reduce((a, b) => a + b, 0) - resolved12.reduce((a, b) => a + b, 0))

    const stages: PipelineStage[] = [
      {
        id: 'intake',
        name: 'Intake',
        queueDepth: intakeStageQueue,
        latencyMs: oldestDueAge * 55 + oldestExportAge * 20,
        health: classifyHealth(intakeStageQueue, oldestDueAge * 55 + oldestExportAge * 20),
      },
      {
        id: 'normalize',
        name: 'Normalize',
        queueDepth: normalizeStageQueue,
        latencyMs: oldestExportAge * 65,
        health: classifyHealth(normalizeStageQueue, oldestExportAge * 65),
      },
      {
        id: 'enrich',
        name: 'Enrich',
        queueDepth: enrichStageQueue,
        latencyMs: oldestWebhookAge * 45 + reportStaleLocks * 22,
        health: classifyHealth(enrichStageQueue, oldestWebhookAge * 45 + reportStaleLocks * 22),
      },
      {
        id: 'match',
        name: 'Match',
        queueDepth: matchStageQueue,
        latencyMs: Math.round((oldestWebhookAge + oldestExportAge) * 40),
        health: classifyHealth(matchStageQueue, Math.round((oldestWebhookAge + oldestExportAge) * 40)),
      },
      {
        id: 'notify',
        name: 'Notify',
        queueDepth: notifyStageQueue,
        latencyMs: Math.round((oldestWebhookAge + oldestExportAge) * 30 + notifyQueue * 8),
        health: classifyHealth(notifyStageQueue, Math.round((oldestWebhookAge + oldestExportAge) * 30 + notifyQueue * 8)),
      },
      {
        id: 'persist',
        name: 'Persist',
        queueDepth: persistStageQueue,
        latencyMs: Math.round(Math.max(60, throughputAvg > 0 ? (persistStageQueue / throughputAvg) * 600 : 300)),
        health: classifyHealth(
          persistStageQueue,
          Math.round(Math.max(60, throughputAvg > 0 ? (persistStageQueue / throughputAvg) * 600 : 300))
        ),
      },
    ]

    const queueTimelineDates = toMinuteDates(12)
    const queueTimeline = toTimelineLabels(queueTimelineDates)

    const intakePressure = scaleSeries(ingressCreated12, Math.max(8, reportDue + 2))
    const parsePressure = scaleSeries(exportQueueTrend, Math.max(8, exportQueue + 2))
    const validatePressure = scaleSeries(
      queueTimeline.map((_, idx) => Math.max(0, reportDue - Math.round(idx / 4) + reportStaleLocks)),
      Math.max(6, reportDue + reportStaleLocks + 2)
    )
    const enrichPressure = scaleSeries(webhookQueueTrend, Math.max(8, webhookQueue + 2))
    const dispatchPressure = scaleSeries(dispatchTrend, Math.max(6, notifyQueue + 2))
    const persistPressure = scaleSeries(resolved12, Math.max(8, throughputAvg + 2))

    const heatGrid = [
      intakePressure,
      parsePressure,
      validatePressure,
      enrichPressure,
      dispatchPressure,
      persistPressure,
    ]

    const latestPressure = heatGrid.map((row) => row[row.length - 1] ?? 0)
    const queueAgeBands = {
      fresh: latestPressure.filter((value) => value <= 30).length,
      warming: latestPressure.filter((value) => value > 30 && value <= 55).length,
      stale: latestPressure.filter((value) => value > 55 && value <= 78).length,
      critical: latestPressure.filter((value) => value > 78).length,
    }

    const createdLatest = ingressCreated12.slice(-4).reduce((sum, value) => sum + value, 0)
    const resolvedLatest = resolved12.slice(-4).reduce((sum, value) => sum + value, 0)
    const netTrendPerMinute = Math.round((createdLatest - resolvedLatest) / 4)
    const totalBacklog = webhookQueue + exportQueue + reportDue + notifyQueue

    const backlogForecast = Array.from({ length: 10 }, (_, idx) => {
      const projection = totalBacklog + netTrendPerMinute * (idx + 1) + reportStaleLocks * 2
      return Math.max(0, Math.round(projection))
    })

    const notifyPressure = dispatchPressure[dispatchPressure.length - 1] ?? 0
    const pulses = makeFailurePulses(notifyPressure, dispatchPressure)
    const activeAlerts = pulses.filter((pulse) => pulse.intensity >= 0.66).length

    const now = new Date()

    return NextResponse.json({
      generatedAt: now.toISOString(),
      commandCenter: {
        tick: Math.floor(now.getTime() / 10_000),
        throughput: throughputSeries,
        stages,
        pulses,
        activeAlerts,
      },
      queueHeatmap: {
        tick: Math.floor(now.getTime() / 10_000),
        timeline: queueTimeline,
        stages: ['Intake', 'Parse', 'Validate', 'Enrich', 'Dispatch', 'Persist'],
        grid: heatGrid,
        queueAgeBands,
        backlogForecast,
      },
      pipeline: {
        lastRun: latestPipelineRun
          ? {
              id: latestPipelineRun._id.toString(),
              status: latestPipelineRun.status,
              trigger: latestPipelineRun.trigger,
              durationMs: latestPipelineRun.durationMs,
              limits: latestPipelineRun.limits,
              stages: latestPipelineRun.stages,
              totals: latestPipelineRun.totals,
              completedAt: latestPipelineRun.completedAt,
              errors: latestPipelineRun.errors,
            }
          : null,
        externalSources: {
          activeCount: activeExternalSources,
          latestIngested: latestPipelineRun?.stages?.externalSources?.ingested ?? 0,
          latestPolled: latestPipelineRun?.stages?.externalSources?.processed ?? 0,
          latestFailed: latestPipelineRun?.stages?.externalSources?.failed ?? 0,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build realtime telemetry'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const payload = RunAutomationPipelineSchema.parse(body)

    const data = await AutomationPipelineService.runRealtimePipeline(
      { id: session.user.id, role: session.user.role },
      payload
    )

    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message || 'Validation failed' }, { status: 400 })
    }

    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    const message = error instanceof Error ? error.message : 'Failed to run automation pipeline'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
