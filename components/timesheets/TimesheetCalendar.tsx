"use client"

import { startOfMonth, endOfMonth, startOfWeek, addDays, format } from "date-fns"

interface DaySummary {
  date: Date | string
  totalHours: number
  backdated?: boolean
  requiresApproval?: boolean
}

interface TimesheetCalendarProps {
  month?: Date
  data: DaySummary[]
}

function tone(hours: number) {
  if (hours === 0) return "bg-white text-[var(--foreground-subtle)]"
  if (hours < 8) return "bg-amber-50 text-amber-700"
  if (hours < 10) return "bg-emerald-50 text-emerald-700"
  return "bg-emerald-100 text-emerald-800"
}

export function TimesheetCalendar({ month = new Date(), data }: Readonly<TimesheetCalendarProps>) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = startOfWeek(endOfMonth(month), { weekStartsOn: 1 })

  const cells: Array<{ date: Date; info?: DaySummary }> = []
  let cursor = start
  const map = new Map<string, DaySummary>()
  data.forEach((d) => {
    const key = format(new Date(d.date), "yyyy-MM-dd")
    map.set(key, { ...d, date: new Date(d.date) })
  })

  while (cursor <= end) {
    const key = format(cursor, "yyyy-MM-dd")
    cells.push({ date: cursor, info: map.get(key) })
    cursor = addDays(cursor, 1)
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--foreground)]">Timesheet Calendar</p>
        <p className="text-xs text-[var(--foreground-muted)]">Today is highlighted • Weekends tinted</p>
      </div>
      <div className="grid grid-cols-7 gap-2 text-xs text-[var(--foreground-muted)]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-center font-semibold">{d}</div>
        ))}
        {cells.map((cell) => {
          const hours = cell.info?.totalHours ?? 0
          const isCurrentMonth = cell.date.getMonth() === month.getMonth()
          const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6
          const isToday = format(cell.date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
          const baseTone = tone(hours)
          return (
            <div
              key={cell.date.toISOString()}
              suppressHydrationWarning
              className={
                `min-h-[90px] rounded-lg border p-2 space-y-2 ${isCurrentMonth ? baseTone : "bg-[var(--background-secondary)] text-[var(--foreground-subtle)]"}` +
                (isWeekend && isCurrentMonth ? " bg-[var(--background-secondary)]" : "") +
                (isToday ? " ring-2 ring-[var(--primary)]/20 border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]" : "")
              }
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{cell.date.getDate()}</span>
                {cell.info?.backdated && (
                  <span className="text-[10px] text-amber-600" title="Backdated, needs approval">⚠</span>
                )}
                {hours < 8 && hours > 0 && <span className="text-[10px] text-amber-700">&lt;8h</span>}
              </div>
              <div className="text-lg font-bold">{hours.toFixed(1)}</div>
              {cell.info?.requiresApproval && <p className="text-[10px] text-amber-700">Pending approval</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
