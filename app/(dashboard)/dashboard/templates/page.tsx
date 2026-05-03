"use client"

import { useEffect, useMemo, useState } from 'react'
import { FileText, Plus, Copy, Sparkles } from 'lucide-react'
import Button from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SearchInput, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  getTemplates,
  saveTemplate,
  updateTemplate,
  duplicateTemplate,
  renderTemplate,
} from '@/lib/actions/module11-template'

interface Template {
  _id: string
  name: string
  category: string
  subject?: string
  body: string
  variables: string[]
  isPublic: boolean
  createdAt?: Date | string
  updatedAt?: Date | string
}

const emptyTemplate = {
  name: '',
  category: '',
  subject: '',
  body: '',
  isPublic: true,
}

export default function TemplatesPage() {
  const toast = useToast()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState({ ...emptyTemplate })
  const [preview, setPreview] = useState<{ subject?: string; body?: string } | null>(null)

  const fetchTemplates = async () => {
    setLoading(true)
    const result = await getTemplates({})
    setLoading(false)
    if (!result.success) {
      toast.error('Failed to load templates', result.error)
      return
    }
    setTemplates(result.data ?? [])
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const categories = useMemo(() => {
    const unique = Array.from(new Set(templates.map((t) => t.category)))
    return unique.sort((a, b) => a.localeCompare(b))
  }, [templates])

  const filteredTemplates = useMemo(() => {
    let result = templates
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q))
    }
    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter)
    }
    return result
  }, [templates, searchQuery, categoryFilter])

  const openCreate = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormState({ ...emptyTemplate })
    setPreview(null)
    setIsModalOpen(true)
  }

  const openEdit = (tpl: Template) => {
    setIsEditing(true)
    setEditingId(tpl._id)
    setFormState({
      name: tpl.name,
      category: tpl.category,
      subject: tpl.subject ?? '',
      body: tpl.body,
      isPublic: tpl.isPublic,
    })
    setPreview(null)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formState.name.trim() || !formState.category.trim() || !formState.body.trim()) {
      toast.error('Missing fields', 'Name, category, and body are required')
      return
    }

    if (isEditing && editingId) {
      const result = await updateTemplate({ id: editingId, ...formState })
      if (!result.success) {
        toast.error('Update failed', result.error)
        return
      }
      setTemplates((prev) => prev.map((t) => (t._id === editingId && result.data ? (result.data as Template) : t)))
      toast.success('Template Updated', formState.name)
      fetchTemplates()
    } else {
      const result = await saveTemplate(formState)
      if (!result.success) {
        toast.error('Create failed', result.error)
        return
      }
      if (result.data) setTemplates((prev) => [result.data as Template, ...prev])
      toast.success('Template Created', formState.name)
    }

    setIsModalOpen(false)
  }

  const handleDuplicate = async (tpl: Template) => {
    const result = await duplicateTemplate({ templateId: tpl._id })
    if (!result.success) {
      toast.error('Duplicate failed', result.error)
      return
    }
    if (result.data) {
      const tplData = result.data as Template
      setTemplates((prev) => [tplData, ...prev])
      toast.success('Template Duplicated', tplData.name)
      fetchTemplates()
    }
  }

  const handlePreview = async () => {
    const variables = Array.from(new Set(formState.body.match(/\{\{(\w+)\}\}/g) || [])).map((v) => v.slice(2, -2))
    const data = variables.reduce<Record<string, string>>((acc, v) => {
      acc[v] = `${v}-value`
      return acc
    }, {})

    if (!editingId) {
      setPreview({ subject: formState.subject, body: formState.body })
      return
    }

    const result = await renderTemplate({ templateId: editingId, data })
    if (!result.success) {
      toast.error('Preview failed', result.error)
      return
    }
    setPreview(result.data ?? null)
  }

  const insertVariable = (variable: string) => {
    setFormState((s) => ({ ...s, body: `${s.body} {{${variable}}}`.trim() }))
  }

  return (
    <div className="space-y-6 text-[var(--foreground)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
            <FileText className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Templates</h1>
            <p className="text-[var(--foreground-muted)]">Manage email templates and automation</p>
          </div>
        </div>
        <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreate}>
          New Template
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-[var(--border)] shadow-sm">
        <SearchInput
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          className="sm:w-64"
        />
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[{ value: 'all', label: 'All Categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
          className="sm:w-48"
        />
      </div>

      {loading ? (
        <div className="card-premium p-6">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="card-premium p-10 text-center text-[var(--foreground-muted)]">
          No templates yet. Create your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <div key={tpl._id} className="card-premium p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">{tpl.name}</h3>
                  <p className="text-xs text-[var(--foreground-muted)]">{tpl.category}</p>
                </div>
                <button className="text-xs text-[var(--primary)]" onClick={() => openEdit(tpl)}>
                  Edit
                </button>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] line-clamp-3">{tpl.body}</p>
              <div className="flex flex-wrap gap-2">
                {tpl.variables?.map((v) => (
                  <span key={v} className="chip chip-outline text-xs">{`{{${v}}}`}</span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--foreground-muted)]">
                  {tpl.isPublic ? 'Public' : 'Private'}
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" leftIcon={<Copy className="w-3 h-3" />} onClick={() => handleDuplicate(tpl)}>
                    Duplicate
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Template' : 'New Template'}
        description="Create reusable templates with {{variables}}"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="template-name"
                className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5"
              >
                Name
              </label>
              <input
                id="template-name"
                className="input-modern"
                value={formState.name}
                onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
              />
            </div>
            <div>
              <label
                htmlFor="template-category"
                className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5"
              >
                Category
              </label>
              <input
                id="template-category"
                className="input-modern"
                placeholder="JD_REQUEST"
                value={formState.category}
                onChange={(e) => setFormState((s) => ({ ...s, category: e.target.value }))}
              />
            </div>
            <div className="col-span-2">
              <label
                htmlFor="template-subject"
                className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5"
              >
                Subject
              </label>
              <input
                id="template-subject"
                className="input-modern"
                value={formState.subject}
                onChange={(e) => setFormState((s) => ({ ...s, subject: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="template-body"
              className="block text-sm font-semibold text-[var(--foreground-muted)] mb-1.5"
            >
              Body
            </label>
            <textarea
              id="template-body"
              className="input-modern min-h-[160px]"
              value={formState.body}
              onChange={(e) => setFormState((s) => ({ ...s, body: e.target.value }))}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {['companyName', 'jobTitle', 'mmdId', 'location', 'experienceMin'].map((v) => (
                <button
                  key={v}
                  type="button"
                  className="chip chip-outline text-xs"
                  onClick={() => insertVariable(v)}
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.isPublic}
                onChange={(e) => setFormState((s) => ({ ...s, isPublic: e.target.checked }))}
              />
              Public template
            </label>
            <Button variant="secondary" size="sm" leftIcon={<Sparkles className="w-3 h-3" />} onClick={handlePreview}>
              Preview
            </Button>
          </div>

          {preview && (
            <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--surface-hover)]">
              {preview.subject && <p className="text-sm font-semibold mb-1">{preview.subject}</p>}
              <pre className="text-xs text-[var(--foreground-muted)] whitespace-pre-wrap">{preview.body}</pre>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleSave}>
              {isEditing ? 'Save Changes' : 'Create Template'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
