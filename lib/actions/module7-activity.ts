"use server"

import { revalidatePath } from "next/cache"
import { createProtectedAction } from "@/lib/core/action-client"
import { ActivityService, AddActivitySchema, StalledSchema, FollowUpsSchema } from "@/lib/services/activity.service"

export const addActivityAction = createProtectedAction(
  AddActivitySchema,
  async (payload, session) => {
    const activity = await ActivityService.create(
      { id: session.user.id, role: session.user.role },
      { ...payload, outcome: payload.outcome ?? 'PENDING' }
    )
    revalidatePath('/dashboard/activities')
    return activity
  }
)

export const getStalledRequirementsAction = createProtectedAction(
  StalledSchema.optional(),
  async (payload, session) => {
    const stalled = await ActivityService.getStalledRequirements(
      { id: session.user.id, role: session.user.role },
      payload ? { daysStale: payload.daysStale ?? 3 } : undefined
    )
    return stalled
  }
)

export const getUpcomingFollowUpsAction = createProtectedAction(
  FollowUpsSchema.optional(),
  async (payload, session) => {
    const activities = await ActivityService.getUpcomingFollowUps(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return activities
  }
)

