'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Clock,
  Plus,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  CalendarDays,
  Briefcase,
} from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import Button, { IconButton } from '@/components/ui/Button'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import {
  logWork,
  getTimesheet,
  updateTimesheet,
  deleteTimesheet,
  getPendingTimesheets,
  approveTimesheet,
} from '@/lib/actions/module10-timesheet'
import { getRequirements } from '@/lib/actions/module4-requirement'

const workTypes = [
  'JD Creation',
  'Sourcing',
  'Screening',
  'Interview Coordination',
  'Client Follow-up',
  'Database Update',
  'Administrative',
] as const

type WorkType = (typeof workTypes)[number]

interface TimesheetEntry {
  _id: string
  date: Date | string
  hours: number
  workType: WorkType
  description: string
  requirementId?: string
  isBackdated?: boolean
  requiresApproval?: boolean
}

interface DaySummary {
  date: Date
  totalHours: number
  missing: boolean
  backdated: boolean
  requiresApproval?: boolean
}

interface Requirement {
  id: string
  mmdId?: string
  title: string
  company: string
}

function hoursTone(hours: number) {
  if (hours === 0) return 'bg-white text-[var(--foreground-subtle)] border-[var(--border)]'
  if (hours < 8) return 'bg-amber-50 text-amber-700 border-amber-200'
  if (hours < 10) return 'bg-emerald-50 text-emerald-700 border-emerald-200'
  return 'bg-emerald-100 text-emerald-800 border-emerald-300'
}

