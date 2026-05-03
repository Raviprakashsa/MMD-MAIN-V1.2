import connectDB from "@/lib/db/mongodb"
import Company from "@/lib/db/models/Company"
import HRContact from "@/lib/db/models/HRContact"
import AuditLog from "@/lib/db/models/AuditLog"
import Requirement from "@/lib/db/models/Requirement"
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { CompanySchema, CompanyUpdateWithIdSchema, HRContactSchema } from "@/lib/validators/common"
import { z } from "zod"

// Types
export type CompanyInput = z.infer<typeof CompanySchema>
export type CompanyUpdateInput = z.infer<typeof CompanyUpdateWithIdSchema>
export type HRContactInput = z.infer<typeof HRContactSchema>

const CompanyHRContactCreateSchema = HRContactSchema.extend({
    companyId: z.string().min(1),
})

const CompanyHRContactUpdateSchema = CompanyHRContactCreateSchema.partial().extend({
    id: z.string().min(1),
})

export type CompanyHRContactCreateInput = z.infer<typeof CompanyHRContactCreateSchema>
export type CompanyHRContactUpdateInput = z.infer<typeof CompanyHRContactUpdateSchema>

// Constants
const ALLOWED_CREATORS = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER"] as const
const ACTIVE_REQ_STATUSES = ['PENDING_INTAKE', 'AWAITING_JD', 'ACTIVE', 'SOURCING', 'INTERVIEWING', 'OFFER']

// Helpers
function buildCaseInsensitive(value: string) {
    const specials = '.^$|?*+()[]{}\\'
    const escaped = value
        .split('')
        .map((char) => (specials.includes(char) ? `\\${char}` : char))
        .join('')
    return new RegExp(`^${escaped}$`, 'i')
}

