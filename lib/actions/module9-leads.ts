"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  LeadSchema,
  LeadStatusSchema,
  AddLeadActivitySchema
} from "@/lib/validators/common"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { createProtectedAction } from "@/lib/core/action-client"
import { LeadsService } from "@/lib/services/leads.service"

// Local Schemas
const ConvertSchema = z.object({ leadId: z.string().min(1) })
const LeadUpdateSchema = LeadSchema.partial().extend({ id: z.string().min(1) })
const GetLeadsFilterSchema = z.object({ status: LeadStatusSchema.optional() })
const DeleteLeadSchema = z.object({ leadId: z.string().min(1) })

/**
 * Get Leads Action
 */
export const getLeads = createProtectedAction(
  GetLeadsFilterSchema.optional().default({}),
  async (payload, session) => {
    const leads = await LeadsService.getAll(
      { ...session.user },
      payload
    )
    return serializeDocs(leads)
  }
)

/**
 * Create Lead Action
 */
export const createLead = createProtectedAction(
  LeadSchema,
  async (payload, session) => {
    // LeadSchema defaults (like status='NEW') are applied by Zod before this handler
    const lead = await LeadsService.create(
      { ...session.user },
      payload as z.infer<typeof LeadSchema> // Explicit cast to ensure TS sees the default
    )
    revalidatePath('/dashboard/leads')
    revalidatePath('/dashboard')
    return serializeDoc(lead)
  }
)

/**
 * Bulk Create Leads Action
 */
export const bulkCreateLeads = createProtectedAction(
  z.array(LeadSchema),
  async (payload, session) => {
    const result = await LeadsService.bulkCreate(
      { ...session.user },
      payload as z.infer<typeof LeadSchema>[]
    )
    revalidatePath('/dashboard/leads')
    revalidatePath('/dashboard')
    return result
  }
)

/**
 * Update Lead Action
 */
export const updateLead = createProtectedAction(
  LeadUpdateSchema,
  async (payload, session) => {
    const { id, ...data } = payload
    const lead = await LeadsService.update(
      { ...session.user },
      id,
      data
    )
    revalidatePath('/dashboard/leads')
    revalidatePath('/dashboard')
    return serializeDoc(lead)
  }
)

/**
 * Convert Lead to Company Action
 */
export const convertLeadToCompany = createProtectedAction(
  ConvertSchema,
  async (payload, session) => {
    const result = await LeadsService.convertToCompany(
      { ...session.user },
      payload.leadId
    )

    revalidatePath('/dashboard/leads')
    revalidatePath('/dashboard')
    revalidatePath('/dashboard/companies')
    return {
      lead: serializeDoc(result.lead),
      company: serializeDoc(result.company as any),
      alreadyConverted: (result as any).alreadyConverted
    }
  }
)

/**
 * Update Lead Status (Dedicated Action)
 */
const UpdateStatusSchema = z.object({
  leadId: z.string().min(1),
  status: LeadStatusSchema,
})

export const updateLeadStatus = createProtectedAction(
  UpdateStatusSchema,
  async (payload, session) => {
    const lead = await LeadsService.update(
      { ...session.user },
      payload.leadId,
      { status: payload.status }
    )
    revalidatePath('/dashboard/leads')
    revalidatePath('/dashboard')
    return serializeDoc(lead)
  }
)

/**
 * Add Activity Action
 */
export const addLeadActivity = createProtectedAction(
  AddLeadActivitySchema,
  async (payload, session) => {
    const lead = await LeadsService.addActivity(
      { ...session.user },
      payload
    )
    revalidatePath('/dashboard/leads')
    revalidatePath('/dashboard')
    return serializeDoc(lead)
  }
)

/**
 * Delete Lead Action
 */
export const deleteLead = createProtectedAction(
  DeleteLeadSchema, // Using object wrapper for scalar input standard
  async (payload, session) => {
    await LeadsService.delete(
      { ...session.user },
      payload.leadId
    )
    revalidatePath('/dashboard/leads')
    revalidatePath('/dashboard')
    return { success: true }
  }
)

/**
 * Get Metrics Action
 */
export const getLeadMetrics = createProtectedAction(
  z.any().optional(), // No input needed
  async (_, session) => {
    const metrics = await LeadsService.getMetrics({ ...session.user })
    return metrics
  }
)

/**
 * Get Enhanced Metrics Action
 */
export const getEnhancedLeadMetrics = createProtectedAction(
  z.any().optional(), // No input needed
  async (_, session) => {
    const metrics = await LeadsService.getEnhancedMetrics({ ...session.user })
    return metrics
  }
)
