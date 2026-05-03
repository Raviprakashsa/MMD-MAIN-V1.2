'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  RefreshCw,
  Send,
  XCircle,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  closeThreadAction,
  createThreadAction,
  listThreadMessagesAction,
  listThreadsAction,
  postMessageAction,
} from '@/lib/actions/module10-communication'

interface CommunicationThread {
  id: string
  subject: string
  entityType: 'Company' | 'Requirement' | 'Candidate' | 'Placement'
  entityId: string
  isClosed: boolean
  participants: string[]
  lastMessageAt?: string
  createdAt?: string
}

interface CommunicationMessage {
  id: string
  channel: string
  direction: string
  body: string
  senderId?: string
  createdAt?: string
}

interface ThreadFormState {
  entityType: 'Company' | 'Requirement' | 'Candidate' | 'Placement'
  entityId: string
  subject: string
  participantIds: string
}

interface ThreadFilterState {
  entityType: 'Company' | 'Requirement' | 'Candidate' | 'Placement'
  entityId: string
  includeClosed: boolean
}

interface MessageFormState {
  channel: 'EMAIL' | 'WHATSAPP' | 'CALL' | 'NOTE'
  direction: 'INBOUND' | 'OUTBOUND'
  body: string
}

interface EntityLookupOption {
  id: string
  type: ThreadFilterState['entityType']
  title: string
  subtitle: string
}

const THREAD_PAGE_SIZE = 8
const MESSAGE_PAGE_SIZE = 20

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function mapSearchResultType(type: string): ThreadFilterState['entityType'] | null {
  switch (type) {
    case 'company':
      return 'Company'
    case 'requirement':
      return 'Requirement'
    case 'candidate':
      return 'Candidate'
    default:
      return null
  }
}

function normalizeEntityLookupOptions(value: unknown, expectedType: ThreadFilterState['entityType']): EntityLookupOption[] {
  const record = asRecord(value)
  const rawResults = Array.isArray(record?.results) ? record.results : []
  const options: EntityLookupOption[] = []

  for (const item of rawResults) {
    const result = asRecord(item)
    if (!result) continue

    const id = asString(result.id)
    const mappedType = mapSearchResultType(asString(result.type))
    if (!id || !mappedType || mappedType !== expectedType) continue

    options.push({
      id,
      type: mappedType,
      title: asString(result.title) || id,
      subtitle: asString(result.subtitle) || mappedType,
    })
  }

  return options
}

function normalizeThread(value: unknown): CommunicationThread | null {
  const record = asRecord(value)
  if (!record) return null

  const id = asString(record._id) || asString(record.id)
  if (!id) return null

  const participants = Array.isArray(record.participants)
    ? record.participants
        .map((participant) => {
          if (typeof participant === 'string') return participant
          const participantRecord = asRecord(participant)
          return asString(participantRecord?._id) || asString(participantRecord?.id)
        })
        .filter(Boolean)
    : []

  return {
    id,
    subject: asString(record.subject) || 'Untitled thread',
    entityType: (asString(record.entityType) as CommunicationThread['entityType']) || 'Requirement',
    entityId: asString(record.entityId),
    isClosed: Boolean(record.isClosed),
    participants,
    lastMessageAt: asString(record.lastMessageAt) || undefined,
    createdAt: asString(record.createdAt) || undefined,
  }
}

function normalizeMessages(value: unknown): CommunicationMessage[] {
  if (!Array.isArray(value)) return []

  const items: CommunicationMessage[] = []
  for (const item of value) {
    const record = asRecord(item)
    if (!record) continue

    const id = asString(record._id) || asString(record.id)
    if (!id) continue

    const senderRecord = asRecord(record.senderId)

    items.push({
      id,
      channel: asString(record.channel) || 'NOTE',
      direction: asString(record.direction) || 'OUTBOUND',
      body: asString(record.body),
      senderId: asString(record.senderId) || asString(senderRecord?._id) || undefined,
      createdAt: asString(record.createdAt) || undefined,
    })
  }

  return items
}

