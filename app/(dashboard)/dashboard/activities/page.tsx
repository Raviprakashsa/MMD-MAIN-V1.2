'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  addActivityAction,
  getStalledRequirementsAction,
  getUpcomingFollowUpsAction,
} from '@/lib/actions/module7-activity'
import { getRequirements } from '@/lib/actions/module4-requirement'

interface RequirementOption {
  id: string
  mmdId: string
  title: string
  company: string
}

interface FollowUpItem {
  id: string
  summary: string
  nextFollowUpDate: string
  requirementId: string
  requirementMmdId: string
  requirementTitle: string
  isOverdue: boolean
}

interface StalledItem {
  id: string
  mmdId: string
  title: string
  status: string
  lastActivityDate?: string
}

interface ActivityFormState {
  requirementId: string
  type: 'CALL' | 'WHATSAPP' | 'EMAIL' | 'INTERVIEW' | 'MEETING' | 'STATUS_CHANGE' | 'FOLLOW_UP'
  summary: string
  outcome: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'PENDING'
  nextFollowUpDate: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeRequirementOptions(items: unknown): RequirementOption[] {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      const row = asRecord(item)
      if (!row) return null

      const id = asString(row.id) || asString(row._id)
      if (!id) return null

      const title = asString(row.jobTitle) || asString(row.title) || 'Untitled role'
      const company = asString(row.company) || asString(asRecord(row.companyId)?.name)

      return {
        id,
        mmdId: asString(row.mmdId),
        title,
        company,
      }
    })
    .filter((item): item is RequirementOption => Boolean(item))
}

function normalizeFollowUps(items: unknown): FollowUpItem[] {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => {
      const row = asRecord(item)
      if (!row) return null

      const id = asString(row._id) || asString(row.id)
      const summary = asString(row.summary)
      const nextFollowUpDate = asString(row.nextFollowUpDate)
      const requirementRef = asRecord(row.requirementId)
      const requirementId = asString(requirementRef?._id) || asString(requirementRef?.id) || asString(row.requirementId)
      const requirementMmdId = asString(requirementRef?.mmdId)
      const requirementTitle = asString(requirementRef?.jobTitle) || asString(requirementRef?.title)

      if (!id || !summary || !nextFollowUpDate) return null

      const timestamp = new Date(nextFollowUpDate).getTime()
      const isOverdue = Number.isFinite(timestamp) ? timestamp < Date.now() : false

      return {
        id,
        summary,
        nextFollowUpDate,
        requirementId,
        requirementMmdId,
        requirementTitle,
        isOverdue,
      }
    })
    .filter((item): item is FollowUpItem => Boolean(item))
}

function normalizeStalled(items: unknown): StalledItem[] {
  if (!Array.isArray(items)) return []

  const normalized: StalledItem[] = []

  for (const item of items) {
    const row = asRecord(item)
    if (!row) continue

    const id = asString(row._id) || asString(row.id)
    if (!id) continue

    const stalledItem: StalledItem = {
      id,
      mmdId: asString(row.mmdId),
      title: asString(row.jobTitle) || asString(row.title) || 'Untitled role',
      status: asString(row.status) || 'ACTIVE',
    }

    const lastActivityDate = asString(row.lastActivityDate)
    if (lastActivityDate) {
      stalledItem.lastActivityDate = lastActivityDate
    }

    normalized.push(stalledItem)
  }

  return normalized
}

const initialFormState: ActivityFormState = {
  requirementId: '',
  type: 'FOLLOW_UP',
  summary: '',
  outcome: 'PENDING',
  nextFollowUpDate: '',
}

