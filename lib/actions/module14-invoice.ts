"use server"

import { revalidatePath } from "next/cache"
import { createProtectedAction } from "@/lib/core/action-client"
import { InvoiceService, CreateInvoiceSchema, UpdateInvoiceStatusSchema } from "@/lib/services/invoice.service"
import { z } from "zod"


export const createInvoice = createProtectedAction(
    CreateInvoiceSchema,
    async (payload, session) => {
        const invoice = await InvoiceService.create(
            { id: session.user.id, role: session.user.role },
            payload as any
        )
        revalidatePath('/dashboard/invoices')
        return invoice
    }
)

const GetInvoicesFilterSchema = z.object({
    status: z.string().optional(),
    companyId: z.string().optional(),
})

export const getInvoices = createProtectedAction(
    GetInvoicesFilterSchema.optional(),
    async (payload, session) => {
        const invoices = await InvoiceService.getAll(
            { id: session.user.id, role: session.user.role },
            payload
        )
        return invoices
    }
)

const GetByIdSchema = z.object({ id: z.string() })

export const getInvoiceById = createProtectedAction(
    GetByIdSchema,
    async (payload, session) => {
        const invoice = await InvoiceService.getById(
            { id: session.user.id, role: session.user.role },
            payload.id
        )
        return invoice
    }
)

export const updateInvoiceStatus = createProtectedAction(
    UpdateInvoiceStatusSchema,
    async (payload, session) => {
        const invoice = await InvoiceService.updateStatus(
            { id: session.user.id, role: session.user.role },
            payload
        )
        revalidatePath('/dashboard/invoices')
        return invoice
    }
)

const DeleteInvoiceSchema = z.object({ id: z.string() })

export const deleteInvoice = createProtectedAction(
    DeleteInvoiceSchema,
    async (payload, session) => {
        await InvoiceService.delete(
            { id: session.user.id, role: session.user.role },
            payload.id
        )
        revalidatePath('/dashboard/invoices')
        return { success: true }
    }
)

export const getInvoiceMetrics = createProtectedAction(
    z.object({}).optional(),
    async (_, session) => {
        const metrics = await InvoiceService.getMetrics(
            { id: session.user.id, role: session.user.role }
        )
        return metrics
    }
)