function mergeUniqueThreads(previous: CommunicationThread[], next: CommunicationThread[]): CommunicationThread[] {
  const map = new Map<string, CommunicationThread>()
  for (const thread of previous) {
    map.set(thread.id, thread)
  }
  for (const thread of next) {
    map.set(thread.id, thread)
  }
  return Array.from(map.values())
}

const initialThreadForm: ThreadFormState = {
  entityType: 'Requirement',
  entityId: '',
  subject: '',
  participantIds: '',
}

const initialThreadFilter: ThreadFilterState = {
  entityType: 'Requirement',
  entityId: '',
  includeClosed: false,
}

const initialMessageForm: MessageFormState = {
  channel: 'NOTE',
  direction: 'OUTBOUND',
  body: '',
}

export default function CommunicationsPage() {
  const { data: session, status } = useSession()
  const toast = useToast()

  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [isPostingMessage, setIsPostingMessage] = useState(false)
  const [isLoadingThreads, setIsLoadingThreads] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isClosingThread, setIsClosingThread] = useState(false)

  const [threadForm, setThreadForm] = useState<ThreadFormState>(initialThreadForm)
  const [threadFilter, setThreadFilter] = useState<ThreadFilterState>(initialThreadFilter)
  const [messageForm, setMessageForm] = useState<MessageFormState>(initialMessageForm)

  const [filterEntitySearch, setFilterEntitySearch] = useState('')
  const [filterEntityOptions, setFilterEntityOptions] = useState<EntityLookupOption[]>([])
  const [isFilterEntitySearching, setIsFilterEntitySearching] = useState(false)

  const [createEntitySearch, setCreateEntitySearch] = useState('')
  const [createEntityOptions, setCreateEntityOptions] = useState<EntityLookupOption[]>([])
  const [isCreateEntitySearching, setIsCreateEntitySearching] = useState(false)

  const [threads, setThreads] = useState<CommunicationThread[]>([])
  const [threadPage, setThreadPage] = useState(1)
  const [threadHasMore, setThreadHasMore] = useState(false)
  const [threadTotal, setThreadTotal] = useState(0)

  const [loadedThread, setLoadedThread] = useState<CommunicationThread | null>(null)
  const [messages, setMessages] = useState<CommunicationMessage[]>([])
  const [messagePage, setMessagePage] = useState(1)
  const [messageHasMore, setMessageHasMore] = useState(false)

  const role = session?.user?.role || 'RECRUITER'
  const isAllowed = role !== 'SCRAPER'

  useEffect(() => {
    const query = filterEntitySearch.trim()
    if (threadFilter.entityType === 'Placement' || query.length < 2) {
      setFilterEntityOptions([])
      setIsFilterEntitySearching(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsFilterEntitySearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          setFilterEntityOptions([])
          return
        }

        const payload = await response.json().catch(() => null)
        setFilterEntityOptions(normalizeEntityLookupOptions(payload, threadFilter.entityType))
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'AbortError') {
          setFilterEntityOptions([])
        }
      } finally {
        setIsFilterEntitySearching(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [filterEntitySearch, threadFilter.entityType])

  useEffect(() => {
    const query = createEntitySearch.trim()
    if (threadForm.entityType === 'Placement' || query.length < 2) {
      setCreateEntityOptions([])
      setIsCreateEntitySearching(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsCreateEntitySearching(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          setCreateEntityOptions([])
          return
        }

        const payload = await response.json().catch(() => null)
        setCreateEntityOptions(normalizeEntityLookupOptions(payload, threadForm.entityType))
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'AbortError') {
          setCreateEntityOptions([])
        }
      } finally {
        setIsCreateEntitySearching(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [createEntitySearch, threadForm.entityType])

  const loadThreads = async (page = 1) => {
    if (!threadFilter.entityId.trim()) {
      setThreads([])
      setThreadPage(1)
      setThreadHasMore(false)
      setThreadTotal(0)
      return
    }

    setIsLoadingThreads(true)
    try {
      const response = await listThreadsAction({
        entityType: threadFilter.entityType,
        entityId: threadFilter.entityId.trim(),
        includeClosed: threadFilter.includeClosed,
        page,
        limit: THREAD_PAGE_SIZE,
      })

      if (!response.success || !response.data) {
        toast.error('Thread list failed', response.error || 'Could not load communication threads')
        return
      }

      const payload = asRecord(response.data)
      const rawItems = Array.isArray(payload?.items) ? payload.items : []
      const normalized = rawItems.map(normalizeThread).filter((item): item is CommunicationThread => Boolean(item))

      setThreads((prev) => (page === 1 ? normalized : mergeUniqueThreads(prev, normalized)))
      setThreadPage(asNumber(payload?.page) || page)
      setThreadHasMore(asBoolean(payload?.hasMore))
      setThreadTotal(asNumber(payload?.total))
    } catch {
      toast.error('Thread list failed', 'Unexpected error while loading threads')
    } finally {
      setIsLoadingThreads(false)
    }
  }

  const loadThreadMessages = async (threadId: string, page = 1, append = false) => {
    if (!threadId.trim()) {
      toast.error('Thread required', 'Select a thread first')
      return
    }

    setIsLoadingMessages(true)
    try {
      const response = await listThreadMessagesAction({
        threadId: threadId.trim(),
        page,
        limit: MESSAGE_PAGE_SIZE,
      })

      if (!response.success || !response.data) {
        toast.error('Thread load failed', response.error || 'Could not fetch thread messages')
        return
      }

      const payload = asRecord(response.data)
      const thread = normalizeThread(payload?.thread)
      const threadMessages = normalizeMessages(payload?.messages)

      if (!thread) {
        toast.error('Thread load failed', 'Thread payload is malformed')
        return
      }

      setLoadedThread(thread)
      setMessages((prev) => (append ? [...prev, ...threadMessages] : threadMessages))
      setMessagePage(asNumber(payload?.page) || page)
      setMessageHasMore(asBoolean(payload?.hasMore))
    } catch {
      toast.error('Thread load failed', 'Unexpected error while loading communication thread')
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const applyFilterEntitySelection = (option: EntityLookupOption) => {
    setThreadFilter((prev) => ({
      ...prev,
      entityType: option.type,
      entityId: option.id,
    }))
    setFilterEntitySearch(option.title)
    setFilterEntityOptions([])
  }

  const applyCreateEntitySelection = (option: EntityLookupOption) => {
    setThreadForm((prev) => ({
      ...prev,
      entityType: option.type,
      entityId: option.id,
    }))
    setCreateEntitySearch(option.title)
    setCreateEntityOptions([])
  }

  const handleCreateThread = async () => {
    if (!threadForm.entityId.trim() || !threadForm.subject.trim()) {
      toast.error('Missing details', 'Entity ID and subject are required to create a thread')
      return
    }

    setIsCreatingThread(true)
    try {
      const participantIds = threadForm.participantIds
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)

      const response = await createThreadAction({
        entityType: threadForm.entityType,
        entityId: threadForm.entityId.trim(),
        subject: threadForm.subject.trim(),
        participantIds,
      })

      if (!response.success || !response.data) {
        toast.error('Thread creation failed', response.error || 'Unable to create communication thread')
        return
      }

      const thread = normalizeThread(response.data)
      if (!thread) {
        toast.error('Thread creation failed', 'Created thread payload is invalid')
        return
      }

      setLoadedThread(thread)
      setMessages([])
      setMessagePage(1)
      setMessageHasMore(false)
      setThreadFilter({
        entityType: thread.entityType,
        entityId: thread.entityId,
        includeClosed: threadFilter.includeClosed,
      })
      setThreadForm((prev) => ({
        ...prev,
        entityType: thread.entityType,
        entityId: thread.entityId,
        subject: '',
        participantIds: '',
      }))

      await loadThreads(1)
      await loadThreadMessages(thread.id, 1, false)

      toast.success('Thread created', 'Thread is ready for messages')
    } catch {
      toast.error('Thread creation failed', 'Unexpected error while creating thread')
    } finally {
      setIsCreatingThread(false)
    }
  }

  const handlePostMessage = async () => {
    if (!loadedThread) {
      toast.error('Thread required', 'Select a thread before posting')
      return
    }

    if (!messageForm.body.trim()) {
      toast.error('Missing details', 'Message body is required')
      return
    }

    setIsPostingMessage(true)
    try {
      const response = await postMessageAction({
        threadId: loadedThread.id,
        channel: messageForm.channel,
        direction: messageForm.direction,
        body: messageForm.body.trim(),
      })

      if (!response.success || !response.data) {
        toast.error('Message send failed', response.error || 'Could not send communication message')
        return
      }

      setMessageForm((prev) => ({ ...prev, body: '' }))
      await loadThreadMessages(loadedThread.id, 1, false)
      await loadThreads(1)

      toast.success('Message posted', 'Communication thread has been updated')
    } catch {
      toast.error('Message send failed', 'Unexpected error while posting message')
    } finally {
      setIsPostingMessage(false)
    }
  }

  const handleCloseThread = async () => {
    if (!loadedThread) return

    setIsClosingThread(true)
    try {
      const response = await closeThreadAction({ threadId: loadedThread.id })
      if (!response.success || !response.data) {
        toast.error('Close thread failed', response.error || 'Could not close communication thread')
        return
      }

      const closedThread = normalizeThread(response.data)
      if (closedThread) {
        setLoadedThread(closedThread)
        setThreads((prev) => prev.map((thread) => (thread.id === closedThread.id ? closedThread : thread)))
      }

      toast.success('Thread closed', 'No more messages can be posted to this thread')
    } catch {
      toast.error('Close thread failed', 'Unexpected error while closing thread')
    } finally {
      setIsClosingThread(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Communications</h1>
        <p className="text-[var(--foreground-muted)]">Loading communication workspace...</p>
      </div>
    )
  }

  if (!isAllowed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <h1 className="text-xl font-semibold">Communications Restricted</h1>
        <p className="mt-2 text-sm">Scraper accounts do not have access to communication threads.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Communications</h1>
        <p className="text-[var(--foreground-muted)]">Browse threads by entity, post updates, and manage thread lifecycle.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Browse Threads</h2>
          </div>

          <Select
            label="Entity Type"
            value={threadFilter.entityType}
            onChange={(event) => {
              const nextType = event.target.value as ThreadFilterState['entityType']
              setThreadFilter((prev) => ({ ...prev, entityType: nextType, entityId: '' }))
              setFilterEntitySearch('')
              setFilterEntityOptions([])
            }}
            options={[
              { label: 'Requirement', value: 'Requirement' },
              { label: 'Company', value: 'Company' },
              { label: 'Candidate', value: 'Candidate' },
              { label: 'Placement', value: 'Placement' },
            ]}
          />

          {threadFilter.entityType === 'Placement' ? (
            <Input
              label="Entity ID"
              placeholder="Mongo Object ID"
              value={threadFilter.entityId}
              onChange={(event) => setThreadFilter((prev) => ({ ...prev, entityId: event.target.value }))}
            />
          ) : (
            <>
              <Input
                label="Find Entity"
                placeholder={`Search ${threadFilter.entityType.toLowerCase()} by name or reference`}
                value={filterEntitySearch}
                onChange={(event) => {
                  setFilterEntitySearch(event.target.value)
                  if (!event.target.value.trim()) {
                    setThreadFilter((prev) => ({ ...prev, entityId: '' }))
                  }
                }}
              />

              {filterEntitySearch.trim().length >= 2 && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 space-y-2 max-h-40 overflow-y-auto">
                  {isFilterEntitySearching ? (
                    <p className="text-xs text-[var(--foreground-muted)]">Searching entities...</p>
                  ) : filterEntityOptions.length === 0 ? (
                    <p className="text-xs text-[var(--foreground-muted)]">No matching entities found for this type.</p>
                  ) : (
                    filterEntityOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => applyFilterEntitySelection(option)}
                        className="w-full rounded-md border border-transparent px-3 py-2 text-left hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-[var(--foreground)]">{option.title}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{option.subtitle}</p>
                      </button>
                    ))
                  )}
                </div>
              )}

              <Input
                label="Selected Entity ID"
                placeholder="Select an entity from search results"
                value={threadFilter.entityId}
                readOnly
              />
            </>
          )}

          <label className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
            <input
              type="checkbox"
              checked={threadFilter.includeClosed}
              onChange={(event) => setThreadFilter((prev) => ({ ...prev, includeClosed: event.target.checked }))}
            />
            Include closed threads
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              leftIcon={<RefreshCw className="h-4 w-4" />}
              isLoading={isLoadingThreads}
              loadingText="Loading..."
              onClick={() => loadThreads(1)}
            >
              Load Threads
            </Button>

            <Button
              variant="ghost"
              leftIcon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => loadThreads(Math.max(1, threadPage - 1))}
              disabled={threadPage <= 1 || isLoadingThreads}
            >
              Prev
            </Button>

            <Button
              variant="ghost"
              rightIcon={<ChevronRight className="h-4 w-4" />}
              onClick={() => loadThreads(threadPage + 1)}
              disabled={!threadHasMore || isLoadingThreads}
            >
              Next
            </Button>
          </div>

          <p className="text-xs text-[var(--foreground-muted)]">{threadTotal} thread(s) found</p>

          <div className="space-y-2">
            {threads.length === 0 && (
              <p className="text-sm text-[var(--foreground-muted)]">No threads loaded for this entity.</p>
            )}

            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => loadThreadMessages(thread.id, 1, false)}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  loadedThread?.id === thread.id
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-[var(--border)] hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{thread.subject}</p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{thread.entityType} • {thread.entityId}</p>
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">{thread.isClosed ? 'Closed' : 'Open'}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Create Thread</h2>
          </div>

          <Select
            label="Entity Type"
            value={threadForm.entityType}
            onChange={(event) => {
              const nextType = event.target.value as ThreadFormState['entityType']
              setThreadForm((prev) => ({ ...prev, entityType: nextType, entityId: '' }))
              setCreateEntitySearch('')
              setCreateEntityOptions([])
            }}
            options={[
              { label: 'Requirement', value: 'Requirement' },
              { label: 'Company', value: 'Company' },
              { label: 'Candidate', value: 'Candidate' },
              { label: 'Placement', value: 'Placement' },
            ]}
          />

          {threadForm.entityType === 'Placement' ? (
            <Input
              label="Entity ID"
              placeholder="Mongo Object ID"
              value={threadForm.entityId}
              onChange={(event) => setThreadForm((prev) => ({ ...prev, entityId: event.target.value }))}
            />
          ) : (
            <>
              <Input
                label="Find Entity"
                placeholder={`Search ${threadForm.entityType.toLowerCase()} by name or reference`}
                value={createEntitySearch}
                onChange={(event) => {
                  setCreateEntitySearch(event.target.value)
                  if (!event.target.value.trim()) {
                    setThreadForm((prev) => ({ ...prev, entityId: '' }))
                  }
                }}
              />

              {createEntitySearch.trim().length >= 2 && (
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2 space-y-2 max-h-40 overflow-y-auto">
                  {isCreateEntitySearching ? (
                    <p className="text-xs text-[var(--foreground-muted)]">Searching entities...</p>
                  ) : createEntityOptions.length === 0 ? (
                    <p className="text-xs text-[var(--foreground-muted)]">No matching entities found for this type.</p>
                  ) : (
                    createEntityOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => applyCreateEntitySelection(option)}
                        className="w-full rounded-md border border-transparent px-3 py-2 text-left hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                      >
                        <p className="text-sm font-medium text-[var(--foreground)]">{option.title}</p>
                        <p className="text-xs text-[var(--foreground-muted)]">{option.subtitle}</p>
                      </button>
                    ))
                  )}
                </div>
              )}

              <Input
                label="Selected Entity ID"
                placeholder="Select an entity from search results"
                value={threadForm.entityId}
                readOnly
              />
            </>
          )}

          <Input
            label="Subject"
            placeholder="Thread subject"
            value={threadForm.subject}
            onChange={(event) => setThreadForm((prev) => ({ ...prev, subject: event.target.value }))}
          />

          <Input
            label="Participants (optional)"
            placeholder="userId1, userId2"
            value={threadForm.participantIds}
            onChange={(event) => setThreadForm((prev) => ({ ...prev, participantIds: event.target.value }))}
          />

          <Button
            leftIcon={<MessageSquare className="h-4 w-4" />}
            isLoading={isCreatingThread}
            loadingText="Creating..."
            onClick={handleCreateThread}
          >
            Create Thread
          </Button>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-cyan-600" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Post Message</h2>
          </div>

          {loadedThread ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">{loadedThread.subject}</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">{loadedThread.entityType} • {loadedThread.entityId}</p>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">Thread: {loadedThread.id}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">Select a thread from the list to post messages.</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Channel"
              value={messageForm.channel}
              onChange={(event) => setMessageForm((prev) => ({ ...prev, channel: event.target.value as MessageFormState['channel'] }))}
              options={[
                { label: 'Note', value: 'NOTE' },
                { label: 'Email', value: 'EMAIL' },
                { label: 'WhatsApp', value: 'WHATSAPP' },
                { label: 'Call', value: 'CALL' },
              ]}
            />

            <Select
              label="Direction"
              value={messageForm.direction}
              onChange={(event) => setMessageForm((prev) => ({ ...prev, direction: event.target.value as MessageFormState['direction'] }))}
              options={[
                { label: 'Outbound', value: 'OUTBOUND' },
                { label: 'Inbound', value: 'INBOUND' },
              ]}
            />
          </div>

          <Textarea
            label="Message"
            rows={4}
            placeholder="Write your update"
            value={messageForm.body}
            onChange={(event) => setMessageForm((prev) => ({ ...prev, body: event.target.value }))}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              leftIcon={<Send className="h-4 w-4" />}
              isLoading={isPostingMessage}
              loadingText="Posting..."
              onClick={handlePostMessage}
              disabled={!loadedThread || loadedThread.isClosed}
            >
              Post Message
            </Button>

            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              isLoading={isLoadingMessages}
              loadingText="Refreshing..."
              onClick={() => loadedThread && loadThreadMessages(loadedThread.id, 1, false)}
              disabled={!loadedThread}
            >
              Refresh Thread
            </Button>

            <Button
              variant="ghost"
              leftIcon={<XCircle className="h-4 w-4" />}
              isLoading={isClosingThread}
              loadingText="Closing..."
              onClick={handleCloseThread}
              disabled={!loadedThread || loadedThread.isClosed}
            >
              Close Thread
            </Button>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Thread Activity</h2>

        {loadedThread ? (
          <div className="rounded-lg border border-[var(--border)] p-4">
            <p className="font-medium text-[var(--foreground)]">{loadedThread.subject}</p>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              {loadedThread.entityType} • {loadedThread.entityId} • {loadedThread.isClosed ? 'Closed' : 'Open'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--foreground-muted)]">No thread selected yet.</p>
        )}

        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-[var(--foreground-muted)]">No messages for this thread.</p>
          )}

          {messages.map((message) => (
            <article key={message.id} className="rounded-lg border border-[var(--border)] p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-muted)]">
                <span>{message.channel}</span>
                <span>•</span>
                <span>{message.direction}</span>
                {message.createdAt && (
                  <>
                    <span>•</span>
                    <span>{format(new Date(message.createdAt), 'MMM d, yyyy h:mm a')}</span>
                  </>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--foreground)] whitespace-pre-wrap">{message.body}</p>
            </article>
          ))}
        </div>

        {loadedThread && messageHasMore && (
          <Button
            variant="ghost"
            leftIcon={<ChevronRight className="h-4 w-4" />}
            isLoading={isLoadingMessages}
            loadingText="Loading..."
            onClick={() => loadThreadMessages(loadedThread.id, messagePage + 1, true)}
          >
            Load Older Messages
          </Button>
        )}
      </section>
    </div>
  )
}
