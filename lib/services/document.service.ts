
import connectDB from "@/lib/db/mongodb"
import Document from "@/lib/db/models/Document"
import AuditLog from "@/lib/db/models/AuditLog"
import { AppError, ForbiddenError, NotFoundError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"
import { buildDocumentDownloadPath, deleteStoredFile, storeUploadFile } from "@/lib/storage/document-storage"
import { z } from "zod"
import { DocumentSchema, DocumentEntitySchema } from "@/lib/validators/common"
import mongoose from "mongoose"
import { logDataAccess, logDataAccessMany, logDataMutation } from "@/lib/workflow/governance"

export const ListDocumentsSchema = z.object({
    entityType: DocumentEntitySchema,
    entityId: z.string().min(1),
})

export const UploadManagedDocumentSchema = z.object({
    entityType: DocumentEntitySchema,
    entityId: z.string().min(1),
    name: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    fileBuffer: z.instanceof(Buffer),
    category: z.string().optional(),
    tags: z.array(z.string().min(1)).optional(),
})

export type UploadDocumentInput = z.infer<typeof DocumentSchema>
export type ListDocumentsInput = z.infer<typeof ListDocumentsSchema>
export type UploadManagedDocumentInput = z.infer<typeof UploadManagedDocumentSchema>

interface DownloadPayload {
    storageKey?: string
    mimeType?: string
    fileName?: string
    redirectUrl?: string
}

interface UserContext {
    id: string
    role: string
}

const ALLOWED_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER"] as const
const ADMIN_VIEW_ROLES = ["SUPER_ADMIN", "ADMIN", "COORDINATOR"] as const

function hasRole(role: string, roles: readonly string[]) {
    return roles.includes(role)
}

function canViewAllDocuments(role: string) {
    return hasRole(role, ADMIN_VIEW_ROLES)
}

function canUploadDocuments(role: string): boolean {
    return hasRole(role, ALLOWED_ROLES)
}

interface SerializableDocument {
    _id: string
    url: string
    storageKey?: string | null
    mimeType?: string | null
    originalFileName?: string | null
    name?: string | null
}

function withSignedDocumentUrl(document: SerializableDocument): SerializableDocument {
    if (document.storageKey) {
        return {
            ...document,
            url: buildDocumentDownloadPath(document._id),
        }
    }

    return document
}

export class DocumentService {
    /**
     * Upload Document
     */
    static async upload(user: UserContext, data: UploadDocumentInput) {
        if (!canUploadDocuments(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const doc = await Document.create({
            ...data,
            uploadedBy: user.id,
        })

        await AuditLog.create({
            userId: user.id,
            action: "DOCUMENT_UPLOADED",
            entity: data.entityType,
            entityId: data.entityId,
            newValue: { documentId: doc._id.toString(), name: doc.name },
        })

        await logDataMutation(user.id, {
            entity: 'Document',
            entityId: doc._id.toString(),
            action: 'CREATE',
        })

        const serialized = serializeDoc(doc.toObject()) as SerializableDocument
        return withSignedDocumentUrl(serialized)
    }

    /**
     * Upload Managed Document (binary file)
     */
    static async uploadManaged(user: UserContext, data: UploadManagedDocumentInput) {
        if (!canUploadDocuments(user.role)) throw new ForbiddenError("Forbidden")

        const payload = UploadManagedDocumentSchema.parse(data)
        if (payload.sizeBytes !== payload.fileBuffer.byteLength) {
            throw new AppError("Invalid file payload", 400)
        }

        await connectDB()

        const documentId = new mongoose.Types.ObjectId()
        const stored = await storeUploadFile({
            namespace: `${payload.entityType.toLowerCase()}-${payload.entityId}`,
            fileName: payload.fileName,
            mimeType: payload.mimeType,
            buffer: payload.fileBuffer,
        })

        try {
            const doc = await Document.create({
                _id: documentId,
                entityType: payload.entityType,
                entityId: payload.entityId,
                name: payload.name,
                url: `/api/documents/${documentId.toString()}/download`,
                storageKey: stored.storageKey,
                originalFileName: stored.fileName,
                category: payload.category,
                mimeType: stored.mimeType,
                sizeBytes: stored.sizeBytes,
                tags: payload.tags ?? [],
                uploadedBy: user.id,
            })

            await AuditLog.create({
                userId: user.id,
                action: "DOCUMENT_UPLOADED",
                entity: payload.entityType,
                entityId: payload.entityId,
                newValue: {
                    documentId: doc._id.toString(),
                    name: doc.name,
                    storageKey: stored.storageKey,
                    sizeBytes: stored.sizeBytes,
                },
            })

            await logDataMutation(user.id, {
                entity: 'Document',
                entityId: doc._id.toString(),
                action: 'CREATE',
            })

            const serialized = serializeDoc(doc.toObject()) as SerializableDocument
            return withSignedDocumentUrl(serialized)
        } catch (error) {
            await deleteStoredFile(stored.storageKey)
            throw error
        }
    }

    /**
     * List Documents
     */
    static async list(user: UserContext, data: ListDocumentsInput) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const query: Record<string, unknown> = {
            entityType: data.entityType,
            entityId: data.entityId,
        }

        if (!canViewAllDocuments(user.role)) {
            query.uploadedBy = user.id
        }

        const docs = await Document.find(query).sort({ createdAt: -1 }).lean()

        await logDataAccessMany(
            user.id,
            docs.map((doc) => ({
                entity: "Document",
                entityId: doc._id.toString(),
                action: "VIEW" as const,
            }))
        )

        const serialized = serializeDocs(docs) as SerializableDocument[]
        return serialized.map((document) => withSignedDocumentUrl(document))
    }

    /**
     * Get Document
     */
    static async getById(user: UserContext, documentId: string) {
        if (!hasRole(user.role, ALLOWED_ROLES)) throw new ForbiddenError("Forbidden")

        await connectDB()
        const doc = await Document.findById(documentId).lean()
        if (!doc) throw new NotFoundError("Document not found")
        if (!canViewAllDocuments(user.role) && doc.uploadedBy?.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        await logDataAccess(user.id, {
            entity: "Document",
            entityId: documentId,
            action: "VIEW",
        })

        const serialized = serializeDoc(doc) as SerializableDocument
        return withSignedDocumentUrl(serialized)
    }

    /**
     * Resolve Document file payload for download
     */
    static async getDownloadPayload(user: UserContext, documentId: string): Promise<DownloadPayload> {
        if (!hasRole(user.role, ALLOWED_ROLES)) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()
        const doc = await Document.findById(documentId).lean()
        if (!doc) throw new NotFoundError("Document not found")

        if (!canViewAllDocuments(user.role) && doc.uploadedBy?.toString() !== user.id) {
            throw new ForbiddenError("Forbidden")
        }

        await logDataAccess(user.id, {
            entity: "Document",
            entityId: documentId,
            action: "EXPORT",
        })

        if (doc.storageKey) {
            return {
                storageKey: doc.storageKey,
                mimeType: doc.mimeType || "application/octet-stream",
                fileName: doc.originalFileName || doc.name || "document",
            }
        }

        if (doc.url) {
            return {
                redirectUrl: doc.url,
            }
        }

        throw new NotFoundError("Document file not found")
    }

    /**
     * Delete Document
     */
    static async delete(user: UserContext, documentId: string) {
        if (!canUploadDocuments(user.role)) throw new ForbiddenError("Forbidden")

        await connectDB()

        const doc = await Document.findById(documentId)
        if (!doc) throw new NotFoundError("Document not found")

        // Only uploader or admin can delete
        if (!hasRole(user.role, ["SUPER_ADMIN", "ADMIN"]) && doc.uploadedBy?.toString() !== user.id) {
            throw new ForbiddenError("Cannot delete documents uploaded by others")
        }

        const oldValue = doc.toObject()
        const storageKey = doc.storageKey
        await Document.deleteOne({ _id: documentId })

        if (storageKey) {
            await deleteStoredFile(storageKey)
        }

        await AuditLog.create({
            userId: user.id,
            action: "DOCUMENT_DELETED",
            entity: "Document",
            entityId: documentId,
            oldValue,
        })

        await logDataMutation(user.id, {
            entity: 'Document',
            entityId: documentId,
            action: 'DELETE',
        })

        return { success: true }
    }
}