function WeekCalendar({
  weekStart: _weekStart,
  days,
  selectedDate,
  onSelectDate,
}: Readonly<{
  weekStart: Date
  days: DaySummary[]
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}>) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')

  return (
    <div className="grid grid-cols-7 gap-2" suppressHydrationWarning>
      {days.map((day, i) => {
        const dateStr = format(new Date(day.date), 'yyyy-MM-dd')
        const isToday = dateStr === todayStr
        const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr
        const isWeekend = i >= 5

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDate(new Date(day.date))}
            className={cn(
              'relative p-3 rounded-xl border transition-all text-left',
              hoursTone(day.totalHours),
              isSelected && 'ring-2 ring-[var(--primary)] ring-offset-2',
              isToday && 'ring-2 ring-[var(--primary)]/30',
              isWeekend && 'opacity-80'
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold">{dayNames[i]}</span>
              {day.requiresApproval && (
                <span className="text-amber-600" title="Pending approval">
                  <AlertCircle className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div className="text-sm font-medium">{format(new Date(day.date), 'd')}</div>
            <div className="text-lg font-bold tabular-nums mt-1">{day.totalHours.toFixed(1)}h</div>
            {day.totalHours > 0 && day.totalHours < 8 && (
              <span className="text-[10px] text-amber-600">&lt;8h</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function MonthCalendar({
  month,
  entries,
  onSelectDate,
}: Readonly<{
  month: Date
  entries: TimesheetEntry[]
  onSelectDate: (date: Date) => void
}>) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = startOfWeek(endOfMonth(month), { weekStartsOn: 1 })

  const cells: Array<{ date: Date; totalHours: number }> = []
  let cursor = start
  const dateMap = new Map<string, number>()

  entries.forEach((e) => {
    const key = format(new Date(e.date), 'yyyy-MM-dd')
    dateMap.set(key, (dateMap.get(key) || 0) + e.hours)
  })

  while (cursor <= end || cells.length % 7 !== 0) {
    const key = format(cursor, 'yyyy-MM-dd')
    cells.push({ date: cursor, totalHours: dateMap.get(key) || 0 })
    cursor = addDays(cursor, 1)
  }

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="grid grid-cols-7 gap-1 text-xs" suppressHydrationWarning>
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
        <div key={d} className="text-center font-semibold text-[var(--foreground-muted)] py-2">
          {d}
        </div>
      ))}
      {cells.map((cell) => {
        const dateStr = format(cell.date, 'yyyy-MM-dd')
        const isCurrentMonth = cell.date.getMonth() === month.getMonth()
        const isToday = dateStr === today

        return (
          <button
            key={dateStr}
            onClick={() => onSelectDate(cell.date)}
            className={cn(
              'p-2 rounded-lg border text-left transition-all hover:ring-1 hover:ring-[var(--primary)]/30',
              hoursTone(cell.totalHours),
              !isCurrentMonth && 'opacity-40',
              isToday && 'ring-2 ring-[var(--primary)]/40'
            )}
          >
            <div className="font-semibold">{cell.date.getDate()}</div>
            {cell.totalHours > 0 && (
              <div className="text-sm font-bold mt-1">{cell.totalHours.toFixed(1)}h</div>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function TimesheetPage() {
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [days, setDays] = useState<DaySummary[]>([])
  const [entries, setEntries] = useState<TimesheetEntry[]>([])
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())

  // Modal states
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [isEditingEntry, setIsEditingEntry] = useState<TimesheetEntry | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingEntry, setDeletingEntry] = useState<TimesheetEntry | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [formHours, setFormHours] = useState<number>(1)
  const [formWorkType, setFormWorkType] = useState<WorkType>('Sourcing')
  const [formDescription, setFormDescription] = useState('')
  const [formRequirementId, setFormRequirementId] = useState('')

  // View mode
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [monthView] = useState(new Date())

  // Admin pending approvals
  const [pendingApprovals, setPendingApprovals] = useState<TimesheetEntry[]>([])
  const [showPending, setShowPending] = useState(false)

  const fetchTimesheet = async () => {
    setIsLoading(true)
    const result = await getTimesheet({ weekStart })
    if (result.success && result.data) {
      setDays(result.data.days as DaySummary[])
      setEntries(
        result.data.entries.map((e: any) => ({
          ...e,
          _id: e._id.toString(),
          date: e.date,
        }))
      )
    } else {
      toast.error('Failed to load timesheet', result.error || 'Unknown error')
    }
    setIsLoading(false)
  }

  const fetchRequirements = async () => {
    const result = await getRequirements({})
    if (result.success && result.data) {
      const normalizedRequirements: Requirement[] = []

      for (const item of result.data as Array<Record<string, unknown>>) {
          const itemId = typeof item._id === 'string'
            ? item._id
            : (typeof item.id === 'string' ? item.id : '')
          if (!itemId) continue

          const itemCompany = typeof item.company === 'string'
            ? item.company
            : (typeof item.companyName === 'string' ? item.companyName : '')

          const jobTitle = typeof item.jobTitle === 'string'
            ? item.jobTitle
            : (typeof item.title === 'string' ? item.title : 'Untitled Requirement')

          normalizedRequirements.push({
            id: itemId,
            mmdId: typeof item.mmdId === 'string' ? item.mmdId : undefined,
            title: jobTitle,
            company: itemCompany || 'Unknown Company',
          })
      }

      setRequirements(
        normalizedRequirements
      )
    }
  }

  const fetchPendingApprovals = async () => {
    const result = await getPendingTimesheets({})
    if (result.success && result.data) {
      setPendingApprovals(
        result.data.map((e: any) => ({
          _id: e._id,
          date: e.date,
          hours: e.hours,
          workType: e.workType as WorkType,
          description: e.description,
          requirementId: e.requirementId || undefined,
          isBackdated: e.isBackdated,
          requiresApproval: e.requiresApproval,
        }))
      )
    }
  }

  useEffect(() => {
    fetchTimesheet()
    fetchRequirements()
    fetchPendingApprovals()
  }, [weekStart])

  const selectedDateEntries = useMemo(() => {
    if (!selectedDate) return []
    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    return entries.filter((e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr)
  }, [entries, selectedDate])

  const weekStats = useMemo(() => {
    const total = days.reduce((sum, d) => sum + d.totalHours, 0)
    const daysLogged = days.filter((d) => d.totalHours > 0).length
    const pendingDays = days.filter((d) => d.requiresApproval).length
    return { total, daysLogged, pendingDays }
  }, [days])

  const openLogModal = (date?: Date) => {
    // Anti-fraud: Restrict past date logging
    const targetDate = date || new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const targetCheck = new Date(targetDate)
    targetCheck.setHours(0, 0, 0, 0)
    
    if (targetCheck < today) {
      toast.error('Restricted Action', 'You cannot log work for past dates. Please log work daily.')
      return
    }

    setIsEditingEntry(null)
    setFormDate(format(date || new Date(), 'yyyy-MM-dd'))
    setFormHours(1)
    setFormWorkType('Sourcing')
    setFormDescription('')
    setFormRequirementId('')
    setIsLogModalOpen(true)
  }

  const openEditModal = (entry: TimesheetEntry) => {
    // Anti-fraud: Restrict modifying past entries
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const entryDate = new Date(entry.date)
    entryDate.setHours(0, 0, 0, 0)
    
    if (entryDate < today) {
      toast.error('Restricted Action', 'You cannot modify confirmed timesheets from past dates.')
      return
    }

    setIsEditingEntry(entry)
    setFormDate(format(new Date(entry.date), 'yyyy-MM-dd'))
    setFormHours(entry.hours)
    setFormWorkType(entry.workType)
    setFormDescription(entry.description)
    setFormRequirementId(entry.requirementId || '')
    setIsLogModalOpen(true)
  }

  const handleSave = async () => {
    if (formHours <= 0 || formHours > 8) {
      toast.error('Invalid hours', 'Hours must be between 0.5 and 8')
      return
    }
    if (formDescription.length < 10) {
      toast.error('Description too short', 'Please provide at least 10 characters')
      return
    }

    setIsSaving(true)

    if (isEditingEntry) {
      const result = await updateTimesheet({
        id: isEditingEntry._id,
        hours: formHours,
        workType: formWorkType,
        description: formDescription,
      })

      if (result.success) {
        toast.success('Entry updated', 'Timesheet entry has been saved')
        fetchTimesheet()
      } else {
        toast.error('Update failed', result.error || 'Unknown error')
      }
    } else {
      const result = await logWork({
        date: new Date(formDate),
        hours: formHours,
        workType: formWorkType,
        description: formDescription,
        requirementId: formRequirementId || undefined,
      })

      if (result.success) {
        toast.success('Work logged', `${formHours} hours logged successfully`)
        fetchTimesheet()
      } else {
        toast.error('Log failed', result.error || 'Unknown error')
      }
    }

    setIsSaving(false)
    setIsLogModalOpen(false)
  }

  const handleDelete = async () => {
    if (!deletingEntry) return

    // Anti-fraud check
    const today = new Date()
    today.setHours(0,0,0,0)
    const entryDate = new Date(deletingEntry.date)
    entryDate.setHours(0,0,0,0)
    
    if (entryDate < today) {
       toast.error("Restricted Action", "Cannot delete past timesheet records.")
       setIsDeleteDialogOpen(false)
       return
    }

    const result = await deleteTimesheet({ id: deletingEntry._id })
    if (result.success) {
      toast.success('Entry deleted', 'Timesheet entry has been removed')
      fetchTimesheet()
    } else {
      toast.error('Delete failed', result.error || 'Unknown error')
    }

    setDeletingEntry(null)
    setIsDeleteDialogOpen(false)
  }

  const handleApprove = async (entryId: string) => {
    const result = await approveTimesheet({ id: entryId })
    if (result.success) {
      toast.success('Entry approved', 'Timesheet entry has been approved')
      fetchPendingApprovals()
      fetchTimesheet()
    } else {
      toast.error('Approval failed', result.error || 'Unknown error')
    }
  }

  const goToPreviousWeek = () => setWeekStart(subWeeks(weekStart, 1))
  const goToNextWeek = () => setWeekStart(addWeeks(weekStart, 1))
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div className="space-y-6 text-[var(--foreground)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Timesheet</h1>
            <p className="text-[var(--foreground-muted)]">Log and track your working hours</p>
          </div>
        </div>
        <div className="flex gap-2">
          {pendingApprovals.length > 0 && (
            <Button variant="secondary" leftIcon={<AlertCircle className="w-4 h-4" />} onClick={() => setShowPending(!showPending)}>
              {pendingApprovals.length} Pending
            </Button>
          )}
          <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openLogModal(selectedDate || new Date())}>
            Log Work
          </Button>
        </div>
      </div>

      {/* Week Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-stat">
          <p className="text-sm text-[var(--foreground-muted)]">Total This Week</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{weekStats.total.toFixed(1)}h</p>
        </div>
        <div className="card-stat card-stat-success">
          <p className="text-sm text-[var(--foreground-muted)]">Days Logged</p>
          <p className="text-2xl font-bold text-emerald-600">{weekStats.daysLogged}/7</p>
        </div>
        <div className="card-stat">
          <p className="text-sm text-[var(--foreground-muted)]">Daily Average</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {weekStats.daysLogged > 0 ? (weekStats.total / weekStats.daysLogged).toFixed(1) : '0.0'}h
          </p>
        </div>
        <div className="card-stat card-stat-warning">
          <p className="text-sm text-[var(--foreground-muted)]">Pending Approval</p>
          <p className="text-2xl font-bold text-amber-600">{weekStats.pendingDays}</p>
        </div>
      </div>

      {/* Pending Approvals (Admin) */}
      {showPending && pendingApprovals.length > 0 && (
        <div className="card-premium p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Pending Approvals
          </h3>
          <div className="space-y-3">
            {pendingApprovals.map((entry) => (
              <div key={entry._id} className="flex items-center justify-between bg-amber-50 rounded-xl p-4 border border-amber-200">
                <div>
                  <p className="font-semibold">{entry.workType}</p>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {format(new Date(entry.date), 'MMM d, yyyy')} · {entry.hours}h
                  </p>
                  <p className="text-xs text-[var(--foreground-muted)] mt-1">{entry.description}</p>
                </div>
                <Button variant="gradient" size="sm" leftIcon={<Check className="w-4 h-4" />} onClick={() => handleApprove(entry._id)}>
                  Approve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Week Navigation */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-[var(--border)] p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <IconButton aria-label="Previous week" variant="secondary" onClick={goToPreviousWeek}>
            <ChevronLeft className="w-5 h-5" />
          </IconButton>
          <IconButton aria-label="Next week" variant="secondary" onClick={goToNextWeek}>
            <ChevronRight className="w-5 h-5" />
          </IconButton>
          <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
            Today
          </Button>
        </div>
        <div className="text-center">
          <p className="font-semibold text-[var(--foreground)]">
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">Week {format(weekStart, 'w')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'week' ? 'primary' : 'ghost'}
            size="sm"
            leftIcon={<CalendarDays className="w-4 h-4" />}
            onClick={() => setViewMode('week')}
          >
            Week
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {isLoading ? (
        <div className="card-premium p-6">
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={`skel-${i}`} className="h-28 rounded-xl bg-[var(--surface-hover)] animate-pulse" />
            ))}
          </div>
        </div>
      ) : viewMode === 'week' ? (
        <div className="card-premium p-5">
          <WeekCalendar
            weekStart={weekStart}
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
      ) : (
        <div className="card-premium p-5">
          <MonthCalendar month={monthView} entries={entries} onSelectDate={setSelectedDate} />
        </div>
      )}

      {/* Selected Day Entries */}
      {selectedDate && (
        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <Button variant="secondary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => openLogModal(selectedDate)}>
              Add Entry
            </Button>
          </div>

          {selectedDateEntries.length === 0 ? (
            <div className="text-center py-8 text-[var(--foreground-muted)]">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hours logged for this day</p>
              <Button variant="gradient" size="sm" className="mt-3" onClick={() => openLogModal(selectedDate)}>
                Log Work
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateEntries.map((entry) => (
                <div key={entry._id} className="flex items-center justify-between bg-[var(--surface-hover)] rounded-xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-white border border-[var(--border)]">
                      <Briefcase className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{entry.workType}</p>
                        <span className="chip chip-outline text-xs">{entry.hours}h</span>
                        {entry.requiresApproval && (
                          <span className="chip bg-amber-100 text-amber-700 text-xs">Pending</span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--foreground-muted)] line-clamp-1">{entry.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <IconButton aria-label="Edit entry" variant="ghost" size="sm" onClick={() => openEditModal(entry)}>
                      <Edit2 className="w-4 h-4" />
                    </IconButton>
                    <IconButton
                      aria-label="Delete entry"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeletingEntry(entry)
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Work Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={isEditingEntry ? 'Edit Entry' : 'Log Work'}
        description="Record your work hours and activities"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Date</label>
              <input
                type="date"
                className="input-modern"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                disabled={!!isEditingEntry}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Hours</label>
              <input
                type="number"
                className="input-modern"
                min="0.5"
                max="8"
                step="0.5"
                value={formHours}
                onChange={(e) => setFormHours(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Work Type</label>
            <select
              className="select-modern w-full"
              value={formWorkType}
              onChange={(e) => setFormWorkType(e.target.value as WorkType)}
            >
              {workTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {!isEditingEntry && (
            <div>
              <label className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Requirement (Optional)</label>
              <select
                className="select-modern w-full"
                value={formRequirementId}
                onChange={(e) => setFormRequirementId(e.target.value)}
              >
                <option value="">No specific requirement</option>
                {requirements.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.mmdId ? `${r.mmdId} • ` : ''}{r.title} - {r.company}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5">Description (min 10 chars)</label>
            <textarea
              className="input-modern min-h-[100px]"
              placeholder="Describe what you worked on..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : isEditingEntry ? 'Save Changes' : 'Log Work'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Entry"
        message={`Are you sure you want to delete this ${deletingEntry?.hours}h ${deletingEntry?.workType} entry?`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  )
}
