
import connectDB from "@/lib/db/mongodb"
import Invoice from "@/lib/db/models/Invoice"
import Company from "@/lib/db/models/Company"
import Placement from "@/lib/db/models/Placement"
import Candidate from "@/lib/db/models/Candidate"
import AuditLog from "@/lib/db/models/AuditLog"
import { AppError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { serializeDoc } from "@/lib/utils/serialize"
import { ensureSequenceFloor, getNextSequence } from "@/lib/services/sequence.service"
import { z } from "zod"
import type { ClientSession } from "mongoose"

export const InvoiceStatusSchema = z.enum(['DRAFT', 'SENT', 'PAID', 'VOID'])

export const CreateInvoiceSchema = z.object({
    companyId: z.string().min(1),
    requirementId: z.string().optional(),
    placementId: z.string().optional(),
    amount: z.number().positive(),
    currency: z.string().default('INR'),
    issueDate: z.coerce.date().optional(),
    dueDate: z.coerce.date().optional(),
})

export const UpdateInvoiceStatusSchema = z.object({
    invoiceId: z.string().min(1),
    status: InvoiceStatusSchema,
    pdfUrl: z.string().url().optional(),
})

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>
export type UpdateInvoiceStatusInput = z.infer<typeof UpdateInvoiceStatusSchema>

interface UserContext {
    id: string
    role: string
}

interface CreateInvoiceOptions {
    session?: ClientSession | null
    skipPermissionCheck?: boolean
}

const VIEW_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR"] as const
const ACTION_ROLES = ["SUPER_ADMIN", "COORDINATOR"] as const
export class InvoiceService {
    private static async getNextInvoiceNumber(issueDate: Date, session?: ClientSession | null) {
        const year = issueDate.getUTCFullYear()
        const invoicePrefix = `INV-${year}`
        const sequenceKey = `invoice:${year}`

        const latestInvoiceQuery = Invoice.findOne({ invoiceNumber: { $regex: `^${invoicePrefix}-\\d+$` } })
            .sort({ invoiceNumber: -1 })
            .select('invoiceNumber')
            .lean()
        if (session) latestInvoiceQuery.session(session)

        const latestInvoice = await latestInvoiceQuery
        if (latestInvoice?.invoiceNumber) {
            const lastToken = latestInvoice.invoiceNumber.split('-').pop() || '0'
            const lastSequence = Number.parseInt(lastToken, 10)
            await ensureSequenceFloor(sequenceKey, Number.isFinite(lastSequence) ? lastSequence : 0, session)
        }

        const yearlySequence = await getNextSequence(sequenceKey, session)
        return `${invoicePrefix}-${String(yearlySequence).padStart(5, '0')}`
    }

    /**
     * Create Invoice
     */
    static async create(user: UserContext, data: CreateInvoiceInput, options: CreateInvoiceOptions = {}) {
        if (!options.skipPermissionCheck && !ACTION_ROLES.includes(user.role as any)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()
        const session = options.session ?? null

        const companyQuery = Company.findOne({ _id: data.companyId, deletedAt: null })
        if (session) companyQuery.session(session)
        const company = await companyQuery
        if (!company) throw new NotFoundError("Company not found")

        let feeAmount = data.amount
        const issueDate = data.issueDate ?? new Date()
        const dueDate = data.dueDate
            ? new Date(data.dueDate)
            : new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000)

        if (dueDate < issueDate) {
            throw new AppError("Due date cannot be before issue date")
        }

        if (data.placementId) {
            const placementQuery = Placement.findById(data.placementId)
            if (session) placementQuery.session(session)
            const placement = await placementQuery
            if (!placement) throw new NotFoundError("Placement not found")
            if (placement.companyId.toString() !== data.companyId) {
                throw new AppError("Placement does not belong to this company")
            }
            if (placement.feeAmount) {
                feeAmount = placement.feeAmount
            }
        }

        if (feeAmount <= 0) {
            throw new AppError("Invoice amount must be greater than zero")
        }

        const invoiceNumber = await InvoiceService.getNextInvoiceNumber(issueDate, session)

        const invoice = new Invoice({
            invoiceNumber,
            companyId: data.companyId,
            requirementId: data.requirementId ?? null,
            placementId: data.placementId ?? null,
            amount: feeAmount,
            currency: data.currency,
            status: 'DRAFT',
            issueDate,
            dueDate,
        })
        await invoice.save(session ? { session } : undefined)

        if (session) {
            await AuditLog.create([
                {
                    userId: user.id,
                    action: "INVOICE_CREATED",
                    entity: "Invoice",
                    entityId: invoice._id.toString(),
                    newValue: { companyId: data.companyId, amount: feeAmount, invoiceNumber },
                },
            ], { session })
        } else {
            await AuditLog.create({
                userId: user.id,
                action: "INVOICE_CREATED",
                entity: "Invoice",
                entityId: invoice._id.toString(),
                newValue: { companyId: data.companyId, amount: feeAmount, invoiceNumber },
            })
        }

        return serializeDoc(invoice.toObject())
    }

    /**
     * Get All Invoices
     */
    static async getAll(user: UserContext, filters?: { status?: string; companyId?: string }) {
        if (!VIEW_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const query: Record<string, unknown> = {}
        if (filters?.status === 'OVERDUE') {
            query.status = 'SENT'
            query.dueDate = { $lt: new Date() }
        } else if (filters?.status) {
            query.status = filters.status
        }
        if (filters?.companyId) query.companyId = filters.companyId

        const invoices = await Invoice.find(query).sort({ createdAt: -1 }).lean()

        // Populate Company Details
        const companyIds = [...new Set(invoices.map(i => i.companyId.toString()))]
        const companies = await Company.find({ _id: { $in: companyIds } }).lean()
        const companyMap = Object.fromEntries(companies.map(c => [c._id.toString(), c]))

        const placementIds = [...new Set(invoices
            .map(i => i.placementId?.toString())
            .filter((id): id is string => Boolean(id)))]

        const placements = placementIds.length > 0
            ? await Placement.find({ _id: { $in: placementIds } }).lean()
            : []
        const placementMap = Object.fromEntries(placements.map(p => [p._id.toString(), p]))

        const candidateIds = [...new Set(placements.map(p => p.candidateId.toString()))]
        const candidates = candidateIds.length > 0
            ? await Candidate.find({ _id: { $in: candidateIds } }).select('name').lean()
            : []
        const candidateMap = Object.fromEntries(candidates.map(c => [c._id.toString(), c]))

        const now = new Date()

        return invoices.map(i => ({
            ...serializeDoc(i),
            status: i.status === 'SENT' && i.dueDate && new Date(i.dueDate) < now ? 'OVERDUE' : i.status,
            company: companyMap[i.companyId.toString()] ? {
                _id: companyMap[i.companyId.toString()]._id.toString(),
                name: companyMap[i.companyId.toString()].name,
            } : null,
            placement: i.placementId && placementMap[i.placementId.toString()] ? {
                _id: placementMap[i.placementId.toString()]._id.toString(),
                candidate: candidateMap[placementMap[i.placementId.toString()].candidateId.toString()] ? {
                    _id: candidateMap[placementMap[i.placementId.toString()].candidateId.toString()]._id.toString(),
                    name: candidateMap[placementMap[i.placementId.toString()].candidateId.toString()].name,
                } : null,
            } : null,
        }))
    }

    /**
     * Get Invoice By ID
     */
    static async getById(user: UserContext, invoiceId: string) {
        if (!VIEW_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const invoice = await Invoice.findById(invoiceId).lean()
        if (!invoice) throw new NotFoundError("Invoice not found")

        const company = await Company.findById(invoice.companyId).lean()

        return {
            ...serializeDoc(invoice),
            company: company ? {
                _id: company._id.toString(),
                name: company.name,
                location: company.location,
            } : null,
        }
    }

    /**
     * Update Status
     */
    static async updateStatus(user: UserContext, data: UpdateInvoiceStatusInput) {
        if (!ACTION_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const invoice = await Invoice.findById(data.invoiceId)
        if (!invoice) throw new NotFoundError("Invoice not found")

        const validTransitions: Record<string, string[]> = {
            DRAFT: ['SENT', 'VOID'],
            SENT: ['PAID', 'VOID'],
            PAID: [],
            VOID: [],
        }

        if (!validTransitions[invoice.status]?.includes(data.status)) {
            throw new AppError(`Cannot transition from ${invoice.status} to ${data.status}`)
        }

        const oldStatus = invoice.status
        invoice.status = data.status
        if (data.pdfUrl) invoice.pdfUrl = data.pdfUrl

        await invoice.save()

        await AuditLog.create({
            userId: user.id,
            action: "INVOICE_STATUS_UPDATED",
            entity: "Invoice",
            entityId: invoice._id.toString(),
            oldValue: { status: oldStatus },
            newValue: { status: invoice.status },
        })

        return serializeDoc(invoice.toObject())
    }

    /**
     * Delete Invoice (Draft Only)
     */
    static async delete(user: UserContext, invoiceId: string) {
        if (user.role !== "SUPER_ADMIN") throw new ForbiddenError("Forbidden")

        await connectDB()

        const invoice = await Invoice.findById(invoiceId)
        if (!invoice) throw new NotFoundError("Invoice not found")

        if (invoice.status !== 'DRAFT') throw new AppError("Only DRAFT invoices can be deleted")

        const oldValue = invoice.toObject()
        await Invoice.deleteOne({ _id: invoiceId })

        await AuditLog.create({
            userId: user.id,
            action: "INVOICE_DELETED",
            entity: "Invoice",
            entityId: invoiceId,
            oldValue,
        })

        return { success: true }
    }

    /**
     * Get Metrics
     */
    static async getMetrics(user: UserContext) {
        if (!VIEW_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const now = new Date()

        const [paidMetrics, pendingMetrics, overdueMetrics] = await Promise.all([
            // Total Invoiced (Lifetime Value) - typically PAID invoices
            Invoice.aggregate([
                { $match: { status: 'PAID' } },
                { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
            ]),
            // Outstanding (Pending) - Sent but not yet due
            Invoice.aggregate([
                {
                    $match: {
                        status: 'SENT',
                        dueDate: { $gte: now }
                    }
                },
                { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
            ]),
            // Overdue - Sent and past due (or explicitly marked OVERDUE if supported)
            Invoice.aggregate([
                {
                    $match: {
                        status: 'SENT',
                        dueDate: { $lt: now }
                    }
                },
                { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
            ])
        ])

        return {
            totalInvoiced: paidMetrics[0]?.totalAmount || 0,
            countPaid: paidMetrics[0]?.count || 0,

            totalPending: pendingMetrics[0]?.totalAmount || 0,
            countPending: pendingMetrics[0]?.count || 0,

            totalOverdue: overdueMetrics[0]?.totalAmount || 0,
            countOverdue: overdueMetrics[0]?.count || 0
        }
    }
}
