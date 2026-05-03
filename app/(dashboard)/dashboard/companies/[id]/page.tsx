import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCompanyById } from '@/lib/actions/module3-company'

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>
}

interface CompanyContact {
  _id: string
  name?: string
  designation?: string
  email?: string
  phone?: string
  isPrimary?: boolean
}

interface CompanyRequirement {
  _id: string
  mmdId?: string
  jobTitle?: string
  status?: string
}

interface CompanyDetails {
  _id: string
  name?: string
  sector?: string
  location?: string
  website?: string
  mouStatus?: string
  contacts?: CompanyContact[]
  requirements?: CompanyRequirement[]
}

export default async function CompanyDetailPage({ params }: Readonly<CompanyDetailPageProps>) {
  const { id } = await params
  const response = await getCompanyById({ id })

  if (!response.success || !response.data) {
    notFound()
  }

  const company = response.data as CompanyDetails

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/companies"
        className="inline-flex items-center text-sm font-medium text-[var(--primary)] hover:underline"
      >
        Back to companies
      </Link>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{company.name || 'Company details'}</h1>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">
          {company.sector || 'Sector TBD'} • {company.location || 'Location TBD'} • MOU: {company.mouStatus || 'Unknown'}
        </p>
        {company.website && (
          <a
            href={company.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex text-sm font-medium text-[var(--primary)] hover:underline"
          >
            Visit website
          </a>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">HR Contacts</h2>
        <div className="mt-3 space-y-3">
          {(company.contacts || []).length ? (
            (company.contacts || []).map((contact) => (
              <div key={contact._id} className="rounded-lg border border-[var(--border)] p-3">
                <p className="font-semibold text-[var(--foreground)]">
                  {contact.name || 'Unnamed contact'}
                  {contact.isPrimary ? ' (Primary)' : ''}
                </p>
                <p className="text-sm text-[var(--foreground-muted)]">{contact.designation || 'No designation'}</p>
                <p className="text-sm text-[var(--foreground-muted)]">{contact.email || 'No email'} • {contact.phone || 'No phone'}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">No contacts found.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Recent Requirements</h2>
        <div className="mt-3 space-y-3">
          {(company.requirements || []).length ? (
            (company.requirements || []).map((req) => (
              <Link
                key={req._id}
                href={`/dashboard/requirements?view=${encodeURIComponent(req._id)}`}
                className="block rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--surface-hover)]"
              >
                <p className="font-semibold text-[var(--foreground)]">{req.jobTitle || 'Untitled role'}</p>
                <p className="text-sm text-[var(--foreground-muted)]">{req.mmdId || 'No ID'} • {req.status || 'Unknown status'}</p>
              </Link>
            ))
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">No requirements found.</p>
          )}
        </div>
      </section>
    </div>
  )
}
