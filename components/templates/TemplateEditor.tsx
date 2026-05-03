"use client"

import { useMemo, useRef, useState, useTransition } from "react"
import { saveTemplate } from "@/lib/actions/module11-template"

const defaultVariables = ["companyName", "jobTitle", "mmdId", "candidateName", "interviewDate", "location"]

interface TemplateEditorProps {
  onSaved?: () => void
}

export function TemplateEditor({ onSaved }: Readonly<TemplateEditorProps>) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("JD_REQUEST")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("Dear {{candidateName}},\n\nPlease confirm your availability for {{jobTitle}}.")
  const [message, setMessage] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const variables = useMemo(() => {
    const matches = Array.from(body.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1])
    return Array.from(new Set([...defaultVariables, ...matches]))
  }, [body])

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const next = body.slice(0, start) + `{{${variable}}}` + body.slice(end)
    setBody(next)
    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + variable.length + 4
      textarea.focus()
    })
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    startTransition(async () => {
      const result = await saveTemplate({ name, category, subject, body, isPublic: true })
      if (!result.success) {
        setMessage(result.error || "Failed to save")
        return
      }
      setMessage("Template saved")
      onSaved?.()
    })
  }

  const highlighted = body.replaceAll(/\{\{(\w+)\}\}/g, (_m, v) => `<code class="text-cyan-300">{{${v}}}</code>`)

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-200">Template Editor</p>
          <p className="text-xs text-slate-500">Variables auto-extracted; rendered in cyan.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-slate-800 px-2 py-1">Rich text ready</span>
          <span className="rounded bg-slate-800 px-2 py-1">No scripts allowed</span>
        </div>
      </div>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="tpl-name">Name</label>
            <input
              id="tpl-name"
              className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-200" htmlFor="tpl-category">Category</label>
            <input
              id="tpl-category"
              className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-200" htmlFor="tpl-subject">Subject</label>
          <input
            id="tpl-subject"
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span>Variables</span>
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => insertVariable(v)}
                  className="rounded bg-slate-800 px-2 py-1 text-cyan-300 hover:opacity-80"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white min-h-[200px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email or WhatsApp template body with {{variables}}"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-primary px-4 py-2 text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Template"}
          </button>
          {message && <span className="text-sm text-emerald-400">{message}</span>}
        </div>
      </form>
      <div className="rounded border border-slate-800 bg-slate-950 p-3">
        <p className="text-xs text-slate-400 mb-2">Preview</p>
        <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: highlighted.split("\n").join("<br/>") }} />
      </div>
    </div>
  )
}
