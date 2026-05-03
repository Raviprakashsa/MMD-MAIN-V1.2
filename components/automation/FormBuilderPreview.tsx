"use client"

interface FormField {
  name: string
  label: string
  type: string
  required?: boolean
  placeholder?: string
}

interface FormBuilderPreviewProps {
  formFields: FormField[]
}

export function FormBuilderPreview({ formFields }: Readonly<FormBuilderPreviewProps>) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-white space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Form Preview</h3>
        <span className="text-xs text-cyan-400">Auto-generated</span>
      </div>
      <div className="space-y-4">
        {formFields.map((field) => (
          <div key={field.name} className="space-y-1">
            <label className="text-sm text-slate-200">
              {field.label}
              {field.required && <span className="text-cyan-400 ml-1">*</span>}
            </label>
            <input
              readOnly
              placeholder={field.placeholder}
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
