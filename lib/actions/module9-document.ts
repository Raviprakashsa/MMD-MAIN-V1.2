"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import {
  DocumentService,
  ListDocumentsSchema
} from "@/lib/services/document.service"
import { DocumentSchema } from "@/lib/validators/common"
import { z } from "zod"


export const uploadDocumentAction = createProtectedAction(
  DocumentSchema,
  async (payload, session) => {
    const doc = await DocumentService.upload(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return doc
  }
)

export const listDocumentsAction = createProtectedAction(
  ListDocumentsSchema,
  async (payload, session) => {
    const docs = await DocumentService.list(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return docs
  }
)

const IdSchema = z.object({ id: z.string().min(1) })

export const getDocumentById = createProtectedAction(
  IdSchema,
  async (payload, session) => {
    const doc = await DocumentService.getById(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return doc
  }
)

export const deleteDocument = createProtectedAction(
  IdSchema,
  async (payload, session) => {
    await DocumentService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)


