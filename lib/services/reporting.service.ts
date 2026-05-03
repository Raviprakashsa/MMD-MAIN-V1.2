
import connectDB from "@/lib/db/mongodb"
import ReportSchedule from "@/lib/db/models/ReportSchedule"
import AuditLog from "@/lib/db/models/AuditLog"
import AnalyticsEvent from "@/lib/db/models/AnalyticsEvent"
import User from "@/lib/db/models/User"
import { AppError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"
import { ReportScheduleSchema } from "@/lib/validators/common"
import { reportGenerators } from "@/lib/reports/generators"
import { Types } from "mongoose"
import type { ReportFilters } from "@/lib/reports/generators"

export const ToggleReportSchema = z.object({
    scheduleId: z.string().min(1),
    isActive: z.boolean(),
})

export const GenerateReportSchema = z.object({
    type: z.enum(['dailyActivity', 'requirementStatus', 'candidatePipeline', 'timesheet', 'sourceConversion']),
    filters: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        userId: z.string().optional(),
        group: z.string().optional(),
        activityType: z.string().optional(),
        status: z.string().optional(),
        companyId: z.string().optional(),
    }).optional(),
    format: z.enum(['view', 'csv']).default('view'),
})

export const RunScheduledReportsSchema = z.object({
    limit: z.number().int().min(1).max(50).default(25),
})

export type CreateScheduleInput = z.infer<typeof ReportScheduleSchema>
export type ToggleReportInput = z.infer<typeof ToggleReportSchema>
export type GenerateReportInput = z.infer<typeof GenerateReportSchema>
export type RunScheduledReportsInput = z.infer<typeof RunScheduledReportsSchema>

interface UserContext {
    id: string
    role: string
    assignedGroup?: string | null
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER"] as const
const OPERATOR_ROLES = ["SUPER_ADMIN", "ADMIN"] as const
const DEFAULT_REPORT_MAX_CONSECUTIVE_FAILURES = 3
const REPORT_LOCK_TIMEOUT_MS = 15 * 60 * 1000

function hasRole(role: string, roles: readonly string[]): boolean {
    return roles.includes(role)
}

function parseFilterDate(value?: string): Date | undefined {
    if (!value) return undefined

    const hasTimeSegment = value.includes('T')
    const normalized = hasTimeSegment ? value : `${value}T00:00:00.000Z`
    const parsed = new Date(normalized)
    if (Number.isNaN(parsed.getTime())) {
        throw new AppError(`Invalid date filter value: ${value}`)
    }

    return parsed
}

function normalizeReportFilters(filters: Record<string, unknown> | undefined): ReportFilters {
    if (!filters) return {}

    const fromRaw = typeof filters.from === 'string' ? filters.from : undefined
    const toRaw = typeof filters.to === 'string' ? filters.to : undefined

    return {
        from: parseFilterDate(fromRaw),
        to: parseFilterDate(toRaw),
        userId: typeof filters.userId === 'string' ? filters.userId : undefined,
        group: typeof filters.group === 'string' ? filters.group : undefined,
        activityType: typeof filters.activityType === 'string' ? filters.activityType : undefined,
        status: typeof filters.status === 'string' ? filters.status : undefined,
        companyId: typeof filters.companyId === 'string' ? filters.companyId : undefined,
    }
}

function isScheduleDue(schedule: { frequency: string; lastRunAt?: Date | null }, now: Date): boolean {
    if (!schedule.lastRunAt) return true

    const lastRunAt = new Date(schedule.lastRunAt)
    if (Number.isNaN(lastRunAt.getTime())) return true

    const elapsedMs = now.getTime() - lastRunAt.getTime()
    if (schedule.frequency === 'DAILY') {
        return elapsedMs >= 24 * 60 * 60 * 1000
    }
    if (schedule.frequency === 'WEEKLY') {
        return elapsedMs >= 7 * 24 * 60 * 60 * 1000
    }
    return elapsedMs >= 30 * 24 * 60 * 60 * 1000
}

function computeRetryDelayMs(attempts: number): number {
    const minutes = Math.min(60, 2 ** Math.max(0, attempts - 1))
    return minutes * 60 * 1000
}

function computeNextRunAt(frequency: string, from: Date): Date {
    const base = new Date(from)
    if (frequency === 'DAILY') {
        base.setUTCDate(base.getUTCDate() + 1)
        return base
    }

    if (frequency === 'WEEKLY') {
        base.setUTCDate(base.getUTCDate() + 7)
        return base
    }

    base.setUTCMonth(base.getUTCMonth() + 1)
    return base
}

function isScheduleRunnable(
    schedule: { frequency: string; lastRunAt?: Date | null; nextRunAt?: Date | null },
    now: Date
): boolean {
    if (schedule.nextRunAt) {
        const nextRunAt = new Date(schedule.nextRunAt)
        if (!Number.isNaN(nextRunAt.getTime())) {
            return nextRunAt.getTime() <= now.getTime()
        }
    }

    return isScheduleDue({ frequency: schedule.frequency, lastRunAt: schedule.lastRunAt }, now)
}

async function resolveAuditUserId(userId: string): Promise<string | null> {
    if (/^[a-fA-F0-9]{24}$/.test(userId)) {
        return userId
    }

    const fallbackUser = await User.findOne({ role: { $in: OPERATOR_ROLES }, deletedAt: null })
        .sort({ createdAt: 1 })
        .select('_id')
        .lean()

    return fallbackUser?._id ? fallbackUser._id.toString() : null
}

export class ReportingService {

