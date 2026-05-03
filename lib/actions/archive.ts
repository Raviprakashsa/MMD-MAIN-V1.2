"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import { z } from "zod"
import { RequirementService } from "@/lib/services/requirement.service"
import { CandidateService } from "@/lib/services/candidate.service"
import { CompanyService } from "@/lib/services/company.service"
import connectDB from "@/lib/db/mongodb"
import Company from "@/lib/db/models/Company"
import Requirement from "@/lib/db/models/Requirement"
import Candidate from "@/lib/db/models/Candidate"

const ArchiveSchema = z.object({
  id: z.string().min(1),
})

// Requirement
export const archiveRequirement = createProtectedAction(
  ArchiveSchema,
  async (payload, session) => {
    await RequirementService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)

export const restoreRequirement = createProtectedAction(
  ArchiveSchema,
  async (payload, session) => {
    await RequirementService.restore(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)

// Candidate
export const archiveCandidate = createProtectedAction(
  ArchiveSchema,
  async (payload, session) => {
    await CandidateService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)

export const restoreCandidate = createProtectedAction(
  ArchiveSchema,
  async (payload, session) => {
    await CandidateService.restore(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)

// Company
export const archiveCompany = createProtectedAction(
  ArchiveSchema,
  async (payload, session) => {
    await CompanyService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)

export const restoreCompany = createProtectedAction(
  ArchiveSchema,
  async (payload, session) => {
    await CompanyService.restore(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)

// Get Archived Items (Admin Only - kept as ad-hoc action for now or could be service)
export const getArchivedItems = createProtectedAction(
  z.object({}).optional(),
  async (_, session) => {
    if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role))) {
      throw new Error("Forbidden")
    }

    await connectDB()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [companies, requirements, candidates] = await Promise.all([
      Company.find({ deletedAt: { $ne: null, $gte: thirtyDaysAgo } })
        .select('name deletedAt')
        .lean(),
      Requirement.find({ deletedAt: { $ne: null, $gte: thirtyDaysAgo } })
        .select('mmdId jobTitle deletedAt')
        .lean(),
      Candidate.find({ deletedAt: { $ne: null, $gte: thirtyDaysAgo } })
        .select('name email deletedAt')
        .lean(),
    ])

    return {
      companies: companies.map((c) => ({ ...c, _id: c._id.toString() })),
      requirements: requirements.map((r) => ({ ...r, _id: r._id.toString() })),
      candidates: candidates.map((c) => ({ ...c, _id: c._id.toString() })),
    }
  }
)

