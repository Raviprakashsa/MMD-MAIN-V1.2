'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, AlertTriangle, FileWarning, Calendar, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { listNotificationsAction, markNotificationReadAction, markAllNotificationsReadAction } from '@/lib/actions/module13-notification'

interface NotificationItem {
  _id: string
  type: string
  message: string
  link?: string
  isRead: boolean
  createdAt?: string
}

const typeConfig: Record<string, { icon: any; color: string; bg: string }> = {
  STALLED_REQ: {
    icon: AlertTriangle,
    color: 'text-[#F59E0B]',
    bg: 'bg-[#F59E0B]/10',
  },
  MISSING_JD: {
    icon: FileWarning,
    color: 'text-[#EF4444]',
    bg: 'bg-[#EF4444]/10',
  },
  FOLLOW_UP: {
    icon: Calendar,
    color: 'text-[#06B6D4]',
    bg: 'bg-[#06B6D4]/10',
  },
}

export default function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const unread = items.filter((i) => !i.isRead).length

  async function load() {
    try {
      const res = await listNotificationsAction({})
      if (res.success && res.data) {
        setItems(res.data as NotificationItem[])
      }
    } catch {
      // Silently fail
    }
  }

  async function markAll() {
    // Optimistic update
    setItems(items.map(i => ({ ...i, isRead: true })))

    const res = await markAllNotificationsReadAction({})
    if (!res.success) {
      // Revert on failure (simple reload)
      load()
    }
  }

  async function markOne(id: string) {
    // Optimistic update
    setItems(items.map(i => i._id === id ? { ...i, isRead: true } : i))

    await markNotificationReadAction({ id })
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          isOpen ? 'bg-[#1E293B] text-white' : 'text-slate-400 hover:bg-[#1E293B] hover:text-white'
        )}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs font-bold bg-[#EF4444] text-white rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-[#0F1623] border border-[#1E293B] rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E293B]">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="text-xs text-[#06B6D4] hover:text-[#22D3EE] transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-[#1E293B] text-slate-400 hover:text-white transition-colors"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No notifications</p>
                <p className="text-sm text-slate-500 mt-1">You&apos;re all caught up!</p>
              </div>
            ) : (
              items.map((n) => {
                const config = typeConfig[n.type] || typeConfig.FOLLOW_UP
                const Icon = config.icon

                return (
                  <div
                    key={n._id}
                    className={cn(
                      'px-4 py-3 border-b border-[#1E293B] transition-colors',
                      n.isRead ? 'hover:bg-[#1E293B]/20' : 'bg-[#1E293B]/30'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn('p-2 rounded-lg flex-shrink-0', config.bg)}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm', n.isRead ? 'text-slate-300' : 'text-white')}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {n.createdAt
                              ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                              : 'Just now'}
                          </span>
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => {
                                markOne(n._id)
                                setIsOpen(false)
                              }}
                              className="text-xs text-[#06B6D4] hover:text-[#22D3EE] flex items-center gap-1 transition-colors"
                            >
                              View <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                      {!n.isRead && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-[#6366F1]" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-4 py-2 border-t border-[#1E293B]">
              <Link
                href="/dashboard/notifications"
                className="text-sm text-[#06B6D4] hover:text-[#22D3EE] transition-colors"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
