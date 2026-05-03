"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import { AnalyticsService, AnalyticsSummarySchema } from "@/lib/services/analytics.service"
import { ReportingService, RunScheduledReportsSchema, ToggleReportSchema } from "@/lib/services/reporting.service"
import { AnalyticsEventSchema, ReportScheduleSchema } from "@/lib/validators/common"
import { z } from "zod"


export const recordAnalyticsEventAction = createProtectedAction(
  AnalyticsEventSchema,
  async (payload, session) => {
    const event = await AnalyticsService.recordEvent(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return event
  }
)

export const getAnalyticsSummaryAction = createProtectedAction(
  AnalyticsSummarySchema,
  async (payload, session) => {
    const summary = await AnalyticsService.getSummary(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return summary
  }
)

export const createReportScheduleAction = createProtectedAction(
  ReportScheduleSchema,
  async (payload, session) => {
    const schedule = await ReportingService.createSchedule(
      { id: session.user.id, role: session.user.role },
      { ...payload, isActive: payload.isActive ?? true }
    )
    return schedule
  }
)

export const listReportSchedulesAction = createProtectedAction(
  z.object({}).optional(),
  async (_, session) => {
    const schedules = await ReportingService.listSchedules(
      { id: session.user.id, role: session.user.role }
    )
    return schedules
  }
)

export const toggleReportScheduleAction = createProtectedAction(
  ToggleReportSchema,
  async (payload, session) => {
    const schedule = await ReportingService.toggleSchedule(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return schedule
  }
)

export const runScheduledReportsAction = createProtectedAction(
  RunScheduledReportsSchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      limit: payload.limit ?? 25,
    }

    const summary = await ReportingService.runScheduledReports(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )
    return summary
  }
)

