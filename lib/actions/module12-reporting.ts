"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import { ReportingService, GenerateReportSchema } from "@/lib/services/reporting.service"

export const generateReportAction = createProtectedAction(
  GenerateReportSchema,
  async (payload, session) => {
    const data = await ReportingService.generateReport(
      {
        id: session.user.id,
        role: session.user.role,
        assignedGroup: (session.user as any).assignedGroup
      },
      { ...payload, format: payload.format ?? 'view' }
    )
    return data
  }
)

