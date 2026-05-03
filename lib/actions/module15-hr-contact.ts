"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import {
    HRContactService,
    HRContactSchema,
    UpdateHRContactSchema
} from "@/lib/services/hr-contact.service"
import { z } from "zod"

// Compatibility action surface: CompanyService is the canonical HR contact owner.
// Keep these actions as adapters while callers migrate fully to module3-company.

export const createHRContact = createProtectedAction(
    HRContactSchema,
    async (payload, session) => {
        const contact = await HRContactService.create(
            { id: session.user.id, role: session.user.role },
            {
                ...payload,
                isPrimary: payload.isPrimary ?? false
            }
        )
        return contact
    }
)

const GetByCompanySchema = z.object({ companyId: z.string().min(1) })

export const getHRContacts = createProtectedAction(
    GetByCompanySchema,
    async (payload, session) => {
        const contacts = await HRContactService.getByCompany(
            { id: session.user.id, role: session.user.role },
            payload.companyId
        )
        return contacts
    }
)

export const updateHRContact = createProtectedAction(
    UpdateHRContactSchema,
    async (payload, session) => {
        const contact = await HRContactService.update(
            { id: session.user.id, role: session.user.role },
            payload
        )
        return contact
    }
)

const DeleteContactSchema = z.object({ id: z.string().min(1) })

export const deleteHRContact = createProtectedAction(
    DeleteContactSchema,
    async (payload, session) => {
        await HRContactService.delete(
            { id: session.user.id, role: session.user.role },
            payload.id
        )
        return { success: true }
    }
)

const SetPrimarySchema = z.object({ id: z.string().min(1) })

export const setHRContactPrimary = createProtectedAction(
    SetPrimarySchema,
    async (payload, session) => {
        const contact = await HRContactService.setPrimary(
            { id: session.user.id, role: session.user.role },
            payload.id
        )
        return contact
    }
)

