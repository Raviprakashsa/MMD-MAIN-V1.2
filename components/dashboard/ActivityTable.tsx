import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { ExternalLink, AlertCircle, Clock, CheckCircle2, Mail, Phone, Calendar, Users, FileText, MessageCircle, RefreshCw } from 'lucide-react'

function getOutcomeStyle(outcome: string): string {
  if (outcome === 'SUCCESS') return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
  if (outcome === 'PENDING') return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
  return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
}

interface Activity {
  _id: string
  type: string
  summary: string
  userName?: string
  requirementMmdId?: string
  requirementTitle?: string
  requirementId?: string
  createdAt: Date | string
  outcome?: string
}

interface ActivityTableProps {
  activities: Activity[]
  title?: string
  showUser?: boolean
  emptyMessage?: string
  maxItems?: number
  viewAllHref?: string
}

const typeConfig: Record<string, { color: string; icon: any }> = {
  EMAIL: { color: 'bg-indigo-500', icon: Mail },
  CALL: { color: 'bg-blue-500', icon: Phone },
  MEETING: { color: 'bg-amber-500', icon: Calendar },
  INTERVIEW: { color: 'bg-purple-500', icon: Users },
  NOTE: { color: 'bg-slate-500', icon: FileText },
  WHATSAPP: { color: 'bg-emerald-500', icon: MessageCircle },
  STATUS_CHANGE: { color: 'bg-slate-400', icon: RefreshCw },
}

const REQUIREMENT_ID_REGEX = /^REQ-\d{2}-[A-Z]{2,3}-\d{3}$/

function formatRequirementReference(id?: string, title?: string): string | undefined {
  const normalizedTitle = title?.trim()
  if (normalizedTitle) return normalizedTitle

  if (!id) return undefined

  const normalized = id.trim().toUpperCase()
  if (!normalized) return undefined
  if (REQUIREMENT_ID_REGEX.test(normalized)) return normalized

  return 'Requirement details'
}

function getRequirementViewHref(requirementId: string): string {
  return `/dashboard/requirements?view=${encodeURIComponent(requirementId)}`
}

function toValidDate(value: Date | string): Date | null {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function formatRelativeTimestamp(value: Date | string): string {
  const date = toValidDate(value)
  if (!date) return 'Unknown time'
  return formatDistanceToNow(date, { addSuffix: true })
}

function formatAbsoluteTimestamp(value: Date | string): string | undefined {
  const date = toValidDate(value)
  if (!date) return undefined
  return format(date, 'MMM d, yyyy h:mm a')
}

export function ActivityTable({
  activities,
  title,
  showUser = true,
  emptyMessage = 'No recent activity',
  maxItems,
  viewAllHref,
}: Readonly<ActivityTableProps>) {
  const visibleActivities = maxItems && maxItems > 0 ? activities.slice(0, maxItems) : activities
  const hiddenCount = activities.length - visibleActivities.length

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {title && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            {activities.length > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md">
                {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
              </span>
            )}
          </div>
        </div>
      )}
      
      {visibleActivities.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-800 mb-3">
            <Clock className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{emptyMessage}</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {visibleActivities.map((activity) => {
            const config = typeConfig[activity.type] || { color: 'bg-slate-500', icon: FileText }
            const Icon = config.icon
            const requirementReference = formatRequirementReference(activity.requirementMmdId, activity.requirementTitle)
            const relativeTime = formatRelativeTimestamp(activity.createdAt)
            const absoluteTime = formatAbsoluteTimestamp(activity.createdAt)
            
            return (
              <div 
                key={activity._id} 
                className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', config.color)}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                        {activity.summary}
                      </p>
                      {activity.outcome && (
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase border shrink-0',
                          getOutcomeStyle(activity.outcome)
                        )}>
                          {activity.outcome}
                        </span>
                      )}
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-medium">{activity.type.replace(/_/g, ' ')}</span>
                      
                      {showUser && activity.userName && (
                        <>
                          <span>•</span>
                          <span>{activity.userName}</span>
                        </>
                      )}
                      
                      {requirementReference && (
                        <>
                          <span>•</span>
                          {activity.requirementId ? (
                            <Link
                              href={getRequirementViewHref(activity.requirementId)}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                            >
                              {requirementReference}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{requirementReference}</span>
                          )}
                        </>
                      )}
                      
                      <span>•</span>
                      <span title={absoluteTime}>{relativeTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
          {hiddenCount > 0 && (
            <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Showing latest {visibleActivities.length} of {activities.length} activities</span>
              {viewAllHref && (
                <Link href={viewAllHref} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                  View all
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface FollowUp {
  _id: string
  summary: string
  requirementMmdId?: string
  requirementTitle?: string
  requirementId?: string
  nextFollowUpDate: Date | string
  isOverdue?: boolean
}

interface FollowUpListProps {
  followUps: FollowUp[]
  title?: string
  onComplete?: (id: string) => void
  maxItems?: number
  viewAllHref?: string
}

export function FollowUpList({ followUps, title, onComplete, maxItems, viewAllHref }: Readonly<FollowUpListProps>) {
  const visibleFollowUps = maxItems && maxItems > 0 ? followUps.slice(0, maxItems) : followUps
  const hiddenCount = followUps.length - visibleFollowUps.length

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-full flex flex-col">
      {title && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            {followUps.length > 0 && (
              <span className="text-xs font-medium px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md">
                {followUps.length} pending
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {visibleFollowUps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 mb-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-slate-900 dark:text-white font-semibold mb-1">All caught up!</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">No pending follow-ups</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleFollowUps.map((fu) => {
                const requirementReference = formatRequirementReference(fu.requirementMmdId, fu.requirementTitle)
                const followUpTime = formatAbsoluteTimestamp(fu.nextFollowUpDate)

                return (
                  <div
                    key={fu._id}
                    className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      {/* Priority Icon */}
                      <div className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                        fu.isOverdue ? 'bg-rose-500' : 'bg-blue-500'
                      )}>
                        {fu.isOverdue ? (
                          <AlertCircle className="h-5 w-5 text-white" />
                        ) : (
                          <Clock className="h-5 w-5 text-white" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                            {fu.summary}
                          </p>
                          {onComplete && (
                            <button
                              onClick={() => onComplete(fu._id)}
                              className="shrink-0 p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors"
                              aria-label="Mark as complete"
                              title="Mark as complete"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                          <span className={cn(
                            'font-semibold',
                            fu.isOverdue ? 'text-rose-600 dark:text-rose-400' : ''
                          )}>
                            {fu.isOverdue ? 'OVERDUE' : 'UPCOMING'}
                          </span>

                          {requirementReference && (
                            <>
                              <span>•</span>
                              {fu.requirementId ? (
                                <Link
                                  href={getRequirementViewHref(fu.requirementId)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
                                >
                                  {requirementReference}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ) : (
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{requirementReference}</span>
                              )}
                            </>
                          )}

                          <span>•</span>
                          <span title={followUpTime} className={fu.isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                            {followUpTime || 'Unknown schedule'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {hiddenCount > 0 && (
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <span>Showing nearest {visibleFollowUps.length} of {followUps.length} follow-ups</span>
                {viewAllHref && (
                  <Link href={viewAllHref} className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    View all
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
