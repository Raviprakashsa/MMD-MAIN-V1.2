'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck, Circle, ExternalLink, RefreshCw } from 'lucide-react'
import Button from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/lib/actions/module13-notification'

interface NotificationItem {
  id: string
  type: string
  message: string
  link?: string
  isRead: boolean
  createdAt?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeNotifications(items: unknown): NotificationItem[] {
  if (!Array.isArray(items)) return []

  const normalized: NotificationItem[] = []

  for (const item of items) {
    const row = asRecord(item)
    if (!row) continue

    const id = asString(row._id) || asString(row.id)
    if (!id) continue

    const notification: NotificationItem = {
      id,
      type: asString(row.type) || 'FOLLOW_UP',
      message: asString(row.message) || 'Notification',
      isRead: Boolean(row.isRead),
    }

    const link = asString(row.link)
    if (link) {
      notification.link = link
    }

    const createdAt = asString(row.createdAt)
    if (createdAt) {
      notification.createdAt = createdAt
    }

    normalized.push(notification)
  }

  return normalized
}

function typeLabel(type: string) {
  if (type === 'STALLED_REQ') return 'Stalled Requirement'
  if (type === 'MISSING_JD') return 'Missing JD'
  return 'Follow-up'
}

export default function NotificationsPage() {
  const toast = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [query, setQuery] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  )

  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (showUnreadOnly && item.isRead) return false
      if (!query.trim()) return true

      const q = query.trim().toLowerCase()
      return item.message.toLowerCase().includes(q) || item.type.toLowerCase().includes(q)
    })
  }, [notifications, query, showUnreadOnly])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const response = await listNotificationsAction({})
      if (!response.success) {
        toast.error('Could not load notifications', response.error || 'Please try again')
        return
      }

      setNotifications(normalizeNotifications(response.data))
    } catch {
      toast.error('Could not load notifications', 'Unexpected error while loading notifications')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
    const timer = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => clearInterval(timer)
  }, [])

  const handleMarkOne = async (id: string) => {
    const previous = notifications
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, isRead: true } : item)))

    const response = await markNotificationReadAction({ id })
    if (!response.success) {
      setNotifications(previous)
      toast.error('Could not mark as read', response.error || 'Please try again')
    }
  }

  const handleMarkAll = async () => {
    if (unreadCount === 0) return

    const previous = notifications
    setIsMarkingAll(true)
    setNotifications((items) => items.map((item) => ({ ...item, isRead: true })))

    try {
      const response = await markAllNotificationsReadAction({})
      if (!response.success) {
        setNotifications(previous)
        toast.error('Could not mark all as read', response.error || 'Please try again')
      }
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Notifications</h1>
          <p className="text-[var(--foreground-muted)]">Track workflow alerts, follow-up reminders, and missing JD requests.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => loadNotifications()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            leftIcon={<CheckCheck className="h-4 w-4" />}
            onClick={handleMarkAll}
            isLoading={isMarkingAll}
            loadingText="Updating..."
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <p className="text-sm text-[var(--foreground-muted)]">Total Notifications</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{notifications.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <p className="text-sm text-[var(--foreground-muted)]">Unread</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{unreadCount}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
          <p className="text-sm text-[var(--foreground-muted)]">Auto Refresh</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">30s</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <SearchInput
            placeholder="Search notifications"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onClear={() => setQuery('')}
          />
          <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
            <input
              className="h-4 w-4"
              type="checkbox"
              checked={showUnreadOnly}
              onChange={(event) => setShowUnreadOnly(event.target.checked)}
            />
            Show unread only
          </label>
        </div>

        <div className="mt-4 space-y-3">
          {isLoading && (
            <p className="rounded-lg bg-[var(--surface-hover)] p-4 text-sm text-[var(--foreground-muted)]">Loading notifications...</p>
          )}

          {!isLoading && filteredNotifications.length === 0 && (
            <div className="rounded-lg border border-[var(--border)] p-6 text-center">
              <Bell className="mx-auto h-8 w-8 text-[var(--foreground-subtle)]" />
              <p className="mt-2 text-sm text-[var(--foreground-muted)]">No notifications match this filter.</p>
            </div>
          )}

          {!isLoading && filteredNotifications.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-[var(--border)] p-4 transition-colors hover:bg-[var(--surface-hover)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{item.message}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--foreground-muted)]">
                    <span>{typeLabel(item.type)}</span>
                    <span>•</span>
                    <span>
                      {item.createdAt
                        ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                        : 'Just now'}
                    </span>
                    {!item.isRead && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-indigo-700">
                        <Circle className="h-2.5 w-2.5 fill-current" />
                        Unread
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!item.isRead && (
                    <Button size="sm" variant="secondary" onClick={() => handleMarkOne(item.id)}>
                      Mark Read
                    </Button>
                  )}

                  {item.link && (
                    <Link
                      href={item.link}
                      className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                      onClick={() => handleMarkOne(item.id)}
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
