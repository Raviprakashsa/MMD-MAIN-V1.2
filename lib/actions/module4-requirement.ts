"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  RequirementSchema,
  RequirementStatusSchema
} from "@/lib/validators/common"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { createProtectedAction } from "@/lib/core/action-client"
import { RequirementService } from "@/lib/services/requirement.service"

// Local Schemas
const UpdateRequirementStatusSchema = z.object({
  requirementId: z.string().min(1),
  status: RequirementStatusSchema,
  comment: z.string().min(1, 'Comment is required'),
})

const UpdateRequirementSchema = z.object({
  id: z.string().min(1),
  companyId: z.string().optional(),
  jobTitle: z.string().min(3).optional(),
  fullDescription: z.string().min(50).optional(),
  skills: z.array(z.string().min(1)).optional(),
  experienceMin: z.number().int().nonnegative().optional(),
  experienceMax: z.number().int().positive().optional(),
  salaryMin: z.number().nonnegative().optional(),
  salaryMax: z.number().nonnegative().optional(),
  openings: z.number().int().positive().optional(),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ONSITE']).optional(),
  location: z.string().min(2).optional(),
  interviewClosingDate: z.date().optional(),
  priority: z.enum(['High', 'Medium', 'Low']).optional(),
  group: z.enum(['RASHMI', 'MANJUNATH', 'SCRAPING', 'LEADS']).optional(),
  accountOwnerId: z.string().optional(),
  applicationFormId: z.string().optional(),
  whatsAppMessage: z.string().optional(),
  emailMessage: z.string().optional(),
  linkedInPost: z.string().optional(),
})

const FreezeRequirementSchema = z.object({
  requirementId: z.string().min(1),
  comment: z.string().optional(),
})

const ReassignRequirementSchema = z.object({
  requirementId: z.string().min(1),
  newOwnerId: z.string().min(1),
  comment: z.string().optional(),
})

const DeleteRequirementSchema = z.object({
  id: z.string().min(1),
})

const GetRequirementsFilterSchema = z.object({
  status: z.string().optional(),
  companyId: z.string().optional(),
  group: z.string().optional(),
  stalled: z.boolean().optional(),
}).optional()

const GetByIdSchema = z.object({ id: z.string().min(1) })

/**
 * Create Requirement Action
 */
export const createRequirementAction = createProtectedAction(
  RequirementSchema,
  async (payload, session) => {
    const requirement = await RequirementService.create(
      { id: session.user.id, role: session.user.role },
      payload as z.infer<typeof RequirementSchema>
    )
    revalidatePath('/dashboard/requirements')
    return serializeDoc(requirement)
  }
)

/**
 * Update Requirement Status Action
 */
export const updateRequirementStatusAction = createProtectedAction(
  UpdateRequirementStatusSchema,
  async (payload, session) => {
    const requirement = await RequirementService.updateStatus(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/requirements')
    return serializeDoc(requirement)
  }
)

/**
 * Get All Requirements Action
 */
export const getRequirements = createProtectedAction(
  GetRequirementsFilterSchema,
  async (payload, session) => {
    const requirements = await RequirementService.getAll(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return serializeDocs(requirements)
  }
)

/**
 * Get Requirement By ID Action
 */
export const getRequirementById = createProtectedAction(
  GetByIdSchema.or(z.string().min(1).transform(id => ({ id }))),
  async (payload, session) => {
    const id = typeof payload === 'string' ? payload : payload.id
    const requirement = await RequirementService.getById(
      { id: session.user.id, role: session.user.role },
      id
    )
    return serializeDoc(requirement)
  }
)

/**
 * Update Requirement Action (Fields)
 */
export const updateRequirementAction = createProtectedAction(
  UpdateRequirementSchema,
  async (payload, session) => {
    const { id, ...data } = payload
    const requirement = await RequirementService.update(
      { id: session.user.id, role: session.user.role },
      id,
      data
    )
    revalidatePath('/dashboard/requirements')
    return serializeDoc(requirement)
  }
)

/**
 * Freeze Requirement Action
 */
export const freezeRequirementAction = createProtectedAction(
  FreezeRequirementSchema,
  async (payload, session) => {
    const requirement = await RequirementService.freeze(
      { id: session.user.id, role: session.user.role },
      payload.requirementId,
      payload.comment
    )
    revalidatePath('/dashboard/requirements')
    return serializeDoc(requirement)
  }
)

/**
 * Reassign Requirement Action
 */
export const reassignRequirementAction = createProtectedAction(
  ReassignRequirementSchema,
  async (payload, session) => {
    const requirement = await RequirementService.reassign(
      { id: session.user.id, role: session.user.role },
      payload.requirementId,
      payload.newOwnerId,
      payload.comment
    )
    revalidatePath('/dashboard/requirements')
    return serializeDoc(requirement)
  }
)

/**
 * Delete Requirement Action
 */
export const deleteRequirementAction = createProtectedAction(
  DeleteRequirementSchema,
  async (payload, session) => {
    await RequirementService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    revalidatePath('/dashboard/requirements')
    return { success: true }
  }
)

