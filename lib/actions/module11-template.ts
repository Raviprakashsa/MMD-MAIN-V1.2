"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import {
  TemplateService,
  RenderSchema,
  DuplicateSchema,
  UpdateTemplateSchema,
  DeleteTemplateSchema
} from "@/lib/services/template.service"
import { TemplateSchema } from "@/lib/validators/common"
import { z } from "zod"


export const saveTemplate = createProtectedAction(
  TemplateSchema,
  async (payload, session) => {
    const template = await TemplateService.create(
      {
        id: session.user.id,
        role: session.user.role
      },
      { ...payload, isPublic: payload.isPublic ?? true }
    )
    return template
  }
)

export const getTemplates = createProtectedAction(
  z.object({}).optional(),
  async (_, session) => {
    const templates = await TemplateService.getAll(
      { id: session.user.id, role: session.user.role }
    )
    return templates
  }
)

export const updateTemplate = createProtectedAction(
  UpdateTemplateSchema,
  async (payload, session) => {
    const template = await TemplateService.update(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return template
  }
)

export const renderTemplate = createProtectedAction(
  RenderSchema,
  async (payload, session) => {
    const result = await TemplateService.render(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return result
  }
)

export const duplicateTemplate = createProtectedAction(
  DuplicateSchema,
  async (payload, session) => {
    const template = await TemplateService.duplicate(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return template
  }
)

export const deleteTemplate = createProtectedAction(
  DeleteTemplateSchema,
  async (payload, session) => {
    await TemplateService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return { success: true }
  }
)


