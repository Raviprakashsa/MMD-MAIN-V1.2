"use client"

import { useState, useTransition } from "react"
import { submitApplicationAction } from "@/lib/actions/module5-automation"

interface Field {
  name: string
  label: string
  type: string
  required?: boolean
  pattern?: string
  maxSizeMB?: number
  accept?: string[]
  placeholder?: string
  min?: number
  max?: number
}

interface PublicApplicationFormProps {
  slug: string
  formId: string
  formFields: Field[]
  requirement: {
    jobTitle: string
    skills: string[]
    experienceMin: number
    experienceMax: number
    location: string
    workMode: string
  }
}

interface ResumeUploadResponse {
  storageKey: string
  fileName: string
  mimeType: string
  sizeBytes: number
}

async function uploadResumeFile(slug: string, file: File): Promise<ResumeUploadResponse> {
  const payload = new FormData()
  payload.append('slug', slug)
  payload.append('file', file)

  const response = await fetch('/api/public/applications/upload-resume', {
    method: 'POST',
    body: payload,
  })

  const body = await response.json().catch(() => ({} as { error?: string }))
  if (!response.ok) {
    throw new Error(body.error || 'Failed to upload resume file')
  }

  return body as ResumeUploadResponse
}

export function PublicApplicationForm({ slug, formFields, requirement }: Readonly<PublicApplicationFormProps>) {
  const [state, setState] = useState<Record<string, unknown>>({})
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [isPending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    startTransition(async () => {
      const payload: Record<string, unknown> = { slug }
      formFields.forEach((f) => {
        payload[f.name] = state[f.name]
      })

      const resumeField = formFields.find((field) => field.type === 'file')
      const resumeValue = resumeField ? state[resumeField.name] : undefined

      if (resumeField?.required && !(resumeValue instanceof File)) {
        setError('Resume file is required')
        return
      }

      let resumeUpload: ResumeUploadResponse | null = null
      if (resumeValue instanceof File) {
        try {
          resumeUpload = await uploadResumeFile(slug, resumeValue)
        } catch (uploadError) {
          setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload resume file')
          return
        }
      }

      const result = await submitApplicationAction({
        slug,
        name: String(payload.fullName || ''),
        phone: String(payload.phone || ''),
        email: String(payload.email || ''),
        resumeStorageKey: resumeUpload?.storageKey,
        resumeMimeType: resumeUpload?.mimeType,
        resumeFileName: resumeUpload?.fileName,
        resumeSizeBytes: resumeUpload?.sizeBytes,
        skills: payload.skills ? String(payload.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        college: payload.organization ? String(payload.organization) : undefined,
        yearsExperience: payload.experience ? Number(payload.experience) : undefined,
      })
      if (!result.success) {
        setError(result.error || "Submission failed")
        return
      }
      setSuccess("Application submitted!")
    })
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-slate-900 text-white rounded-lg border border-slate-800 p-6 space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-cyan-400">Apply to</p>
        <h1 className="text-2xl font-semibold">{requirement.jobTitle}</h1>
        <p className="text-sm text-slate-300">{requirement.location} • {requirement.workMode}</p>
      </div>

      <div className="h-2 w-full bg-slate-800 rounded">
        <div className="h-2 w-1/3 bg-primary rounded" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {formFields.map((field) => (
          <div key={field.name} className="space-y-1">
            <label className="text-sm text-slate-200">
              {field.label}
              {field.required && <span className="text-cyan-400 ml-1">*</span>}
            </label>
            <input
              type={field.type === 'file' ? 'file' : field.type}
              placeholder={field.placeholder}
              required={field.required}
              pattern={field.pattern}
              min={field.min}
              max={field.max}
              accept={field.accept?.join(',')}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              onChange={(e) => {
                if (field.type === 'file') {
                  setState((prev) => ({ ...prev, [field.name]: e.target.files?.[0] ?? null }))
                  return
                }

                setState((prev) => ({ ...prev, [field.name]: e.target.value }))
              }}
            />
            {field.type === 'file' && (
              <p className="text-xs text-slate-400">Accepted: {field.accept?.join(', ') || 'pdf/doc/docx'} (max {field.maxSizeMB}MB)</p>
            )}
          </div>
        ))}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 rounded bg-[#6366F1] hover:bg-[#4f46e5] text-white font-medium disabled:opacity-50"
        >
          {isPending ? "Submitting..." : "Submit Application"}
        </button>
      </form>
    </div>
  )
}
