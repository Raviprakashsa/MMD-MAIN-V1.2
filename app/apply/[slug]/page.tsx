import Link from 'next/link'
import { getPublicFormDataAction } from '@/lib/actions/module5-automation'
import { PublicApplicationForm } from '@/components/apply/PublicApplicationForm'

interface ApplyPageProps {
  params: Promise<{ slug: string }>
}

interface PublicField {
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

interface PublicRequirement {
  jobTitle: string
  skills: string[]
  experienceMin: number
  experienceMax: number
  location: string
  workMode: string
}

interface PublicFormPayload {
  form: {
    id?: string
    formFields: PublicField[]
  }
  requirement: PublicRequirement
}

export default async function ApplyPage({ params }: Readonly<ApplyPageProps>) {
  const { slug } = await params
  const response = await getPublicFormDataAction({ slug })

  if (!response.success || !response.data) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto mt-16 max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-2xl font-bold">Application unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">{response.error || 'This application link is not available.'}</p>
          <Link href="/" className="mt-4 inline-flex text-sm font-medium text-cyan-400 hover:underline">
            Return home
          </Link>
        </div>
      </main>
    )
  }

  const data = response.data as PublicFormPayload

  return (
    <main className="min-h-screen bg-slate-950 p-6">
      <PublicApplicationForm
        slug={slug}
        formId={data.form.id || ''}
        formFields={data.form.formFields || []}
        requirement={data.requirement}
      />
    </main>
  )
}
