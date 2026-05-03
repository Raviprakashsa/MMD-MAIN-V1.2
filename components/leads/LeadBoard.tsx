"use client"

import { useMemo } from "react"
import type { ILead, LeadStatus } from "@/lib/db/models/Lead"

interface LeadBoardProps {
  leads: ILead[]
  onConvert?: (lead: ILead) => void
  onStatusChange?: (lead: ILead, next: LeadStatus) => void
}

const columns: { key: LeadStatus; title: string }[] = [
  { key: "NEW", title: "New" },
  { key: "CONTACTED", title: "Contacted" },
  { key: "QUALIFIED", title: "Qualified" },
  { key: "CONVERTED", title: "Converted" },
  { key: "REJECTED", title: "Rejected" },
  { key: "STALLED", title: "Stalled" },
]

function confidenceTone(score: number) {
  if (score > 80) return "bg-emerald-500"
  if (score >= 50) return "bg-amber-500"
  return "bg-rose-500"
}

function progressWidth(score: number) {
  if (score >= 90) return "w-full"
  if (score >= 75) return "w-5/6"
  if (score >= 60) return "w-4/6"
  if (score >= 45) return "w-3/6"
  if (score >= 30) return "w-2/6"
  if (score >= 15) return "w-1/6"
  return "w-[8%]"
}

export function LeadBoard({ leads, onConvert, onStatusChange }: Readonly<LeadBoardProps>) {
  const grouped = useMemo(() => {
    return columns.reduce<Record<LeadStatus, ILead[]>>((acc, col) => {
      acc[col.key] = leads.filter((l) => l.status === col.key)
      return acc
    }, {} as Record<LeadStatus, ILead[]>)
  }, [leads])

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
      {columns.map((col) => (
        <div key={col.key} className="rounded-xl border border-[var(--border)] bg-[var(--background-secondary)] p-3 space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold text-[var(--foreground)]">
            <span>{col.title}</span>
            <span className="text-xs text-[var(--foreground-muted)]">{grouped[col.key]?.length || 0}</span>
          </div>
          <div className="space-y-3">
            {grouped[col.key]?.map((lead) => (
              <div key={String(lead._id)} className="rounded-lg border border-[var(--border)] bg-white p-3 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{lead.companyName}</p>
                    <p className="text-xs text-[var(--foreground-muted)]">{lead.sourcePlatform} • {lead.sector}</p>
                  </div>
                  <span className="text-xs text-[var(--foreground-muted)]">{lead.contactName ?? 'Contact TBD'}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
                    <span>Confidence</span>
                    <span className="text-[var(--foreground)] font-semibold">{lead.confidenceScore}%</span>
                  </div>
                  <div className="h-2 w-full rounded bg-[var(--background-secondary)] overflow-hidden">
                    <div
                      className={`h-2 rounded ${progressWidth(lead.confidenceScore)} ${confidenceTone(lead.confidenceScore)}`}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  {onStatusChange && (
                    <select
                      className="rounded-full border border-[var(--border)] bg-white px-2 py-1 text-[var(--foreground)] shadow-sm"
                      value={lead.status}
                      onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
                      aria-label="Lead status"
                    >
                      {columns.map((opt) => (
                        <option key={opt.key} value={opt.key}>{opt.title}</option>
                      ))}
                    </select>
                  )}
                  {col.key !== "CONVERTED" && onConvert && (
                    <button
                      type="button"
                      onClick={() => onConvert(lead)}
                      className="ml-auto rounded bg-[var(--primary)] px-3 py-1 text-white shadow-sm hover:bg-[var(--primary-hover)]"
                    >
                      Convert
                    </button>
                  )}
                </div>
                {lead.notes && <p className="text-xs text-[var(--foreground-muted)] line-clamp-2">{lead.notes}</p>}
              </div>
            ))}
            {(!grouped[col.key] || grouped[col.key].length === 0) && (
              <p className="text-xs text-[var(--foreground-muted)]">No leads in this stage.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
