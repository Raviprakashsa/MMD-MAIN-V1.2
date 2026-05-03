
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"
import { CompanyService } from "@/lib/services/company.service"

// Schemas
export const HRContactSchema = z.object({
    companyId: z.string().min(1),
    name: z.string().min(2),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    designation: z.string().optional(),
    isPrimary: z.boolean().default(false),
})

export const UpdateHRContactSchema = HRContactSchema.partial().extend({
    id: z.string().min(1),
})

// Types
export type CreateHRContactInput = z.infer<typeof HRContactSchema>
export type UpdateHRContactInput = z.infer<typeof UpdateHRContactSchema>

interface UserContext {
    id: string
    role: string
}

export class HRContactService {

    /**
     * Create HR Contact
     */
    static async create(user: UserContext, data: CreateHRContactInput) {
        // Deprecated path: maintained for compatibility, routed through CompanyService.
        const contact = await CompanyService.createHRContact(
            { id: user.id, role: user.role },
            {
                companyId: data.companyId,
                name: data.name,
                phone: data.phone,
                email: data.email,
                designation: data.designation,
                isPrimary: data.isPrimary,
            }
        )

        return serializeDoc(contact)
    }

    /**
     * Get HR Contacts for Company
     */
    static async getByCompany(user: UserContext, companyId: string) {
        // Deprecated path: maintained for compatibility, routed through CompanyService.
        const contacts = await CompanyService.getHRContacts(
            { id: user.id, role: user.role },
            companyId
        )
        return serializeDocs(contacts)
    }

    /**
     * Update HR Contact
     */
    static async update(user: UserContext, data: UpdateHRContactInput) {
        // Deprecated path: maintained for compatibility, routed through CompanyService.
        const contact = await CompanyService.updateHRContact(
            { id: user.id, role: user.role },
            {
                id: data.id,
                name: data.name,
                phone: data.phone,
                email: data.email,
                designation: data.designation,
                isPrimary: data.isPrimary,
            }
        )

        return serializeDoc(contact)
    }

    /**
     * Delete HR Contact (Soft Delete)
     */
    static async delete(user: UserContext, contactId: string) {
        // Deprecated path: maintained for compatibility, routed through CompanyService.
        return CompanyService.deleteHRContact(
            { id: user.id, role: user.role },
            contactId
        )
    }

    /**
     * Set Primary
     */
    static async setPrimary(user: UserContext, contactId: string) {
        // Deprecated path: maintained for compatibility, routed through CompanyService.
        const contact = await CompanyService.setHRContactPrimary(
            { id: user.id, role: user.role },
            contactId
        )

        return serializeDoc(contact)
    }
}
