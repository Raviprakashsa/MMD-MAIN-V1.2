
import connectDB from "@/lib/db/mongodb"
import AnalyticsEvent from "@/lib/db/models/AnalyticsEvent"
import { ForbiddenError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"
import { AnalyticsEventSchema } from "@/lib/validators/common"

export const AnalyticsSummarySchema = z.object({
    metric: z.string().min(1),
    from: z.date().optional(),
    to: z.date().optional(),
})

export type RecordEventInput = z.infer<typeof AnalyticsEventSchema>
export type GetSummaryInput = z.infer<typeof AnalyticsSummarySchema>

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER"] as const

export class AnalyticsService {
    /**
     * Record Event
     */
    static async recordEvent(user: UserContext, data: RecordEventInput) {
        // Any authenticated user can record events usually?
        // Original logic checked session.user.

        await connectDB()

        const event = await AnalyticsEvent.create({
            ...data,
            occurredAt: data.occurredAt ?? new Date(),
        })

        return serializeDoc(event.toObject())
    }

    /**
     * Get Summary
     */
    static async getSummary(user: UserContext, data: GetSummaryInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const match: any = { metric: data.metric }
        if (data.from || data.to) {
            match.occurredAt = {}
            if (data.from) match.occurredAt.$gte = data.from
            if (data.to) match.occurredAt.$lte = data.to
        }

        const summary = await AnalyticsEvent.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        day: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
                    },
                    total: { $sum: { $ifNull: ["$value", 1] } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.day": 1 } },
        ])

        return serializeDocs(summary)
    }
}
