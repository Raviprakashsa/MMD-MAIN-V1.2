import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import connectDB from '@/lib/db/mongodb'
import DataAccessLog from '@/lib/db/models/DataAccessLog'
import ExportJob from '@/lib/db/models/ExportJob'
import { ExportService } from '@/lib/services/export.service'
import { ExportFormatSchema } from '@/lib/validators/common'
import { redirect } from 'next/navigation'

interface PrivacyCenterPageProps {
  searchParams?: Promise<{ gdpr?: string | string[]; error?: string | string[] }>
}

interface PrivacyLogRow {
  id: string
  userId: string
  entity: string
  entityId: string
  action: string
  createdAt: string
}

interface GdprExportRow {
  id: string
  requestedBy: string
  format: 'CSV' | 'JSON' | 'XLSX'
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'DEAD_LETTER'
  createdAt: string
  completedAt: string
  fileUrl: string
  errorMessage: string
}

interface RequestedByUser {
  _id?: string
  name?: string
  email?: string
}

function readQueryValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0]
  return value
}

async function requestGdprExport(formData: FormData) {
  'use server'

  const session = await auth()
  if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    redirect('/forbidden')
  }

  const parsedFormat = ExportFormatSchema.safeParse(formData.get('format'))
  if (!parsedFormat.success) {
    redirect('/admin/privacy?error=invalid-format')
  }

  try {
    await ExportService.createJob(
      { id: session.user.id, role: session.user.role },
      {
        entityType: 'GDPR_PORTABILITY',
        format: parsedFormat.data,
        filter: {
          scope: 'CANDIDATE_DATA_PORTABILITY',
          requestedByRole: session.user.role,
        },
      }
    )

    revalidatePath('/admin/privacy')
    redirect('/admin/privacy?gdpr=created')
  } catch {
    redirect('/admin/privacy?error=create-failed')
  }
}

export default async function PrivacyCenterPage({ searchParams }: Readonly<PrivacyCenterPageProps>) {
  const session = await auth()
  if (!session?.user || !['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)) {
    redirect('/forbidden')
  }

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const gdprFlag = readQueryValue(resolvedSearchParams.gdpr)
  const errorFlag = readQueryValue(resolvedSearchParams.error)

  let dataError: string | null = null
  let logs: PrivacyLogRow[] = []
  let gdprJobs: GdprExportRow[] = []

  try {
    await connectDB()

    const rawLogs = await DataAccessLog.find().sort({ createdAt: -1 }).limit(100).lean()
    logs = rawLogs.map((log) => ({
      id: String(log._id),
      userId: String(log.userId || ''),
      entity: String(log.entity || ''),
      entityId: String(log.entityId || ''),
      action: String(log.action || ''),
      createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : '',
    }))

    const rawGdprJobs = await ExportJob.find({ entityType: 'GDPR_PORTABILITY' })
      .sort({ createdAt: -1 })
      .limit(25)
      .populate('requestedBy', 'name email')
      .lean()

    gdprJobs = rawGdprJobs.map((job) => {
      const requester = job.requestedBy
      const requesterProfile = requester && typeof requester === 'object' && ('name' in requester || 'email' in requester)
        ? requester as unknown as RequestedByUser
        : null

      const requestedBy = requesterProfile?.name || requesterProfile?.email || String(requester || 'Unknown user')

      return {
        id: String(job._id),
        requestedBy,
        format: job.format,
        status: job.status,
        createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : '',
        completedAt: job.completedAt ? new Date(job.completedAt).toISOString() : '',
        fileUrl: job.fileUrl || '',
        errorMessage: job.errorMessage || '',
      }
    })
  } catch {
    dataError = 'Unable to load privacy logs and GDPR export jobs right now.'
  }

  return (
    <div className="space-y-4 h-screen overflow-y-auto scroll-smooth p-6">
      <h1 className="text-2xl font-semibold">Privacy & Governance</h1>
      <p className="text-sm text-gray-600">Recent access logs (last 100). View, export, and mutation events are recorded for auditing.</p>

      {gdprFlag === 'created' && (
        <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          GDPR export request submitted. Track progress in the Data Portability section below.
        </div>
      )}

      {errorFlag && (
        <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {errorFlag === 'invalid-format'
            ? 'Invalid export format selected.'
            : 'Could not submit GDPR export request. Please try again.'}
        </div>
      )}

      {dataError && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {dataError}
        </div>
      )}

      <div className="border rounded overflow-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">User</th>
              <th className="px-2 py-1 text-left">Entity</th>
              <th className="px-2 py-1 text-left">Action</th>
              <th className="px-2 py-1 text-left">When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="px-2 py-1">{log.userId}</td>
                <td className="px-2 py-1">{log.entity} / {log.entityId}</td>
                <td className="px-2 py-1">{log.action}</td>
                <td className="px-2 py-1">{log.createdAt}</td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td className="px-2 py-2" colSpan={4}>
                  No access logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Data Portability</h2>
        <p className="text-sm text-gray-700">Create and monitor GDPR portability requests. Completed jobs expose a secure file URL for downstream delivery.</p>
        <form action={requestGdprExport} className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="gdpr-format" className="block text-xs text-gray-600">Export format</label>
            <select id="gdpr-format" name="format" defaultValue="JSON" className="mt-1 rounded border px-3 py-2 text-sm">
              <option value="JSON">JSON</option>
              <option value="CSV">CSV</option>
              <option value="XLSX">XLSX</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Create GDPR Export Request
          </button>
        </form>

        <div className="border rounded overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Requested By</th>
                <th className="px-2 py-1 text-left">Format</th>
                <th className="px-2 py-1 text-left">Status</th>
                <th className="px-2 py-1 text-left">Requested At</th>
                <th className="px-2 py-1 text-left">Completed At</th>
                <th className="px-2 py-1 text-left">Download</th>
              </tr>
            </thead>
            <tbody>
              {gdprJobs.map((job) => (
                <tr key={job.id} className="border-t">
                  <td className="px-2 py-1">{job.requestedBy}</td>
                  <td className="px-2 py-1">{job.format}</td>
                  <td className="px-2 py-1">{job.status}</td>
                  <td className="px-2 py-1">{job.createdAt || '-'}</td>
                  <td className="px-2 py-1">{job.completedAt || '-'}</td>
                  <td className="px-2 py-1">
                    {job.status === 'COMPLETED' && job.fileUrl ? (
                      <a href={job.fileUrl} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    ) : (job.status === 'FAILED' || job.status === 'DEAD_LETTER') ? (
                      <span className="text-rose-600">{job.errorMessage || 'Failed'}</span>
                    ) : (
                      <span className="text-gray-500">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
              {!gdprJobs.length && (
                <tr>
                  <td className="px-2 py-2" colSpan={6}>
                    No GDPR export requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Retention</h2>
        <p className="text-sm text-gray-700">Retain audit logs for 7 years. Soft deletes are archived for 30 days before anonymization.</p>
      </div>
    </div>
  )
}
