import { z } from 'zod'
import connectDB from '@/lib/db/mongodb'
import AutomationPipelineRun from '@/lib/db/models/AutomationPipelineRun'
import { AppError, ForbiddenError } from '@/lib/core/app-error'
import { ExportService } from '@/lib/services/export.service'
import { ReportingService } from '@/lib/services/reporting.service'
import { WebhookService } from '@/lib/services/webhook.service'
import { ExternalIntakeService } from '@/lib/services/external-intake.service'
import { serializeDoc } from '@/lib/utils/serialize'

export const RunAutomationPipelineSchema = z.object({
  externalSourceLimit: z.number().int().min(1).max(100).optional().default(10),
  externalRequestTimeoutMs: z.number().int().min(1000).max(15000).optional().default(6000),
  reportScheduleLimit: z.number().int().min(1).max(100).optional().default(25),
  exportJobLimit: z.number().int().min(1).max(100).optional().default(15),
  webhookDeliveryLimit: z.number().int().min(1).max(100).optional().default(25),
  trigger: z.enum(['MANUAL', 'CRON', 'SYSTEM']).optional().default('MANUAL'),
})

export type RunAutomationPipelineInput = z.infer<typeof RunAutomationPipelineSchema>

interface UserContext {
  id: string
  role: string
}

interface PipelineStageSummary {
  processed: number
  succeeded: number
  failed: number
  deadLetter: number
  ingested: number
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Pipeline stage failed'
}

function isOperator(user: UserContext): boolean {
  return user.role === 'SYSTEM' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
}

export class AutomationPipelineService {
  static async runRealtimePipeline(user: UserContext, input: RunAutomationPipelineInput) {
    if (!isOperator(user)) {
      throw new ForbiddenError('Forbidden')
    }

    await connectDB()

    const startedAt = new Date()
    const errors: string[] = []

    let externalSummary: PipelineStageSummary = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deadLetter: 0,
      ingested: 0,
    }

    let reportSummary: PipelineStageSummary = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deadLetter: 0,
      ingested: 0,
    }

    let exportSummary: PipelineStageSummary = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deadLetter: 0,
      ingested: 0,
    }

    let webhookSummary: PipelineStageSummary = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      deadLetter: 0,
      ingested: 0,
    }

    try {
      const externalResult = await ExternalIntakeService.pullFromActiveSources({
        maxSources: input.externalSourceLimit,
        timeoutMs: input.externalRequestTimeoutMs,
      })

      externalSummary = {
        processed: externalResult.polled,
        succeeded: externalResult.succeeded,
        failed: externalResult.failed,
        deadLetter: 0,
        ingested: externalResult.ingested,
      }

      if (externalResult.errors.length > 0) {
        errors.push(...externalResult.errors.map((message) => `externalSources: ${message}`))
      }
    } catch (error) {
      errors.push(`externalSources: ${toMessage(error)}`)
    }

    try {
      const reportResult = await ReportingService.runScheduledReports(
        { id: user.id, role: user.role },
        { limit: input.reportScheduleLimit }
      )

      reportSummary = {
        processed: reportResult.processed,
        succeeded: reportResult.executed,
        failed: reportResult.failed,
        deadLetter: reportResult.deadLetter,
        ingested: 0,
      }
    } catch (error) {
      errors.push(`reportSchedules: ${toMessage(error)}`)
    }

    try {
      const exportResult = await ExportService.processPendingJobs(
        { id: user.id, role: user.role },
        { limit: input.exportJobLimit }
      )

      exportSummary = {
        processed: exportResult.processed,
        succeeded: exportResult.completed,
        failed: exportResult.failed,
        deadLetter: exportResult.deadLetter,
        ingested: 0,
      }
    } catch (error) {
      errors.push(`exportJobs: ${toMessage(error)}`)
    }

    try {
      const webhookResult = await WebhookService.processPendingDeliveries(
        { id: user.id, role: user.role },
        { limit: input.webhookDeliveryLimit }
      )

      webhookSummary = {
        processed: webhookResult.processed,
        succeeded: webhookResult.delivered,
        failed: webhookResult.failed,
        deadLetter: webhookResult.deadLetter,
        ingested: 0,
      }
    } catch (error) {
      errors.push(`webhookDeliveries: ${toMessage(error)}`)
    }

    const totals = {
      processed: externalSummary.processed + reportSummary.processed + exportSummary.processed + webhookSummary.processed,
      succeeded: externalSummary.succeeded + reportSummary.succeeded + exportSummary.succeeded + webhookSummary.succeeded,
      failed: externalSummary.failed + reportSummary.failed + exportSummary.failed + webhookSummary.failed,
      deadLetter: externalSummary.deadLetter + reportSummary.deadLetter + exportSummary.deadLetter + webhookSummary.deadLetter,
      ingested: externalSummary.ingested,
    }

    const status =
      errors.length === 0
        ? 'COMPLETED'
        : totals.processed > 0 || totals.succeeded > 0 || totals.failed > 0 || totals.deadLetter > 0
          ? 'PARTIAL'
          : 'FAILED'

    const completedAt = new Date()
    const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime())

    const run = await AutomationPipelineRun.create({
      triggeredBy: user.id,
      trigger: input.trigger,
      status,
      durationMs,
      limits: {
        externalSources: input.externalSourceLimit,
        reportSchedules: input.reportScheduleLimit,
        exportJobs: input.exportJobLimit,
        webhookDeliveries: input.webhookDeliveryLimit,
      },
      stages: {
        externalSources: externalSummary,
        reportSchedules: reportSummary,
        exportJobs: exportSummary,
        webhookDeliveries: webhookSummary,
      },
      totals,
      errors,
      startedAt,
      completedAt,
    })

    return serializeDoc(run.toObject())
  }

  static async listRecentRuns(user: UserContext, limit = 12) {
    if (!isOperator(user)) {
      throw new ForbiddenError('Forbidden')
    }

    await connectDB()

    const safeLimit = Math.max(1, Math.min(50, limit))

    const runs = await AutomationPipelineRun.find()
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean()

    return runs.map((run) => serializeDoc(run))
  }

  static assertPipelineHealthy(payload: unknown) {
    const parsed = asPipelineRun(payload)
    if (parsed.status === 'FAILED') {
      throw new AppError('Automation pipeline run failed')
    }
    return parsed
  }
}

function asPipelineRun(payload: unknown): { status: string } {
  if (!payload || typeof payload !== 'object' || !('status' in payload)) {
    throw new AppError('Malformed automation pipeline response')
  }

  const status = (payload as { status?: unknown }).status
  if (typeof status !== 'string') {
    throw new AppError('Malformed automation pipeline status')
  }

  return { status }
}
