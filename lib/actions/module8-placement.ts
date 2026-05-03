"use server"

import { revalidatePath } from "next/cache"
import { createProtectedAction } from "@/lib/core/action-client"
import { PlacementService } from "@/lib/services/placement.service"
import { PlacementSchema, PlacementStatusSchema } from "@/lib/validators/common"
import { z } from "zod"

const UpdatePlacementStatusSchema = z.object({
  placementId: z.string().min(1),
  status: PlacementStatusSchema,
  joiningDate: z.date().optional(),
  backoutReason: z.string().optional(),
  paymentReceivedAt: z.date().optional(),
})

export const createPlacementAction = createProtectedAction(
  PlacementSchema,
  async (payload, session) => {
    const placement = await PlacementService.create(
      { id: session.user.id, role: session.user.role },
      payload as any
    )
    // Revalidate relevant paths if needed
    revalidatePath('/dashboard/placements')
    return placement
  }
)

export const updatePlacementStatusAction = createProtectedAction(
  UpdatePlacementStatusSchema,
  async (payload, session) => {
    const placement = await PlacementService.updateStatus(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/placements')
    return placement
  }
)

const UpdatePlacementSchema = PlacementSchema.partial().extend({
  id: z.string().min(1)
})

export const updatePlacementAction = createProtectedAction(
  UpdatePlacementSchema,
  async (payload, session) => {
    const { id, ...data } = payload
    const placement = await PlacementService.update(
      { id: session.user.id, role: session.user.role },
      id,
      data as any
    )
    revalidatePath('/dashboard/placements')
    revalidatePath(`/dashboard/placements/${id}`)
    return placement
  }
)

const GetPlacementsFilterSchema = z.object({
  status: z.string().optional(),
  companyId: z.string().optional(),
  requirementId: z.string().optional(),
})

export const getPlacements = createProtectedAction(
  GetPlacementsFilterSchema,
  async (filters, session) => {
    const placements = await PlacementService.getAll(
      { id: session.user.id, role: session.user.role },
      filters
    )
    return placements
  }
)

const GetByIdSchema = z.object({ id: z.string() })

export const getPlacementById = createProtectedAction(
  GetByIdSchema,
  async (payload, session) => {
    const placement = await PlacementService.getById(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return placement
  }
)

const DeletePlacementSchema = z.object({ id: z.string() })

export const deletePlacement = createProtectedAction(
  DeletePlacementSchema,
  async (payload, session) => {
    await PlacementService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    revalidatePath('/dashboard/placements')
    return { success: true }
  }
)


