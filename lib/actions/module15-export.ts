"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import {
  ExportService,
  CompleteExportJobSchema,
  ListExportJobsSchema,
  ProcessPendingExportJobsSchema,
} from "@/lib/services/export.service"
import { ExportJobSchema } from "@/lib/validators/common"



export const createExportJobAction = createProtectedAction(
  ExportJobSchema,
  async (payload, session) => {
    const job = await ExportService.createJob(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return job
  }
)

export const markExportJobCompleteAction = createProtectedAction(
  CompleteExportJobSchema,
  async (payload, session) => {
    const job = await ExportService.markComplete(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return job
  }
)

export const listExportJobsAction = createProtectedAction(
  ListExportJobsSchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      limit: payload.limit ?? 15,
    }

    const jobs = await ExportService.listJobs(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )
    return jobs
  }
)

export const processPendingExportJobsAction = createProtectedAction(
  ProcessPendingExportJobsSchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      limit: payload.limit ?? 10,
    }

    const summary = await ExportService.processPendingJobs(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )
    return summary
  }
)

