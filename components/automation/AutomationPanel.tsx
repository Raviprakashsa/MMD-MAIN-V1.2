"use client"

import { useState, useTransition } from "react"
import { generateRequirementAutomationAction, regenerateContentAction } from "@/lib/actions/module5-automation"

const tabs = [
  { key: "form", label: "Application Form" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "Email" },
  { key: "linkedIn", label: "LinkedIn" },
] as const

type TabKey = (typeof tabs)[number]["key"]
type AutomationStatus = 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED'

interface AutomationState {
  status: AutomationStatus
  attempts: number
  lastAttemptAt: string | Date | null
  lastSuccessAt: string | Date | null
  lastError: string | null
}

interface AutomationStatePayload {
  status?: AutomationStatus | null
  attempts?: number | null
  lastAttemptAt?: string | Date | null
  lastSuccessAt?: string | Date | null
  lastError?: string | null
}

interface AutomationPanelProps {
  requirementId: string
  formUrl?: string
  content: {
    whatsapp?: string | null
    email?: string | null
    linkedIn?: string | null
  }
  automation?: AutomationStatePayload
}

function toAutomationState(source: AutomationStatePayload | undefined, hasGeneratedContent: boolean): AutomationState {
  const status = source?.status
  const normalizedStatus: AutomationStatus = (status === 'PROCESSING' || status === 'COMPLETED' || status === 'FAILED')
    ? status
    : (hasGeneratedContent ? 'COMPLETED' : 'NOT_STARTED')

  return {
    status: normalizedStatus,
    attempts: source?.attempts ?? 0,
    lastAttemptAt: source?.lastAttemptAt ?? null,
    lastSuccessAt: source?.lastSuccessAt ?? null,
    lastError: source?.lastError ?? null,
  }
}

function formatTimestamp(value: string | Date | null): string {
  if (!value) return 'Never'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return date.toLocaleString('en-US')
}