export default function ActivitiesPage() {
  const { data: session, status } = useSession()
  const toast = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [daysStale, setDaysStale] = useState(3)
  const [requirements, setRequirements] = useState<RequirementOption[]>([])
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([])
  const [stalled, setStalled] = useState<StalledItem[]>([])
  const [form, setForm] = useState<ActivityFormState>(initialFormState)

  const role = session?.user?.role || 'RECRUITER'
  const isAllowed = role !== 'SCRAPER'

  const requirementOptions = useMemo(
    () => [
      { label: 'Select requirement', value: '' },
      ...requirements.map((item) => ({
        value: item.id,
        label: `${item.mmdId ? `${item.mmdId} • ` : ''}${item.title}${item.company ? ` (${item.company})` : ''}`,
      })),
    ],
    [requirements]
  )

  const loadData = async () => {
    if (!isAllowed) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const [followRes, stalledRes, reqRes] = await Promise.all([
        getUpcomingFollowUpsAction({}),
        getStalledRequirementsAction({ daysStale }),
        getRequirements({}),
      ])

      if (followRes.success) {
        setFollowUps(normalizeFollowUps(followRes.data))
      } else {
        toast.error('Follow-ups unavailable', followRes.error || 'Could not load follow-ups')
      }

      if (stalledRes.success) {
        setStalled(normalizeStalled(stalledRes.data))
      } else {
        toast.error('Stalled requirements unavailable', stalledRes.error || 'Could not load stalled requirements')
      }

      if (reqRes.success) {
        const options = normalizeRequirementOptions(reqRes.data)
        setRequirements(options)
        if (!form.requirementId && options.length > 0) {
          setForm((prev) => ({ ...prev, requirementId: options[0].id }))
        }
      } else {
        toast.error('Requirements unavailable', reqRes.error || 'Could not load requirements for activity logging')
      }
    } catch {
      toast.error('Activity workspace error', 'Something went wrong while loading activity data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      loadData()
    }
  }, [status, daysStale, isAllowed])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.requirementId) {
      toast.error('Requirement required', 'Choose a requirement before logging an activity')
      return
    }
    if (!form.summary.trim()) {
      toast.error('Summary required', 'Add a short summary for this activity')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        requirementId: form.requirementId,
        type: form.type,
        summary: form.summary.trim(),
        outcome: form.outcome,
        nextFollowUpDate: form.nextFollowUpDate ? new Date(form.nextFollowUpDate) : undefined,
      }

      const response = await addActivityAction(payload)
      if (!response.success) {
        toast.error('Failed to add activity', response.error || 'Try again with valid inputs')
        return
      }

      toast.success('Activity logged', 'The follow-up board has been refreshed')
      setForm((prev) => ({ ...prev, summary: '', nextFollowUpDate: '', outcome: 'PENDING' }))
      await loadData()
    } catch {
      toast.error('Failed to add activity', 'Unexpected error while saving activity')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Activity Workspace</h1>
        <p className="text-[var(--foreground-muted)]">Loading follow-ups and stalled requirements...</p>
      </div>
    )
  }

  if (!isAllowed) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <h1 className="text-xl font-semibold">Activity Workspace Restricted</h1>
        <p className="mt-2 text-sm">Scraper accounts do not have access to activity follow-ups. Use lead workflows instead.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Activity Workspace</h1>
          <p className="text-[var(--foreground-muted)]">Track follow-ups, monitor stalled requirements, and log actions.</p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => loadData()}
        >
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <p className="text-sm text-[var(--foreground-muted)]">Upcoming Follow-ups</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{followUps.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <p className="text-sm text-[var(--foreground-muted)]">Stalled Requirements</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{stalled.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <p className="text-sm text-[var(--foreground-muted)]">Stale Threshold (days)</p>
          <div className="mt-2 flex items-center gap-2">
            <Input
              type="number"
              min={1}
              value={String(daysStale)}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10)
                setDaysStale(Number.isFinite(value) && value > 0 ? value : 1)
              }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Follow-up Queue</h2>
          </div>
          <div className="space-y-3">
            {followUps.length === 0 && (
              <p className="rounded-lg bg-[var(--surface-hover)] p-3 text-sm text-[var(--foreground-muted)]">No follow-ups scheduled right now.</p>
            )}
            {followUps.map((item) => (
              <article key={item.id} className="rounded-lg border border-[var(--border)] p-3">
                <p className="font-medium text-[var(--foreground)]">{item.summary}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-muted)]">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[var(--surface-hover)] px-2 py-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(item.nextFollowUpDate), 'MMM d, yyyy h:mm a')}
                  </span>
                  <span className={item.isOverdue ? 'text-rose-600 font-semibold' : ''}>
                    {formatDistanceToNow(new Date(item.nextFollowUpDate), { addSuffix: true })}
                  </span>
                  {item.requirementMmdId && <span>{item.requirementMmdId}</span>}
                  {item.requirementId && (
                    <Link className="text-indigo-600 hover:underline" href={`/dashboard/requirements?view=${encodeURIComponent(item.requirementId)}`}>
                      View Requirement
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Stalled Requirements</h2>
          </div>
          <div className="space-y-3">
            {stalled.length === 0 && (
              <p className="rounded-lg bg-[var(--surface-hover)] p-3 text-sm text-[var(--foreground-muted)]">No stalled requirements for the selected threshold.</p>
            )}
            {stalled.map((item) => (
              <article key={item.id} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{item.title}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{item.mmdId || 'Unassigned ID'} • {item.status}</p>
                  </div>
                  <Link className="text-xs text-indigo-600 hover:underline" href={`/dashboard/requirements?view=${encodeURIComponent(item.id)}`}>
                    Open
                  </Link>
                </div>
                <p className="mt-2 text-xs text-[var(--foreground-muted)]">
                  Last activity: {item.lastActivityDate ? format(new Date(item.lastActivityDate), 'MMM d, yyyy h:mm a') : 'No recent activity logged'}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Log New Activity</h2>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Requirement"
              value={form.requirementId}
              onChange={(event) => setForm((prev) => ({ ...prev, requirementId: event.target.value }))}
              options={requirementOptions}
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as ActivityFormState['type'] }))}
              options={[
                { label: 'Follow Up', value: 'FOLLOW_UP' },
                { label: 'Call', value: 'CALL' },
                { label: 'WhatsApp', value: 'WHATSAPP' },
                { label: 'Email', value: 'EMAIL' },
                { label: 'Interview', value: 'INTERVIEW' },
                { label: 'Meeting', value: 'MEETING' },
                { label: 'Status Change', value: 'STATUS_CHANGE' },
              ]}
            />
          </div>

          <Textarea
            label="Summary"
            rows={3}
            placeholder="Add a concise activity update"
            value={form.summary}
            onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Outcome"
              value={form.outcome}
              onChange={(event) => setForm((prev) => ({ ...prev, outcome: event.target.value as ActivityFormState['outcome'] }))}
              options={[
                { label: 'Pending', value: 'PENDING' },
                { label: 'Positive', value: 'POSITIVE' },
                { label: 'Neutral', value: 'NEUTRAL' },
                { label: 'Negative', value: 'NEGATIVE' },
              ]}
            />
            <Input
              label="Next Follow-up"
              type="datetime-local"
              value={form.nextFollowUpDate}
              onChange={(event) => setForm((prev) => ({ ...prev, nextFollowUpDate: event.target.value }))}
            />
          </div>

          <Button type="submit" isLoading={isSubmitting} loadingText="Logging..." leftIcon={<Plus className="h-4 w-4" />}>
            Add Activity
          </Button>
        </form>
      </section>
    </div>
  )
}
