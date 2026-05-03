import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCandidateActivitiesAction, getCandidateById } from '@/lib/actions/module8-candidate'

interface CandidateDetailPageProps {
  params: Promise<{ id: string }>
}

interface CandidateRequirement {
  _id: string
  mmdId?: string
  jobTitle?: string
  company?: string
  status?: string
}

interface CandidateDetails {
  _id: string
  name?: string
  email?: string
  phone?: string
  college?: string
  yearsExperience?: number
  skills?: string[]
  status?: string
  resumeUrl?: string
  requirement?: CandidateRequirement | null
}

interface CandidateActivityItem {
  _id: string
  type?: string
  notes?: string
  createdAt?: string
  userId?: {
    name?: string
    email?: string
    role?: string
  } | string
}

export default async function CandidateDetailPage({ params }: Readonly<CandidateDetailPageProps>) {
  const { id } = await params
  const response = await getCandidateById({ id })

  if (!response.success || !response.data) {
    notFound()
  }

  const candidate = response.data as CandidateDetails
  const timelineResponse = await getCandidateActivitiesAction({ candidateId: id, limit: 25 })
  const activities = (timelineResponse.success && timelineResponse.data
    ? timelineResponse.data
    : []) as CandidateActivityItem[]

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/candidates"
        className="inline-flex items-center text-sm font-medium text-[var(--primary)] hover:underline"
      >
        Back to candidates
      </Link>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{candidate.name || 'Candidate'}</h1>
        <p className="mt-2 text-sm text-[var(--foreground-muted)]">{candidate.email || 'No email'} • {candidate.phone || 'No phone'}</p>

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-[var(--foreground-muted)]">Status</p>
            <p className="font-semibold text-[var(--foreground)]">{candidate.status || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--foreground-muted)]">Experience</p>
            <p className="font-semibold text-[var(--foreground)]">{candidate.yearsExperience ?? 0} yrs</p>
          </div>
          <div>
            <p className="text-xs text-[var(--foreground-muted)]">College</p>
            <p className="font-semibold text-[var(--foreground)]">{candidate.college || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--foreground-muted)]">Resume</p>
            {candidate.resumeUrl ? (
              <a
                href={candidate.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[var(--primary)] hover:underline"
              >
                Open
              </a>
            ) : (
              <p className="font-semibold text-[var(--foreground)]">N/A</p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Skills</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(candidate.skills || []).length ? (
            (candidate.skills || []).map((skill) => (
              <span key={skill} className="rounded-full bg-[var(--surface-hover)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
                {skill}
              </span>
            ))
          ) : (
            <p className="text-sm text-[var(--foreground-muted)]">No skills listed.</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Requirement</h2>
        {candidate.requirement ? (
          <Link href={`/dashboard/requirements?view=${encodeURIComponent(candidate.requirement._id)}`} className="mt-3 block rounded-lg border border-[var(--border)] p-3 hover:bg-[var(--surface-hover)]">
            <p className="font-semibold text-[var(--foreground)]">{candidate.requirement.jobTitle || 'Untitled role'}</p>
            <p className="text-sm text-[var(--foreground-muted)]">
              {candidate.requirement.mmdId || 'No ID'} • {candidate.requirement.company || 'Unknown company'} • {candidate.requirement.status || 'Unknown'}
            </p>
          </Link>
        ) : (
          <p className="mt-3 text-sm text-[var(--foreground-muted)]">No linked requirement found.</p>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Activity Timeline</h2>
        {activities.length > 0 ? (
          <div className="mt-4 space-y-3">
            {activities.map((activity) => {
              const actor = typeof activity.userId === 'object' && activity.userId
                ? activity.userId.name || activity.userId.email || 'System'
                : 'System'

              return (
                <div key={activity._id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex rounded-full bg-[var(--surface-hover)] px-2 py-1 text-xs font-semibold text-[var(--foreground)]">
                      {activity.type || 'UPDATE'}
                    </span>
                    <span className="text-xs text-[var(--foreground-muted)]">
                      {activity.createdAt ? new Date(activity.createdAt).toLocaleString('en-US') : 'Unknown time'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--foreground)]">{activity.notes || 'No notes available'}</p>
                  <p className="mt-1 text-xs text-[var(--foreground-muted)]">By: {actor}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--foreground-muted)]">No activity recorded yet.</p>
        )}
      </section>
    </div>
  )
}