    /**
     * Create Schedule
     */
    static async createSchedule(user: UserContext, data: CreateScheduleInput) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const schedule = await ReportSchedule.create({
            ...data,
            createdBy: user.id,
        })

        await AuditLog.create({
            userId: user.id,
            action: "REPORT_SCHEDULE_CREATED",
            entity: "ReportSchedule",
            entityId: schedule._id.toString(),
            newValue: data,
        })

        return serializeDoc(schedule.toObject())
    }

    /**
     * List Schedules
     */
    static async listSchedules(user: UserContext) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const schedules = await ReportSchedule.find().sort({ createdAt: -1 }).lean()
        return serializeDocs(schedules)
    }

    /**
     * Toggle Schedule
     */
    static async toggleSchedule(user: UserContext, data: ToggleReportInput) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const schedule = await ReportSchedule.findById(data.scheduleId)
        if (!schedule) throw new NotFoundError("Schedule not found")

        schedule.isActive = data.isActive
        if (data.isActive) {
            schedule.deadLetteredAt = null
            schedule.consecutiveFailures = 0
            schedule.lastError = null
            if (!schedule.nextRunAt) {
                schedule.nextRunAt = new Date()
            }
        } else {
            schedule.processingStartedAt = null
        }

        await schedule.save()

        await AuditLog.create({
            userId: user.id,
            action: "REPORT_SCHEDULE_TOGGLED",
            entity: "ReportSchedule",
            entityId: schedule._id.toString(),
            newValue: { isActive: schedule.isActive },
        })

        return serializeDoc(schedule.toObject())
    }

    /**
     * Generate Report
     */
    static async generateReport(user: UserContext, data: GenerateReportInput) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        const filters = normalizeReportFilters(data.filters)

        const userContextForGenerator = {
            _id: Types.ObjectId.createFromHexString(user.id),
            role: user.role,
            assignedGroup: user.assignedGroup ?? null,
        }

        const generator = reportGenerators[data.type] as (filters: ReportFilters, user: { _id: Types.ObjectId; role: string; assignedGroup?: string | null }) => Promise<unknown>
        if (!generator) {
            throw new AppError("Unsupported report type")
        }
        const reportData: unknown = await generator(filters, userContextForGenerator)

        if (data.format === 'csv') {
            let rows: Record<string, unknown>[] = []
            if (Array.isArray(reportData)) rows = reportData
            else if (reportData && Array.isArray((reportData as any).funnel)) rows = (reportData as any).funnel as Record<string, unknown>[]

            return { csv: ReportingService.toCSV(rows) }
        }

        return reportData
    }

    /**
     * Run due report schedules and persist execution telemetry.
     */
    static async runScheduledReports(user: UserContext, input: RunScheduledReportsInput) {
        if (!(user.role === 'SYSTEM' || hasRole(user.role, OPERATOR_ROLES))) {
            throw new ForbiddenError('Forbidden')
        }

        await connectDB()
        const auditUserId = await resolveAuditUserId(user.id)

        const summary = {
            checked: 0,
            processed: 0,
            executed: 0,
            failed: 0,
            deadLetter: 0,
        }

        const now = new Date()
        const lockCutoff = new Date(now.getTime() - REPORT_LOCK_TIMEOUT_MS)

        const candidates = await ReportSchedule.find({
            isActive: true,
            deadLetteredAt: null,
            $or: [
                { processingStartedAt: null },
                { processingStartedAt: { $lte: lockCutoff } },
            ],
        })
            .sort({ nextRunAt: 1, lastRunAt: 1, createdAt: 1 })
            .limit(input.limit)

        for (const candidate of candidates) {
            summary.checked += 1

            if (!isScheduleRunnable(candidate, now)) {
                continue
            }

            const claimed = await ReportSchedule.findOneAndUpdate(
                {
                    _id: candidate._id,
                    isActive: true,
                    deadLetteredAt: null,
                    $or: [
                        { processingStartedAt: null },
                        { processingStartedAt: { $lte: lockCutoff } },
                    ],
                },
                {
                    $set: {
                        processingStartedAt: new Date(),
                        lastError: null,
                    },
                },
                { new: true }
            )

            if (!claimed) {
                continue
            }

            summary.processed += 1

            try {
                const filters = normalizeReportFilters((claimed.filters || {}) as Record<string, unknown>)
                const reportType = claimed.reportType as GenerateReportInput['type']
                const generator = reportGenerators[reportType] as
                    | ((filters: ReportFilters, user: { _id: Types.ObjectId; role: string; assignedGroup?: string | null }) => Promise<unknown>)
                    | undefined

                if (!generator) {
                    throw new AppError(`Unsupported report type in schedule: ${claimed.reportType}`)
                }

                const createdById = claimed.createdBy.toString()
                const createdByUser = await User.findById(createdById).select('role').lean()

                const generatorUser = {
                    _id: Types.ObjectId.createFromHexString(createdById),
                    role: createdByUser?.role || 'ADMIN',
                    assignedGroup: null,
                }

                const output = await generator(filters, generatorUser)
                const rowCount = Array.isArray(output)
                    ? output.length
                    : (output && typeof output === 'object' && Array.isArray((output as { funnel?: unknown[] }).funnel)
                        ? ((output as { funnel: unknown[] }).funnel.length)
                        : 1)

                const completedAt = new Date()
                claimed.lastRunAt = completedAt
                claimed.nextRunAt = computeNextRunAt(claimed.frequency, completedAt)
                claimed.processingStartedAt = null
                claimed.lastError = null
                claimed.consecutiveFailures = 0
                claimed.deadLetteredAt = null
                await claimed.save()

                await AnalyticsEvent.create({
                    metric: `report.schedule.${claimed.reportType}.run`,
                    entityType: 'ReportSchedule',
                    entityId: claimed._id,
                    value: rowCount,
                    occurredAt: completedAt,
                    metadata: {
                        frequency: claimed.frequency,
                        recipients: claimed.recipients.length,
                    },
                })

                if (auditUserId) {
                    await AuditLog.create({
                        userId: auditUserId,
                        action: 'REPORT_SCHEDULE_EXECUTED',
                        entity: 'ReportSchedule',
                        entityId: claimed._id.toString(),
                        newValue: {
                            runAt: completedAt.toISOString(),
                            reportType: claimed.reportType,
                            rowCount,
                            nextRunAt: claimed.nextRunAt,
                        },
                    })
                }

                summary.executed += 1
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Schedule execution failed'
                const nextFailureCount = (claimed.consecutiveFailures || 0) + 1
                const maxFailures = claimed.maxConsecutiveFailures || DEFAULT_REPORT_MAX_CONSECUTIVE_FAILURES
                const shouldDeadLetter = nextFailureCount >= maxFailures

                claimed.processingStartedAt = null
                claimed.lastError = message
                claimed.consecutiveFailures = nextFailureCount
                claimed.nextRunAt = shouldDeadLetter
                    ? new Date()
                    : new Date(Date.now() + computeRetryDelayMs(nextFailureCount))

                if (shouldDeadLetter) {
                    claimed.deadLetteredAt = new Date()
                    claimed.isActive = false
                }

                await claimed.save()

                if (auditUserId) {
                    await AuditLog.create({
                        userId: auditUserId,
                        action: shouldDeadLetter ? 'REPORT_SCHEDULE_DEAD_LETTERED' : 'REPORT_SCHEDULE_FAILED',
                        entity: 'ReportSchedule',
                        entityId: claimed._id.toString(),
                        newValue: {
                            runAt: new Date().toISOString(),
                            error: message,
                            failures: nextFailureCount,
                            maxFailures,
                            nextRunAt: claimed.nextRunAt,
                        },
                    })
                }

                if (shouldDeadLetter) {
                    summary.deadLetter += 1
                } else {
                    summary.failed += 1
                }
            }
        }

        return summary
    }

    private static toCSV(rows: Record<string, unknown>[]): string {
        if (!rows.length) return ''
        const headers = Object.keys(rows[0])
        const escape = (v: unknown) => {
            if (v === null || v === undefined) return ''
            const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return '"' + s.replaceAll('"', '""') + '"'
            }
            return s
        }
        const lines = [headers.join(',')]
        for (const row of rows) {
            lines.push(headers.map((h) => escape(row[h])).join(','))
        }
        return lines.join('\n')
    }
}
