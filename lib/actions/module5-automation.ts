"use server"

import { createProtectedAction, createPublicAction } from "@/lib/core/action-client"
import {
  AutomationService,
  GenerateAutomationSchema,
  RegenerateContentSchema,
  GetFormSchema,
  SubmitApplicationSchema
} from "@/lib/services/automation.service"
import { z } from "zod"


export const generateRequirementAutomationAction = createProtectedAction(
  GenerateAutomationSchema,
  async (payload, session) => {
    const result = await AutomationService.generateAutomation(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return result
  }
)

export const regenerateContentAction = createProtectedAction(
  RegenerateContentSchema,
  async (payload, session) => {
    const result = await AutomationService.regenerateContent(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return result
  }
)

// Public Action (No Session Required)
export const getPublicFormDataAction = createPublicAction(
  GetFormSchema,
  async (payload) => {
    const result = await AutomationService.getPublicForm(payload.slug)
    return result
  }
)

// Public Action (No Session Required)
export const submitApplicationAction = createPublicAction(
  SubmitApplicationSchema,
  async (payload) => {
    const result = await AutomationService.submitApplication({
      ...payload,
      skills: payload.skills ?? []
    })
    return result
  }
)

export const previewTemplatesAction = createProtectedAction(
  z.object({}).optional(),
  async () => {
    return AutomationService.getTemplates()
  }
)

