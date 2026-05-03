"use server"

import { revalidatePath } from "next/cache"
import { createProtectedAction } from "@/lib/core/action-client"
import {
  CandidateService,
  CandidateSchema,
  GetCandidateActivitiesSchema,
  UpdateCandidateStatusSchema,
  UpdateCandidateProfileSchema,
} from "@/lib/services/candidate.service"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"

// Add Candidate
export const addCandidateAction = createProtectedAction(
  CandidateSchema,
  async (payload, session) => {
    const candidate = await CandidateService.create(
      { id: session.user.id, role: session.user.role },
      payload as any // Zod default handling workaround
    )
    revalidatePath('/dashboard/candidates')
    return serializeDoc(candidate)
  }
)

// Update Candidate Status
export const updateCandidateStatusAction = createProtectedAction(
  UpdateCandidateStatusSchema,
  async (payload, session) => {
    const result = await CandidateService.updateStatus(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/candidates')
    return {
      ...serializeDoc(result.candidate),
      warning: result.warning
    }
  }
)

// Get Candidates
const GetCandidatesSchema = z.object({
  requirementId: z.string().optional(),
  status: z.string().optional()
})

export const getCandidates = createProtectedAction(
  GetCandidatesSchema,
  async (filters, session) => {
    const candidates = await CandidateService.getAll(
      { id: session.user.id, role: session.user.role },
      filters
    )
    return serializeDocs(candidates)
  }
)

// Get Candidate By ID
const GetByIdSchema = z.object({ id: z.string() })

export const getCandidateById = createProtectedAction(
  GetByIdSchema,
  async (payload, session) => {
    const candidate = await CandidateService.getById(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return serializeDoc(candidate)
  }
)

// Update Candidate Profile
export const updateCandidate = createProtectedAction(
  UpdateCandidateProfileSchema,
  async (payload, session) => {
    const candidate = await CandidateService.update(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/candidates')
    return serializeDoc(candidate)
  }
)

// Delete Candidate
const DeleteCandidateSchema = z.object({ id: z.string() })

export const deleteCandidate = createProtectedAction(
  DeleteCandidateSchema,
  async (payload, session) => {
    await CandidateService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    revalidatePath('/dashboard/candidates')
    return { success: true }
  }
)

// Get Pipeline
const PipelineSchema = z.object({ requirementId: z.string().min(1) })

export const getCandidatePipelineAction = createProtectedAction(
  PipelineSchema,
  async (payload, session) => {
    const pipeline = await CandidateService.getPipeline(
      { id: session.user.id, role: session.user.role },
      payload.requirementId
    )
    return pipeline
  }
)

// Candidate Activity Timeline
export const getCandidateActivitiesAction = createProtectedAction(
  GetCandidateActivitiesSchema,
  async (payload, session) => {
    const timeline = await CandidateService.getActivities(
      { id: session.user.id, role: session.user.role },
      {
        ...payload,
        limit: payload.limit ?? 30,
      }
    )

    return timeline
  }
)

