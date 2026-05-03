
import connectDB from "@/lib/db/mongodb"
import Template from "@/lib/db/models/Template"
import AuditLog from "@/lib/db/models/AuditLog"
import { AppError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { z } from "zod"
import { TemplateSchema } from "@/lib/validators/common"

export const RenderSchema = z.object({ templateId: z.string().min(1), data: z.record(z.string()) })
export const DuplicateSchema = z.object({ templateId: z.string().min(1), name: z.string().optional() })
export const UpdateTemplateSchema = TemplateSchema.partial().extend({ id: z.string().min(1) })
export const DeleteTemplateSchema = z.object({ id: z.string().min(1) })

export type CreateTemplateInput = z.infer<typeof TemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>
export type RenderTemplateInput = z.infer<typeof RenderSchema>
export type DuplicateTemplateInput = z.infer<typeof DuplicateSchema>

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER"] as const
const variableRegex = /\{\{(\w+)\}\}/g

export class TemplateService {

    private static extractVariables(body: string) {
        const matches = Array.from(body.matchAll(variableRegex)).map((m) => m[1])
        const unique = Array.from(new Set(matches))
        return unique
    }

    private static sanitize(body: string) {
        const lowered = body.toLowerCase()
        if (lowered.includes("<script")) throw new AppError("Scripts are not allowed in templates")
        const withoutScripts = body.replaceAll(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        const withoutOnHandlers = withoutScripts.replaceAll(/ on\w+="[^"]*"/gi, "")
        const withoutJsUrls = withoutOnHandlers.replaceAll(/(href|src)="javascript:[^"]*"/gi, '$1="#"')
        return withoutJsUrls
    }

    /**
     * Create Template
     */
    static async create(user: UserContext, data: CreateTemplateInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        const cleanBody = TemplateService.sanitize(data.body)
        const variables = TemplateService.extractVariables(cleanBody)

        await connectDB()

        const template = await Template.create({
            ...data,
            body: cleanBody,
            variables,
            createdBy: user.id,
        })

        await AuditLog.create({
            userId: user.id,
            action: "TEMPLATE_CREATED",
            entity: "Template",
            entityId: template._id.toString(),
            newValue: { name: data.name, category: data.category, variables },
        })

        return serializeDoc(template.toObject())
    }

    /**
     * Get Templates
     */
    static async getAll(user: UserContext) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const query = (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role))
            ? {}
            : { $or: [{ isPublic: true }, { createdBy: user.id }] }

        const templates = await Template.find(query).sort({ updatedAt: -1 }).lean()
        return serializeDocs(templates)
    }

    /**
     * Update Template
     */
    static async update(user: UserContext, data: UpdateTemplateInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const template = await Template.findById(data.id)
        if (!template) throw new NotFoundError("Template not found")

        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && template.createdBy?.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        const oldValue = template.toObject()

        if (data.name !== undefined) template.name = data.name
        if (data.category !== undefined) template.category = data.category
        if (data.subject !== undefined) template.subject = data.subject
        if (data.body !== undefined) {
            const cleanBody = TemplateService.sanitize(data.body)
            template.body = cleanBody
            template.variables = TemplateService.extractVariables(cleanBody)
        }
        if (data.isPublic !== undefined) template.isPublic = data.isPublic

        await template.save()

        await AuditLog.create({
            userId: user.id,
            action: "TEMPLATE_UPDATED",
            entity: "Template",
            entityId: template._id.toString(),
            oldValue,
            newValue: { name: template.name, category: template.category },
        })

        return serializeDoc(template.toObject())
    }

    /**
     * Delete Template
     */
    static async delete(user: UserContext, templateId: string) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const template = await Template.findById(templateId)
        if (!template) throw new NotFoundError("Template not found")

        if ((!['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) && template.createdBy?.toString() !== user.id) {
            throw new AppError("Cannot delete templates created by others")
        }

        const oldValue = template.toObject()
        await Template.deleteOne({ _id: templateId })

        await AuditLog.create({
            userId: user.id,
            action: "TEMPLATE_DELETED",
            entity: "Template",
            entityId: templateId,
            oldValue,
        })

        return { success: true }
    }

    /**
     * Render Template
     */
    static async render(user: UserContext, data: RenderTemplateInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const template = await Template.findById(data.templateId)
        if (!template) throw new NotFoundError("Template not found")

        const missing = (template.variables || []).filter((v: string) => !(v in data.data))
        if (missing.length) {
            throw new AppError(`Missing variables: ${missing.join(', ')}`)
        }

        let rendered = template.body
        for (const [key, value] of Object.entries(data.data)) {
            const re = new RegExp(String.raw`\{\{${key}\}\}`, "g")
            rendered = rendered.replace(re, value)
        }

        return { subject: template.subject, body: rendered }
    }

    /**
     * Duplicate Template
     */
    static async duplicate(user: UserContext, data: DuplicateTemplateInput) {
        if (!ALLOWED_ROLES.includes(user.role as any)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const existing = await Template.findById(data.templateId)
        if (!existing) throw new NotFoundError("Template not found")

        const copy = await Template.create({
            name: data.name || `${existing.name} (Copy)`,
            category: existing.category,
            subject: existing.subject,
            body: existing.body,
            variables: existing.variables,
            createdBy: user.id,
            isPublic: false,
        })

        await AuditLog.create({
            userId: user.id,
            action: "TEMPLATE_DUPLICATED",
            entity: "Template",
            entityId: copy._id.toString(),
            newValue: { from: existing._id.toString(), name: copy.name },
        })

        return serializeDoc(copy.toObject())
    }
}