export function AutomationPanel({ requirementId, formUrl, content, automation }: Readonly<AutomationPanelProps>) {
  const toAbsoluteFormUrl = (url?: string | null) => {
    if (!url) return ""
    if (/^https?:\/\//i.test(url)) return url
    if (typeof window === "undefined") return url
    return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`
  }

  const [active, setActive] = useState<TabKey>("form")
  const [currentFormUrl, setCurrentFormUrl] = useState(toAbsoluteFormUrl(formUrl))
  const [draft, setDraft] = useState({
    whatsapp: content.whatsapp ?? "",
    email: content.email ?? "",
    linkedIn: content.linkedIn ?? "",
  })
  const [automationState, setAutomationState] = useState<AutomationState>(() => {
    const hasGeneratedContent = Boolean(formUrl || content.whatsapp || content.email || content.linkedIn)
    return toAutomationState(automation, hasGeneratedContent)
  })
  const [message, setMessage] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  const onGenerateAutomation = () => {
    startTransition(async () => {
      setMessage("")
      try {
        const result = await generateRequirementAutomationAction({ requirementId })
        if (!result?.success || !result.data) {
          const errorMessage = result?.error || "Failed to generate automation"
          setAutomationState((prev) => ({
            ...prev,
            status: 'FAILED',
            attempts: prev.attempts + 1,
            lastAttemptAt: new Date(),
            lastError: errorMessage,
          }))
          setMessage(errorMessage)
          return
        }

        const data = result.data as {
          shareableUrl?: string
          content?: {
            whatsapp?: string | null
            email?: string | null
            linkedIn?: string | null
          }
          automation?: AutomationStatePayload
        }

        if (data.shareableUrl) {
          setCurrentFormUrl(toAbsoluteFormUrl(data.shareableUrl))
        }

        if (data.content) {
          setDraft((prev) => ({
            ...prev,
            whatsapp: data.content?.whatsapp ?? prev.whatsapp,
            email: data.content?.email ?? prev.email,
            linkedIn: data.content?.linkedIn ?? prev.linkedIn,
          }))
        }

        setAutomationState((prev) => {
          if (data.automation) {
            return toAutomationState(data.automation, true)
          }

          return {
            ...prev,
            status: 'COMPLETED',
            attempts: Math.max(prev.attempts, 1),
            lastAttemptAt: prev.lastAttemptAt ?? new Date(),
            lastSuccessAt: new Date(),
            lastError: null,
          }
        })

        setMessage("Automation generated")
      } catch {
        setAutomationState((prev) => ({
          ...prev,
          status: 'FAILED',
          attempts: prev.attempts + 1,
          lastAttemptAt: new Date(),
          lastError: 'Failed to generate automation',
        }))
        setMessage("Failed to generate automation")
      }
    })
  }

  const onRegenerate = (type: "whatsapp" | "email" | "linkedIn") => {
    startTransition(async () => {
      setMessage("")
      try {
        const result = await regenerateContentAction({ requirementId, type })
        if (!result?.success || !result.data) {
          setMessage(result?.error || "Failed to regenerate")
          return
        }
        const data = result.data as { content: string }
        if (!data.content) {
          setMessage("Failed to regenerate")
          return
        }
        setDraft((prev) => ({ ...prev, [type]: data.content }))
        setMessage(`${type} regenerated`)
      } catch (error) {
        console.error("Regenerate content failed", error)
        setMessage("Failed to regenerate")
      }
    })
  }

  const copy = async (text: string) => {
    if (!text) {
      setMessage("Nothing to copy")
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setMessage("Copied to clipboard")
    } catch (e) {
      console.error("Copy failed", e)
      setMessage("Copy failed")
    }
  }

  const renderContent = () => {
    if (active === "form") {
      const statusTone = {
        NOT_STARTED: 'text-slate-300 bg-slate-800',
        PROCESSING: 'text-amber-300 bg-amber-900/30',
        COMPLETED: 'text-emerald-300 bg-emerald-900/30',
        FAILED: 'text-rose-300 bg-rose-900/30',
      } as const

      return (
        <div className="space-y-3">
          <div className="rounded border border-slate-700 bg-slate-800/60 p-3 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wide text-slate-400">Automation status</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded ${statusTone[automationState.status]}`}>
                {automationState.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Attempts: {automationState.attempts} • Last attempt: {formatTimestamp(automationState.lastAttemptAt)}
            </p>
            {automationState.lastSuccessAt && (
              <p className="text-xs text-emerald-300">Last success: {formatTimestamp(automationState.lastSuccessAt)}</p>
            )}
            {automationState.lastError && (
              <p className="text-xs text-rose-300">Last error: {automationState.lastError}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Shareable URL</span>
            {currentFormUrl ? (
              <code className="px-2 py-1 rounded bg-muted text-xs font-mono flex-1 truncate">{currentFormUrl}</code>
            ) : (
              <span className="text-xs text-destructive">Form URL not available yet</span>
            )}
            {currentFormUrl && (
              <button
                className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:opacity-90"
                onClick={() => copy(currentFormUrl)}
              >
                Copy Link
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={onGenerateAutomation}
            className="rounded bg-primary px-3 py-2 text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {automationState.status === 'FAILED'
              ? 'Retry Automation'
              : (currentFormUrl ? 'Regenerate Automation' : 'Generate Form + Content')}
          </button>
          <p className="text-xs text-cyan-400">Auto-generated</p>
        </div>
      )
    }

    const value = draft[active]
    const label = tabs.find((t) => t.key === active)?.label ?? active

    return (
      <div className="space-y-3">
        <label className="text-sm text-muted-foreground" htmlFor={`automation-${active}`}>
          {label}
        </label>
        <textarea
          id={`automation-${active}`}
          className="w-full min-h-[200px] rounded border border-border bg-input px-3 py-2 text-sm"
          value={value}
          placeholder={`Auto-generated ${label} content`}
          onChange={(e) => setDraft((prev) => ({ ...prev, [active]: e.target.value }))}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRegenerate(active)}
            className="rounded bg-primary px-3 py-2 text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            Regenerate {label}
          </button>
          <button
            type="button"
            onClick={() => value && copy(value)}
            className="rounded bg-emerald-600 px-3 py-2 text-white text-sm hover:opacity-90"
          >
            Copy
          </button>
        </div>
        <p className="text-xs text-cyan-400">Auto-generated</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 text-white p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-3 py-2 rounded-md text-sm ${active === tab.key ? "bg-primary text-white" : "bg-slate-800 text-slate-200"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {renderContent()}
      {message && <p className="text-xs text-emerald-400">{message}</p>}
    </div>
  )
}
