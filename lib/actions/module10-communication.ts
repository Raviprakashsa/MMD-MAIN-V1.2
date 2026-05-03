"use server"

import { createProtectedAction } from "@/lib/core/action-client"
import {
  CommunicationService,
  CloseThreadSchema,
  ListThreadsSchema,
  ListMessagesSchema
} from "@/lib/services/communication.service"
import { CommunicationThreadSchema, CommunicationMessageSchema } from "@/lib/validators/common"

export const createThreadAction = createProtectedAction(
  CommunicationThreadSchema,
  async (payload, session) => {
    const thread = await CommunicationService.createThread(
      { id: session.user.id, role: session.user.role },
      { ...payload, participantIds: payload.participantIds ?? [] }
    )
    return thread
  }
)

export const postMessageAction = createProtectedAction(
  CommunicationMessageSchema,
  async (payload, session) => {
    const message = await CommunicationService.postMessage(
      { id: session.user.id, role: session.user.role },
      payload
    )
    return message
  }
)

export const closeThreadAction = createProtectedAction(
  CloseThreadSchema,
  async (payload, session) => {
    const thread = await CommunicationService.closeThread(
      { id: session.user.id, role: session.user.role },
      payload.threadId
    )
    return thread
  }
)

export const listThreadsAction = createProtectedAction(
  ListThreadsSchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      includeClosed: payload.includeClosed ?? false,
      page: payload.page ?? 1,
      limit: payload.limit ?? 10,
    }

    const data = await CommunicationService.listThreads(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )
    return data
  }
)

export const listThreadMessagesAction = createProtectedAction(
  ListMessagesSchema,
  async (payload, session) => {
    const normalizedPayload = {
      ...payload,
      page: payload.page ?? 1,
      limit: payload.limit ?? 20,
    }

    const data = await CommunicationService.getThreadWithMessages(
      { id: session.user.id, role: session.user.role },
      normalizedPayload
    )
    return data
  }
)

