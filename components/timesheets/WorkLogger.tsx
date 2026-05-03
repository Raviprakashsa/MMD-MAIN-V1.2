"use client"

import { useState, useTransition } from "react"
import { format, addDays } from "date-fns"
import { logWork } from "@/lib/actions/module10-timesheet"
import type { WorkType } from "@/lib/db/models/Timesheet"

interface RequirementOption {
  id: string
  label: string
}

interface WorkLoggerProps {
  requirements?: RequirementOption[]
  onLogged?: () => void
}

const workTypes: WorkType[] = [
  "JD Creation",
  "Sourcing",
  "Screening",
  "Interview Coordination",
  "Client Follow-up",
  "Database Update",
  "Administrative",
]

export function WorkLogger({ requirements = [], onLogged }: Readonly<WorkLoggerProps>) {
  const today = format(new Date(), "yyyy-MM-dd")
  const [date, setDate] = useState(today)
  const [requirementId, setRequirementId] = useState<string>("")
  const [workType, setWorkType] = useState<WorkType>("Sourcing")
  const [hours, setHours] = useState<number>(1)
  const [description, setDescription] = useState("")
  const [message, setMessage] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  const maxFuture = format(addDays(new Date(), 1), "yyyy-MM-dd")
  const minPast = format(addDays(new Date(), -14), "yyyy-MM-dd")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    startTransition(async () => {
      const result = await logWork({
        date: new Date(date),
        requirementId: requirementId || undefined,
        workType,
        description,
        hours,
      })
      if (!result.success) {
        setMessage(result.error || "Failed to log work")
        return
      }
      setMessage("Logged")
      setDescription("")
      setHours(1)
      onLogged?.()
    })
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Daily Work Logger</p>
          <p className="text-xs text-slate-500">Single-day entries only. No bulk duplication.</p>
        </div>
        <span className="text-xs text-amber-400">If work is not logged → work is not done.</span>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm text-slate-200" htmlFor="work-date">Date</label>
          <input
            id="work-date"
            type="date"
            min={minPast}
            max={maxFuture}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-200" htmlFor="work-type">Work Type</label>
          <select
            id="work-type"
            value={workType}
            onChange={(e) => setWorkType(e.target.value as WorkType)}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            {workTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-200" htmlFor="work-hours">Hours (0.5 increments)</label>
          <input
            id="work-hours"
            type="number"
            min={0.5}
            max={8}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            required
          />
          <p className="text-xs text-slate-500">Single entry max 8h; per-day cap 24h; &gt;2 days old marked backdated.</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-200" htmlFor="work-req">Requirement (optional)</label>
          <select
            id="work-req"
            value={requirementId}
            onChange={(e) => setRequirementId(e.target.value)}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          >
            <option value="">Unmapped</option>
            {requirements.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-sm text-slate-200" htmlFor="work-desc">Description</label>
          <textarea
            id="work-desc"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white min-h-[100px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was done?"
            required
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-primary px-4 py-2 text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Logging..." : "Log Work"}
          </button>
          {message && <span className="text-sm text-emerald-400">{message}</span>}
        </div>
      </form>
    </div>
  )
}
