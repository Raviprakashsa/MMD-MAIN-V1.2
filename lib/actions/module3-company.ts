"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import {
  CompanySchema,
  CompanyUpdateWithIdSchema,
} from "@/lib/validators/common"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { createProtectedAction } from "@/lib/core/action-client"
import { CompanyService } from "@/lib/services/company.service"

// Local Schemas
const GetByIdSchema = z.object({ id: z.string().min(1) })
const DeleteSchema = z.object({ id: z.string().min(1) })

/**
 * Get Companies Action
 */
export const getCompanies = createProtectedAction(
  z.any().optional(),
  async (_, session) => {
    const companies = await CompanyService.getAll({ ...session.user })
    return serializeDocs(companies)
  }
)

/**
 * Get Single Company Action
 */
export const getCompanyById = createProtectedAction(
  GetByIdSchema.or(z.string().min(1).transform(id => ({ id }))), // Input can be string or object
  async (payload, session) => {
    const id = typeof payload === 'string' ? payload : payload.id
    const company = await CompanyService.getById(
      { ...session.user },
      id
    )
    return serializeDoc(company)
  }
)

/**
 * Create Company Action
 */
export const createCompanyAction = createProtectedAction(
  CompanySchema,
  async (payload, session) => {
    const company = await CompanyService.create(
      { ...session.user },
      payload
    )
    revalidatePath('/dashboard/companies')
    return serializeDoc(company)
  }
)

/**
 * Update Company Action
 */
export const updateCompanyAction = createProtectedAction(
  CompanyUpdateWithIdSchema,
  async (payload, session) => {
    const { id, ...data } = payload
    const company = await CompanyService.update(
      { ...session.user },
      id,
      data
    )
    revalidatePath('/dashboard/companies')
    return serializeDoc(company)
  }
)

/**
 * Delete Company Action
 */
export const deleteCompany = createProtectedAction(
  DeleteSchema.or(z.string().min(1).transform(id => ({ id }))), // Support string input for backward compat
  async (payload, session) => {
    const id = typeof payload === 'string' ? payload : payload.id
    await CompanyService.delete(
      { ...session.user },
      id
    )
    revalidatePath('/dashboard/companies')
    return { success: true }
  }
)
