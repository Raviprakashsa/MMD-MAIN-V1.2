"use client"

import { useMemo, useState } from "react"
import type { ITemplate } from "@/lib/db/models/Template"

interface TemplateSelectorProps {
  templates: ITemplate[]
  onSelect?: (template: ITemplate) => void
}

export function TemplateSelector({ templates, onSelect }: Readonly<TemplateSelectorProps>) {
  const [category, setCategory] = useState<string>("")
  const [search, setSearch] = useState<string>("")

  const filtered = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory = category ? tpl.category === category : true
      const matchesSearch = tpl.name.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [templates, category, search])

  const categories = Array.from(new Set(templates.map((t) => t.category)))

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Template category"
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates"
          className="flex-1 min-w-[160px] rounded border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
        />
      </div>
      <div className="space-y-2 max-h-[280px] overflow-y-auto">
        {filtered.map((tpl) => (
          <button
            key={String(tpl._id)}
            type="button"
            onClick={() => onSelect?.(tpl)}
            className="w-full rounded border border-slate-800 bg-slate-950 px-3 py-2 text-left hover:border-primary"
          >
            <div className="flex items-center justify-between text-sm text-white">
              <span>{tpl.name}</span>
              <span className="text-xs text-slate-400">{tpl.category}</span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-2">{tpl.subject || 'No subject'}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {tpl.variables?.map((v) => (
                <span key={v} className="text-[11px] font-mono text-cyan-300 bg-slate-800 px-2 py-0.5 rounded">{`{{${v}}}`}</span>
              ))}
            </div>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-slate-500">No templates found.</p>}
      </div>
    </div>
  )
}
