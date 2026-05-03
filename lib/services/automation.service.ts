
import connectDB from "@/lib/db/mongodb"
import Requirement from "@/lib/db/models/Requirement"
import ApplicationForm from "@/lib/db/models/ApplicationForm"
import Candidate from "@/lib/db/models/Candidate"
import CandidateActivity from "@/lib/db/models/CandidateActivity"
import Company from "@/lib/db/models/Company"
import AuditLog from "@/lib/db/models/AuditLog"
import { AppError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/core/app-error"
import { z } from "zod"
import {
    applyGeneratedContent,
    generateApplicationForm,
    generateHiringContent,
    regenerateSingleContent,
} from "@/lib/automation/content-generator"
import { templates } from "@/lib/templates/hiring-messages"
import {
    deleteStoredFile,
    RESUME_ALLOWED_EXTENSIONS,
    RESUME_ALLOWED_MIME_TYPES,
} from "@/lib/storage/document-storage"
import { generateCandidateEmbedding } from "@/lib/automation/embeddings"

const PublicSlugSchema = z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid application link')

// Schemas
export const GenerateAutomationSchema = z.object({
    requirementId: z.string().min(1),
})

export const RegenerateContentSchema = z.object({
    requirementId: z.string().min(1),
    type: z.enum(["whatsapp", "email", "linkedIn"] as const),
})

export const GetFormSchema = z.object({ slug: PublicSlugSchema })

function hasAllowedResumeExtension(fileName: string): boolean {
    const lowered = fileName.trim().toLowerCase()
    return RESUME_ALLOWED_EXTENSIONS.some((extension) => lowered.endsWith(extension))
}

function hasAllowedResumeMimeType(mimeType: string): boolean {
    const lowered = mimeType.trim().toLowerCase()
    return RESUME_ALLOWED_MIME_TYPES.some((allowed) => allowed === lowered)
}

export const SubmitApplicationSchema = z.object({
    slug: PublicSlugSchema,
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email(),
    resumeStorageKey: z.string().min(1).optional(),
    resumeMimeType: z.string().min(1).optional(),
    resumeFileName: z.string().min(1).optional(),
    resumeSizeBytes: z.number().int().positive().optional(),
    skills: z.array(z.string().min(1)).default([]),
    college: z.string().optional(),
    yearsExperience: z.number().nonnegative().optional(),
}).superRefine((data, context) => {
    const hasResumeMetadata =
        Boolean(data.resumeStorageKey) ||
        Boolean(data.resumeMimeType) ||
        Boolean(data.resumeFileName) ||
        data.resumeSizeBytes !== undefined

    if (!hasResumeMetadata) {
        return
    }

    if (!data.resumeStorageKey || !data.resumeMimeType || !data.resumeFileName || data.resumeSizeBytes === undefined) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Resume upload metadata is incomplete',
            path: ['resumeStorageKey'],
        })
        return
    }

    if (!hasAllowedResumeMimeType(data.resumeMimeType)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Unsupported resume file type',
            path: ['resumeMimeType'],
        })
    }

    if (!hasAllowedResumeExtension(data.resumeFileName)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Unsupported resume file extension',
            path: ['resumeFileName'],
        })
    }
})

// Types
export type GenerateAutomationInput = z.infer<typeof GenerateAutomationSchema>
export type RegenerateContentInput = z.infer<typeof RegenerateContentSchema>
export type SubmitApplicationInput = z.infer<typeof SubmitApplicationSchema>

interface UserContext {
    id: string
    role: string
}

interface AutomationOutcome {
    status: 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
    attempts: number
    lastAttemptAt: Date | null
    lastSuccessAt: Date | null
    lastError: string | null
}

const MAX_AUTOMATION_ERROR_LENGTH = 400

function toAutomationError(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message.slice(0, MAX_AUTOMATION_ERROR_LENGTH)
    }

    return 'Automation generation failed'
}

function toAutomationOutcome(source: {
    automationStatus?: string
    automationAttempts?: number
    automationLastAttemptAt?: Date | null
    automationLastSuccessAt?: Date | null
    automationLastError?: string | null
}): AutomationOutcome {
    const status = source.automationStatus
    return {
        status: (status === 'PROCESSING' || status === 'COMPLETED' || status === 'FAILED') ? status : 'NOT_STARTED',
        attempts: source.automationAttempts ?? 0,
        lastAttemptAt: source.automationLastAttemptAt ?? null,
        lastSuccessAt: source.automationLastSuccessAt ?? null,
        lastError: source.automationLastError ?? null,
    }
}

