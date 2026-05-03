
import connectDB from "@/lib/db/mongodb"
import Timesheet from "@/lib/db/models/Timesheet"
import Requirement from "@/lib/db/models/Requirement"
import AuditLog from "@/lib/db/models/AuditLog"
import { AppError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"
import { addDays, endOfDay, startOfDay } from "date-fns"
import { TimesheetAdminReportSchema, TimesheetRangeSchema, TimesheetSchema } from "@/lib/validators/common"

// Types
export type LogWorkInput = z.infer<typeof TimesheetSchema>
export type GetTimesheetInput = z.infer<typeof TimesheetRangeSchema>
export type GetAdminReportInput = z.infer<typeof TimesheetAdminReportSchema>

export const UpdateTimesheetSchema = z.object({
    id: z.string().min(1),
    description: z.string().min(10).optional(),
    hours: z.number().min(0.5).max(12).optional(),
    workType: z.enum([
        'JD Creation',
        'Sourcing',
        'Screening',
        'Interview Coordination',
        'Client Follow-up',
        'Database Update',
        'Administrative',
    ]).optional(),
})
export type UpdateTimesheetInput = z.infer<typeof UpdateTimesheetSchema>

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER", "SCRAPER"] as const

export class TimesheetService {
    private static canLog(role: string): boolean {
        return ALLOWED_ROLES.includes(role as any)
    }

    private static validateDateWindow(date: Date, now: Date) {
        const maxFuture = addDays(startOfDay(now), 1)
        if (date > maxFuture) {
            return "Date cannot be more than 1 day in the future"
        }
        return null
    }

    private static validateHoursLimit(existingTotal: number, hours: number) {
        if (hours > 8) return "Single entry cannot exceed 8 hours"
        if (existingTotal + hours > 24) return "Total hours for the day cannot exceed 24"
        return null
    }

    /**
     * Log Work
     */
    static async logWork(user: UserContext, data: LogWorkInput) {
        if (!this.canLog(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const now = new Date()
        const dateError = this.validateDateWindow(data.date, now)
        if (dateError) throw new AppError(dateError)

        const twoDaysAgo = addDays(startOfDay(now), -2)
        const isBackdated = data.date < twoDaysAgo
        const requiresApproval = isBackdated && (!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))

        const dayStart = startOfDay(data.date)
        const dayEnd = endOfDay(data.date)

        // Validate requirement access
        if (data.requirementId) {
            const requirement = await Requirement.findById(data.requirementId)
            if (!requirement) throw new NotFoundError("Requirement not found")
            if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && requirement.accountOwnerId.toString() !== user.id) {
                // Original logic: "Forbidden for this requirement"
                // But scraped roles or others? Strict check is good.
                throw new ForbiddenError("Forbidden for this requirement")
            }
        }

        const totals = await Timesheet.aggregate([
            { $match: { userId: user.id, date: { $gte: dayStart, $lte: dayEnd } } },
            { $group: { _id: null, totalHours: { $sum: "$hours" } } },
        ])
        const existingTotal = totals[0]?.totalHours ?? 0

        const hourError = this.validateHoursLimit(existingTotal, data.hours)
        if (hourError) throw new AppError(hourError)

        try {
            const entry = await Timesheet.create({
                userId: user.id,
                date: dayStart,
                requirementId: data.requirementId ?? null,
                workType: data.workType,
                description: data.description,
                hours: data.hours,
                isBackdated,
                requiresApproval,
            })

            await AuditLog.create({
                userId: user.id,
                action: "TIMESHEET_LOGGED",
                entity: "Timesheet",
                entityId: entry._id.toString(),
                newValue: { date: data.date, hours: data.hours, workType: data.workType },
            })

            return serializeDoc(entry.toObject())
        } catch (error: any) {
            if (error?.code === 11000) {
                throw new ConflictError("Duplicate entry for the same day/work type")
            }
            throw error
        }
    }

    /**
     * Get Timesheet (Weekly View)
     */
    static async getTimesheet(user: UserContext, data: GetTimesheetInput) {
        const targetUserId = data.userId ?? user.id
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && targetUserId !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const start = startOfDay(data.weekStart)
        const end = addDays(start, 6)

        const entries = await Timesheet.find({
            userId: targetUserId,
            date: { $gte: start, $lte: endOfDay(end) }
        }).sort({ date: 1 }).lean()

        const days = [] as Array<{ date: Date; totalHours: number; missing: boolean; backdated: boolean; requiresApproval?: boolean }>

        for (let i = 0; i < 7; i++) {
            const day = addDays(start, i)
            const dayStart = startOfDay(day)
            const dayEnd = endOfDay(day)
            const dayEntries = entries.filter((e) => e.date >= dayStart && e.date <= dayEnd)
            const totalHours = dayEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0)
            const backdated = dayEntries.some((e) => e.isBackdated)
            const requiresApproval = dayEntries.some((e) => e.requiresApproval)
            days.push({ date: dayStart, totalHours, missing: totalHours === 0, backdated, requiresApproval })
        }

        return { entries: serializeDocs(entries), days }
    }

    /**
     * Get Admin Report
     */
    static async getAdminReport(user: UserContext, data: GetAdminReportInput) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && user.role !== "COORDINATOR") throw new ForbiddenError("Forbidden")

        await connectDB()

        const groupId = data.groupBy === "user" ? "$userId" : "$requirementId"

        const summary = await Timesheet.aggregate([
            { $match: { date: { $gte: startOfDay(data.start), $lte: endOfDay(data.end) } } },
            {
                $group: {
                    _id: groupId,
                    totalHours: { $sum: "$hours" },
                    entries: { $push: "$$ROOT" },
                    backdatedCount: { $sum: { $cond: ["$isBackdated", 1, 0] } },
                },
            },
            { $sort: { totalHours: -1 } },
        ])

        // Serialize aggregation result manually
        return summary.map(item => ({
            ...item,
            _id: item._id ? item._id.toString() : null, // handle null requirementId group
            entries: serializeDocs(item.entries)
        }))
    }

    /**
     * Get List of Pending Timesheets
     */
    static async getPendingTimesheets(user: UserContext) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && user.role !== "COORDINATOR") throw new ForbiddenError("Forbidden")

        await connectDB()

        const entries = await Timesheet.find({ requiresApproval: true })
            .sort({ date: -1 })
            .lean()

        return serializeDocs(entries)
    }

    /**
     * Get Single Entry
     */
    static async getById(user: UserContext, entryId: string) {
        await connectDB()
        const entry = await Timesheet.findById(entryId).lean()
        if (!entry) throw new NotFoundError("Entry not found")

        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && entry.userId.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        return serializeDoc(entry)
    }

    /**
     * Update Timesheet
     */
    static async update(user: UserContext, data: UpdateTimesheetInput) {
        await connectDB()
        const entry = await Timesheet.findById(data.id)
        if (!entry) throw new NotFoundError("Entry not found")

        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && entry.userId.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        const oldValue = entry.toObject()

        if (data.description !== undefined) entry.description = data.description
        if (data.hours !== undefined) entry.hours = data.hours
        if (data.workType !== undefined) entry.workType = data.workType

        await entry.save()

        await AuditLog.create({
            userId: user.id,
            action: "TIMESHEET_UPDATED",
            entity: "Timesheet",
            entityId: entry._id.toString(),
            oldValue,
            newValue: entry.toObject(),
        })

        return serializeDoc(entry.toObject())
    }

    /**
     * Delete Timesheet
     */
    static async delete(user: UserContext, entryId: string) {
        await connectDB()
        const entry = await Timesheet.findById(entryId)
        if (!entry) throw new NotFoundError("Entry not found")

        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && entry.userId.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        if (entry.requiresApproval === false && (!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) {
            throw new ForbiddenError("Cannot delete approved entries")
        }

        const oldValue = entry.toObject()
        await Timesheet.deleteOne({ _id: entryId })

        await AuditLog.create({
            userId: user.id,
            action: "TIMESHEET_DELETED",
            entity: "Timesheet",
            entityId: entryId,
            oldValue,
        })

        return { success: true }
    }

    /**
     * Approve Timesheet
     */
    static async approve(user: UserContext, entryId: string) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && user.role !== "COORDINATOR") throw new ForbiddenError("Forbidden")

        await connectDB()
        const entry = await Timesheet.findById(entryId)
        if (!entry) throw new NotFoundError("Entry not found")

        if (!entry.requiresApproval) throw new AppError("Entry does not require approval")

        entry.requiresApproval = false
        await entry.save()

        await AuditLog.create({
            userId: user.id,
            action: "TIMESHEET_APPROVED",
            entity: "Timesheet",
            entityId: entry._id.toString(),
            newValue: { requiresApproval: false },
        })

        return serializeDoc(entry.toObject())
    }
}
