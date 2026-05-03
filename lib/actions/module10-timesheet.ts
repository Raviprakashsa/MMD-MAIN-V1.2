"use server"

import { revalidatePath } from "next/cache"
import { createProtectedAction } from "@/lib/core/action-client"
import { TimesheetService, UpdateTimesheetSchema } from "@/lib/services/timesheet.service"
import { TimesheetSchema, TimesheetRangeSchema, TimesheetAdminReportSchema } from "@/lib/validators/common"
import { z } from "zod"

export const logWork = createProtectedAction(
  TimesheetSchema,
  async (payload, session) => {
    const entry = await TimesheetService.logWork(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/timesheet')
    return entry
  }
)

export const getTimesheet = createProtectedAction(
  TimesheetRangeSchema,
  async (payload, session) => {
    const data = await TimesheetService.getTimesheet(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return data
  }
)

export const getAdminReport = createProtectedAction(
  TimesheetAdminReportSchema,
  async (payload, session) => {
    const report = await TimesheetService.getAdminReport(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return report
  }
)

const GetByIdSchema = z.object({ id: z.string() })

export const getTimesheetById = createProtectedAction(
  GetByIdSchema,
  async (payload, session) => {
    const entry = await TimesheetService.getById(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return entry
  }
)

export const updateTimesheet = createProtectedAction(
  UpdateTimesheetSchema,
  async (payload, session) => {
    const entry = await TimesheetService.update(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/timesheet')
    return entry
  }
)

const DeleteTimesheetSchema = z.object({ id: z.string() })

export const deleteTimesheet = createProtectedAction(
  DeleteTimesheetSchema,
  async (payload, session) => {
    await TimesheetService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    revalidatePath('/dashboard/timesheet')
    return { success: true }
  }
)

const ApproveSchema = z.object({ id: z.string() })

export const approveTimesheet = createProtectedAction(
  ApproveSchema,
  async (payload, session) => {
    const entry = await TimesheetService.approve(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    revalidatePath('/dashboard/timesheet')
    return entry
  }
)

export const getPendingTimesheets = createProtectedAction(
  z.object({}).optional(),
  async (_, session) => {
    const pending = await TimesheetService.getPendingTimesheets(
      { id: session.user.id, role: session.user.role }
    )
    return pending
  }
)