export class AutomationService {

    private static absoluteUrl(path: string) {
        const base = process.env.NEXT_PUBLIC_APP_URL || ""
        return `${base}${path}`
    }

    private static candidateResumePath(candidateId: string) {
        return `/api/candidates/${candidateId}/resume`
    }

    private static resumeNamespacePrefix(slug: string) {
        return `application-${slug}/`
    }

    private static ensureRole(user: UserContext, ownerId: string) {
        if ((['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) || user.role === "COORDINATOR" || user.role === "RECRUITER") return true
        return ownerId === user.id
    }

    /**
     * Generate Automation (Content + Form)
     */
    static async generateAutomation(user: UserContext, data: GenerateAutomationInput) {
        await connectDB()

        const requirement = await Requirement.findById(data.requirementId)
        if (!requirement) throw new NotFoundError("Requirement not found")

        if (['CLOSED_HIRED', 'CLOSED_NOT_HIRED', 'ON_HOLD'].includes(requirement.status)) {
            throw new AppError("Cannot generate automation for closed/on-hold requirement")
        }

        if (!this.ensureRole(user, requirement.accountOwnerId.toString())) {
            throw new ForbiddenError("Forbidden")
        }

        requirement.automationStatus = 'PROCESSING'
        requirement.automationLastAttemptAt = new Date()
        requirement.automationAttempts = (requirement.automationAttempts || 0) + 1
        requirement.automationLastError = null
        await requirement.save()

        try {
            const { appForm, shareableUrl } = await generateApplicationForm(requirement as any)
            const formUrl = this.absoluteUrl(shareableUrl)
            const content = await generateHiringContent(requirement as any, formUrl)
            await applyGeneratedContent(data.requirementId, content)

            requirement.automationStatus = 'COMPLETED'
            requirement.automationLastSuccessAt = new Date()
            requirement.automationLastError = null
            await requirement.save()

            await AuditLog.create({
                userId: user.id,
                action: "REQUIREMENT_AUTOMATION_GENERATED",
                entity: "Requirement",
                entityId: data.requirementId,
                newValue: {
                    shareableUrl,
                    content,
                    automation: toAutomationOutcome(requirement),
                },
            })

            return {
                applicationFormId: appForm._id?.toString(),
                shareableUrl,
                content,
                automation: toAutomationOutcome(requirement),
            }
        } catch (error) {
            const automationError = toAutomationError(error)

            requirement.automationStatus = 'FAILED'
            requirement.automationLastError = automationError
            await requirement.save()

            await AuditLog.create({
                userId: user.id,
                action: "REQUIREMENT_AUTOMATION_FAILED",
                entity: "Requirement",
                entityId: data.requirementId,
                newValue: {
                    error: automationError,
                    automation: toAutomationOutcome(requirement),
                },
            })

            if (error instanceof AppError) {
                throw error
            }

            if (error instanceof Error) {
                throw new AppError(error.message)
            }

            throw new AppError('Failed to generate automation')
        }
    }

    /**
     * Regenerate Specific Content
     */
    static async regenerateContent(user: UserContext, data: RegenerateContentInput) {
        await connectDB()

        const requirement = await Requirement.findById(data.requirementId)
        if (!requirement) throw new NotFoundError("Requirement not found")

        if (!this.ensureRole(user, requirement.accountOwnerId.toString())) {
            throw new ForbiddenError("Forbidden")
        }

        const appForm = await ApplicationForm.findOne({ requirementId: data.requirementId })
        if (!appForm) throw new AppError("Application form not generated yet")

        const formUrl = this.absoluteUrl(appForm.shareableUrl)
        const updated = await regenerateSingleContent(data.requirementId, data.type, formUrl)

        await AuditLog.create({
            userId: user.id,
            action: "REQUIREMENT_CONTENT_REGENERATED",
            entity: "Requirement",
            entityId: data.requirementId,
            newValue: { type: data.type, content: updated },
        })

        return { type: data.type, content: updated }
    }

    /**
     * Get Public Form Data
     */
    static async getPublicForm(slug: string) {
        await connectDB()

        const shareableUrl = `/apply/${slug}`
        const appForm = await ApplicationForm.findOne({ shareableUrl, isActive: true })
        if (!appForm) throw new NotFoundError("Form not found")

        const requirement = await Requirement.findById(appForm.requirementId)
        if (!requirement) throw new NotFoundError("Requirement not found")

        if (['CLOSED_HIRED', 'CLOSED_NOT_HIRED', 'ON_HOLD'].includes(requirement.status)) {
            throw new AppError("This position is closed or on hold")
        }

        const company = await Company.findById(requirement.companyId)

        return {
            form: {
                id: appForm._id?.toString(),
                shareableUrl: appForm.shareableUrl,
                formFields: appForm.formFields,
            },
            requirement: {
                jobTitle: requirement.jobTitle,
                skills: requirement.skills,
                experienceMin: requirement.experienceMin,
                experienceMax: requirement.experienceMax,
                location: requirement.location,
                workMode: requirement.workMode,
                companyName: company?.name ?? "Company",
                status: requirement.status,
            },
        }
    }

    /**
     * Submit Application
     */
    static async submitApplication(data: SubmitApplicationInput) {
        await connectDB()

        const shareableUrl = `/apply/${data.slug}`
        const appForm = await ApplicationForm.findOne({ shareableUrl, isActive: true })
        if (!appForm) throw new AppError("Form not found or inactive")

        const requirement = await Requirement.findById(appForm.requirementId)
        if (!requirement) throw new NotFoundError("Requirement not found")

        if (['CLOSED_HIRED', 'CLOSED_NOT_HIRED', 'ON_HOLD'].includes(requirement.status)) {
            throw new AppError("This position is closed or on hold")
        }

        const allowedStatuses = ['ACTIVE', 'SOURCING']
        if (!allowedStatuses.includes(requirement.status)) {
            throw new AppError("Applications are not accepted for this status")
        }

        if (data.resumeStorageKey) {
            const expectedPrefix = this.resumeNamespacePrefix(data.slug)
            if (!data.resumeStorageKey.startsWith(expectedPrefix)) {
                throw new AppError('Invalid resume upload reference', 400)
            }

            const existingResumeReference = await Candidate.exists({
                resumeStorageKey: data.resumeStorageKey,
                deletedAt: null,
            })

            if (existingResumeReference) {
                throw new ConflictError('Resume upload reference already used')
            }
        }

        const shouldCleanupResumeOnFailure = Boolean(data.resumeStorageKey)
        let candidateCreated = false

        try {
            const embedding = generateCandidateEmbedding({
                name: data.name,
                skills: data.skills,
                college: data.college,
                yearsExperience: data.yearsExperience,
                resumeFileName: data.resumeFileName,
                requirementKeywords: requirement.skills,
            })

            const candidate = new Candidate({
                requirementId: requirement._id,
                applicationFormId: appForm._id,
                name: data.name,
                phone: data.phone,
                email: data.email.toLowerCase(),
                resumeStorageKey: data.resumeStorageKey,
                resumeMimeType: data.resumeMimeType,
                resumeFileName: data.resumeFileName,
                resumeSizeBytes: data.resumeSizeBytes,
                skills: data.skills,
                college: data.college,
                yearsExperience: data.yearsExperience,
                embedding,
            })

            if (data.resumeStorageKey) {
                candidate.resumeUrl = this.candidateResumePath(candidate._id.toString())
            }

            await candidate.save()
            candidateCreated = true

            await CandidateActivity.create({
                userId: requirement.accountOwnerId,
                candidateId: candidate._id,
                type: 'CREATED',
                notes: `Candidate applied through public form ${shareableUrl}`,
            })

            await AuditLog.create({
                userId: requirement.accountOwnerId,
                action: "APPLICATION_SUBMITTED",
                entity: "Candidate",
                entityId: candidate._id.toString(),
                newValue: { requirementId: requirement._id.toString(), email: candidate.email },
            })

            return { id: candidate._id.toString() }
        } catch (error: any) {
            if (!candidateCreated && shouldCleanupResumeOnFailure && data.resumeStorageKey) {
                await deleteStoredFile(data.resumeStorageKey).catch(() => undefined)
            }

            if (error?.code === 11000) {
                throw new ConflictError("Candidate already applied for this requirement")
            }
            throw error
        }
    }

    /**
     * Preview Templates
     */
    static getTemplates() {
        return templates
    }
}