export class CompanyService {
    /**
     * Create a new company with HR contacts
     */
    static async create(user: { id: string, role: string }, data: CompanyInput) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("You do not have permission to create companies")
        }

        await connectDB()

        // Validation: MOU Status
        if (data.mouStatus === "SIGNED" && !data.mouDocumentUrl) {
            throw new AppError("MOU document URL is required when status is SIGNED")
        }

        // Duplicate Check
        const duplicate = await Company.findOne({
            name: buildCaseInsensitive(data.name.trim()),
            location: buildCaseInsensitive(data.location.trim()),
            deletedAt: null
        })

        if (duplicate) {
            throw new ConflictError("Company with this name and location already exists")
        }

        // Transaction: Create Company + Contacts
        // Note: MongoDB transactions require replica set. Assuming standalone for dev, so sequential.
        // If critical, we should use session.withTransaction()

        const company = await Company.create({
            name: data.name.trim(),
            category: data.category.trim(),
            sector: data.sector,
            location: data.location.trim(),
            website: data.website,
            hiringType: data.hiringType,
            source: data.source,
            mouStatus: data.mouStatus,
            mouDocumentUrl: data.mouDocumentUrl,
            mouStartDate: data.mouStartDate ?? null,
            mouEndDate: data.mouEndDate ?? null,
            commercialPercent: data.commercialPercent ?? null,
            paymentTerms: data.paymentTerms,
            assignedCoordinatorId: data.assignedCoordinatorId,
        })

        if (data.hrContacts?.length) {
            const contactsWithCompany = data.hrContacts.map((c: HRContactInput) => ({ ...c, companyId: company._id }))
            await HRContact.insertMany(contactsWithCompany)
        }

        await AuditLog.create({
            userId: user.id,
            action: "COMPANY_CREATED",
            entity: "Company",
            entityId: company._id.toString(),
            newValue: data,
        })

        return company.toObject()
    }

    /**
     * Update existing company
     */
    static async update(user: { id: string, role: string }, id: string, data: Partial<CompanyUpdateInput>) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("You do not have permission to modify companies")
        }

        await connectDB()

        const company = await Company.findOne({ _id: id, deletedAt: null })
        if (!company) throw new NotFoundError("Company not found")

        const oldValue = company.toObject()

        // Validation: MOU
        if (data.mouStatus === "SIGNED" && !data.mouDocumentUrl && !company.mouDocumentUrl) {
            throw new AppError("MOU document URL is required when status is SIGNED")
        }

        // Validation: Identity Change Guard
        const isIdentityChange =
            (data.name && data.name.trim() !== company.name) ||
            (data.location && data.location.trim() !== company.location)

        if (isIdentityChange) {
            const hasActiveRequirements = await Requirement.countDocuments({
                companyId: id,
                status: { $in: ACTIVE_REQ_STATUSES },
            })

            if (hasActiveRequirements > 0) {
                throw new AppError("Cannot change Company Name or Location while active requirements exist")
            }
        }

        // Apply Updates
        if (data.name) company.name = data.name.trim()
        if (data.category) company.category = data.category.trim()
        if (data.sector) company.sector = data.sector
        if (data.location) company.location = data.location.trim()
        if (data.website !== undefined) company.website = data.website
        if (data.hiringType) company.hiringType = data.hiringType
        if (data.source) company.source = data.source
        if (data.mouStatus) company.mouStatus = data.mouStatus
        if (data.mouDocumentUrl !== undefined) company.mouDocumentUrl = data.mouDocumentUrl
        if (data.mouStartDate !== undefined) company.mouStartDate = data.mouStartDate as any
        if (data.mouEndDate !== undefined) company.mouEndDate = data.mouEndDate as any
        if (data.commercialPercent !== undefined) company.commercialPercent = data.commercialPercent as any
        if (data.paymentTerms !== undefined) company.paymentTerms = data.paymentTerms
        if (data.assignedCoordinatorId) company.assignedCoordinatorId = data.assignedCoordinatorId as any

        // HR Contacts Update Strategy: Replace All
        if (data.hrContacts) {
            await HRContact.updateMany(
                { companyId: company._id, deletedAt: null },
                { $set: { deletedAt: new Date() } }
            )

            if (data.hrContacts.length) {
                const contactsWithCompany = data.hrContacts.map((contact: HRContactInput) => ({
                    ...contact,
                    companyId: company._id,
                    deletedAt: null,
                }))
                await HRContact.insertMany(contactsWithCompany)
            }
        }

        await company.save()

        await AuditLog.create({
            userId: user.id,
            action: "COMPANY_UPDATED",
            entity: "Company",
            entityId: company._id.toString(),
            oldValue,
            newValue: company.toObject(),
        })

        return company.toObject()
    }

    /**
     * Get all companies with aggregated data
     */
    static async getAll(user: { id: string, role: string }) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("permission denied")
        }

        await connectDB()

        // 1. Fetch Companies
        const companies = await Company.find({ deletedAt: null })
            .sort({ createdAt: -1 })
            .lean()

        if (!companies.length) return []

        const companyIds = companies.map(c => c._id)

        // 2. Fetch Contacts in Batch
        const contacts = await HRContact.find({
            companyId: { $in: companyIds },
            deletedAt: null
        }).lean()

        // 3. Count Active Requirements using Aggregation (More Efficient)
        const requirementCounts = await Requirement.aggregate([
            {
                $match: {
                    companyId: { $in: companyIds },
                    status: { $in: ACTIVE_REQ_STATUSES },
                }
            },
            {
                $group: {
                    _id: '$companyId',
                    count: { $sum: 1 }
                }
            }
        ])

        const requirementMap = Object.fromEntries(
            requirementCounts.map(r => [r._id.toString(), r.count])
        )

        // 4. Merge Data
        return companies.map(company => ({
            ...company,
            _id: company._id.toString(),
            contacts: contacts
                .filter(c => c.companyId.toString() === company._id.toString())
                .map(c => ({
                    ...c,
                    _id: c._id.toString(),
                    companyId: c.companyId.toString()
                })),
            activeRequirements: requirementMap[company._id.toString()] || 0,
        }))
    }

    /**
     * Get single company details
     */
    static async getById(user: { id: string, role: string }, id: string) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("permission denied")
        }

        await connectDB()

        const company = await Company.findOne({ _id: id, deletedAt: null }).lean()
        if (!company) throw new NotFoundError("Company not found")

        const contacts = await HRContact.find({
            companyId: company._id,
            deletedAt: null
        }).lean()

        const requirements = await Requirement.find({ companyId: company._id })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean()

        return {
            ...company,
            _id: company._id.toString(),
            contacts: contacts.map(c => ({ ...c, _id: c._id.toString(), companyId: c.companyId.toString() })),
            requirements: requirements.map(r => ({ ...r, _id: r._id.toString(), companyId: r.companyId.toString() })),
        }
    }

    /**
     * Canonical HR Contact getter by company.
     */
    static async getHRContacts(user: { id: string, role: string }, companyId: string) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("permission denied")
        }

        await connectDB()

        const company = await Company.findOne({ _id: companyId, deletedAt: null }).select('_id').lean()
        if (!company) throw new NotFoundError("Company not found")

        const contacts = await HRContact.find({ companyId, deletedAt: null })
            .sort({ isPrimary: -1, name: 1 })
            .lean()

        return contacts.map((contact) => ({
            ...contact,
            _id: contact._id.toString(),
            companyId: contact.companyId.toString(),
        }))
    }

    /**
     * Canonical HR Contact create.
     */
    static async createHRContact(user: { id: string, role: string }, data: CompanyHRContactCreateInput) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("permission denied")
        }

        await connectDB()

        const company = await Company.findOne({ _id: data.companyId, deletedAt: null }).select('_id name')
        if (!company) throw new NotFoundError("Company not found")

        if (data.isPrimary) {
            await HRContact.updateMany(
                { companyId: data.companyId, isPrimary: true, deletedAt: null },
                { $set: { isPrimary: false } }
            )
        }

        const contact = await HRContact.create({
            companyId: data.companyId,
            name: data.name,
            phone: data.phone,
            email: data.email,
            linkedIn: data.linkedIn,
            designation: data.designation,
            isPrimary: data.isPrimary ?? false,
        })

        await AuditLog.create({
            userId: user.id,
            action: "HR_CONTACT_CREATED",
            entity: "Company",
            entityId: company._id.toString(),
            newValue: {
                contactId: contact._id.toString(),
                name: contact.name,
                companyId: data.companyId,
            },
        })

        return {
            ...contact.toObject(),
            _id: contact._id.toString(),
            companyId: String(contact.companyId),
        }
    }

    /**
     * Canonical HR Contact update.
     */
    static async updateHRContact(user: { id: string, role: string }, data: CompanyHRContactUpdateInput) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("permission denied")
        }

        await connectDB()

        const contact = await HRContact.findOne({ _id: data.id, deletedAt: null })
        if (!contact) throw new NotFoundError("Contact not found")

        const oldValue = contact.toObject()

        if (data.isPrimary && !contact.isPrimary) {
            await HRContact.updateMany(
                { companyId: contact.companyId, isPrimary: true, _id: { $ne: contact._id }, deletedAt: null },
                { $set: { isPrimary: false } }
            )
        }

        if (data.name !== undefined) contact.name = data.name
        if (data.phone !== undefined) contact.phone = data.phone
        if (data.email !== undefined) contact.email = data.email
        if (data.linkedIn !== undefined) contact.linkedIn = data.linkedIn
        if (data.designation !== undefined) contact.designation = data.designation
        if (data.isPrimary !== undefined) contact.isPrimary = data.isPrimary

        await contact.save()

        await AuditLog.create({
            userId: user.id,
            action: "HR_CONTACT_UPDATED",
            entity: "Company",
            entityId: String(contact.companyId),
            oldValue,
            newValue: contact.toObject(),
        })

        return {
            ...contact.toObject(),
            _id: contact._id.toString(),
            companyId: String(contact.companyId),
        }
    }

    /**
     * Canonical HR Contact delete (soft delete).
     */
    static async deleteHRContact(user: { id: string, role: string }, contactId: string) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("permission denied")
        }

        await connectDB()

        const contact = await HRContact.findOne({ _id: contactId, deletedAt: null })
        if (!contact) throw new NotFoundError("Contact not found")

        const contactCount = await HRContact.countDocuments({
            companyId: contact.companyId,
            deletedAt: null,
        })

        if (contactCount <= 1) {
            throw new AppError("Cannot delete the only HR contact for this company")
        }

        if (contact.isPrimary) {
            const nextPrimary = await HRContact.findOne({
                companyId: contact.companyId,
                _id: { $ne: contact._id },
                deletedAt: null,
            }).sort({ createdAt: 1 })

            if (nextPrimary) {
                nextPrimary.isPrimary = true
                await nextPrimary.save()
            }
        }

        contact.deletedAt = new Date()
        await contact.save()

        await AuditLog.create({
            userId: user.id,
            action: "HR_CONTACT_DELETED",
            entity: "Company",
            entityId: String(contact.companyId),
            oldValue: { contactId: contactId, deletedAt: null },
            newValue: { deletedAt: contact.deletedAt },
        })

        return { success: true }
    }

    /**
     * Canonical HR Contact set primary.
     */
    static async setHRContactPrimary(user: { id: string, role: string }, contactId: string) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("permission denied")
        }

        await connectDB()

        const contact = await HRContact.findOne({ _id: contactId, deletedAt: null })
        if (!contact) throw new NotFoundError("Contact not found")

        await HRContact.updateMany(
            { companyId: contact.companyId, isPrimary: true, deletedAt: null },
            { $set: { isPrimary: false } }
        )

        contact.isPrimary = true
        await contact.save()

        await AuditLog.create({
            userId: user.id,
            action: "HR_CONTACT_SET_PRIMARY",
            entity: "Company",
            entityId: String(contact.companyId),
            newValue: { contactId: contactId, isPrimary: true },
        })

        return {
            ...contact.toObject(),
            _id: contact._id.toString(),
            companyId: String(contact.companyId),
        }
    }

    /**
     * Delete company
     */
    static async delete(user: { id: string, role: string }, id: string) {
        if (!ALLOWED_CREATORS.includes(user.role as any)) {
            throw new ForbiddenError("permission denied")
        }

        await connectDB()

        const company = await Company.findOne({ _id: id, deletedAt: null })
        if (!company) throw new NotFoundError("Company not found")

        // Guard: Active Requirements
        const activeReqs = await Requirement.countDocuments({
            companyId: id,
            status: { $in: ACTIVE_REQ_STATUSES },
        })

        if (activeReqs > 0) {
            throw new AppError(`Cannot delete company with ${activeReqs} active requirement(s)`)
        }

        // Soft Delete
        company.deletedAt = new Date()
        await company.save()

        // Soft Delete Contacts
        await HRContact.updateMany(
            { companyId: id, deletedAt: null },
            { $set: { deletedAt: new Date() } }
        )

        await AuditLog.create({
            userId: user.id,
            action: "COMPANY_DELETED",
            entity: "Company",
            entityId: id,
            oldValue: { name: company.name },
        })

        return true
    }

    /**
     * Restore Company
     */
    static async restore(user: { id: string, role: string }, id: string) {
        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))) throw new ForbiddenError("Forbidden")

        await connectDB()

        const company = await Company.findById(id)
        if (!company) throw new NotFoundError("Company not found")
        if (!company.deletedAt) throw new AppError("Company is not archived")

        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        if (company.deletedAt < thirtyDaysAgo) {
            throw new AppError("Restore window expired (30 days)")
        }

        const oldDeletedAt = company.deletedAt
        company.deletedAt = null
        await company.save()

        await AuditLog.create({
            userId: user.id,
            action: "COMPANY_RESTORED",
            entity: "Company",
            entityId: id,
            oldValue: { deletedAt: oldDeletedAt },
            newValue: { deletedAt: null },
        })

        return company.toObject()
    }
}
