'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { Archive, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react'
import Button from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import {
  getArchivedItems,
  restoreCandidate,
  restoreCompany,
  restoreRequirement,
} from '@/lib/actions/archive'

type ArchiveType = 'company' | 'requirement' | 'candidate'

interface ArchivedItem {
  id: string
  type: ArchiveType
  title: string
  subtitle: string
  deletedAt: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeArchivedList(items: unknown, type: ArchiveType): ArchivedItem[] {
  if (!Array.isArray(items)) return []

  const normalized: ArchivedItem[] = []
  for (const item of items) {
    const row = asRecord(item)
    if (!row) continue

    const id = asString(row._id) || asString(row.id)
    const deletedAt = asString(row.deletedAt)
    if (!id || !deletedAt) continue

    if (type === 'company') {
      normalized.push({
        id,
        type,
        title: asString(row.name) || 'Unnamed Company',
        subtitle: 'Company',
        deletedAt,
      })
      continue
    }

    if (type === 'requirement') {
      const mmdId = asString(row.mmdId)
      const jobTitle = asString(row.jobTitle) || 'Untitled Role'
      normalized.push({
        id,
        type,
        title: mmdId ? `${mmdId} • ${jobTitle}` : jobTitle,
        subtitle: 'Requirement',
        deletedAt,
      })
      continue
    }

    normalized.push({
      id,
      type,
      title: asString(row.name) || 'Unnamed Candidate',
      subtitle: asString(row.email) || 'Candidate',
      deletedAt,
    })
  }

  return normalized
}

function getDaysToExpiry(deletedAt: string): number {
  const deletedTs = new Date(deletedAt).getTime()
  if (!Number.isFinite(deletedTs)) return 0
  const ageDays = Math.floor((Date.now() - deletedTs) / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - ageDays)
}

export default function ArchiveManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ArchiveType>('all')
  const [items, setItems] = useState<ArchivedItem[]>([])

  const role = session?.user?.role || 'RECRUITER'
  const isAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN'

  const loadArchive = async (refreshOnly = false) => {
    if (!isAdmin) return

    if (refreshOnly) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    try {
      const response = await getArchivedItems({})
      if (!response.success || !response.data) {
        toast.error('Archive load failed', response.error || 'Could not load archived items')
        return
      }

      const payload = asRecord(response.data)
      const companies = normalizeArchivedList(payload?.companies, 'company')
      const requirements = normalizeArchivedList(payload?.requirements, 'requirement')
      const candidates = normalizeArchivedList(payload?.candidates, 'candidate')

      const merged = [...companies, ...requirements, ...candidates]
      merged.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
      setItems(merged)
    } catch {
      toast.error('Archive load failed', 'Unexpected error while loading archive data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard')
      return
    }

    if (status === 'authenticated' && isAdmin) {
      loadArchive()
    }
  }, [status, isAdmin, router])

  const filteredItems = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return items.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (!lowered) return true

      return (
        item.title.toLowerCase().includes(lowered) ||
        item.subtitle.toLowerCase().includes(lowered) ||
        item.type.toLowerCase().includes(lowered)
      )
    })
  }, [items, query, typeFilter])

  const handleRestore = async (item: ArchivedItem) => {
    setRestoringId(item.id)
    try {
      let response
      if (item.type === 'company') {
        response = await restoreCompany({ id: item.id })
      } else if (item.type === 'requirement') {
        response = await restoreRequirement({ id: item.id })
      } else {
        response = await restoreCandidate({ id: item.id })
      }

      if (!response.success) {
        toast.error('Restore failed', response.error || 'Could not restore archived item')
        return
      }

      setItems((prev) => prev.filter((archived) => archived.id !== item.id))
      toast.success('Item restored', `${item.title} has been restored`)
    } catch {
      toast.error('Restore failed', 'Unexpected error while restoring item')
    } finally {
      setRestoringId(null)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Archive Management</h1>
        <p className="text-slate-500">Loading archived records...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Admin Access Required</h1>
        </div>
        <p className="mt-2 text-sm">Only Admin and Super Admin users can access archive management.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Archive Management</h1>
            <p className="text-slate-500">Restore soft-deleted companies, requirements, and candidates within 30 days.</p>
          </div>
        </div>
        <Button
          variant="secondary"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => loadArchive(true)}
          isLoading={isRefreshing}
          loadingText="Refreshing..."
        >
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
        <SearchInput
          placeholder="Search archived records"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery('')}
        />
        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as 'all' | ArchiveType)}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'company', label: 'Companies' },
            { value: 'requirement', label: 'Requirements' },
            { value: 'candidate', label: 'Candidates' },
          ]}
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500">
          {filteredItems.length} archived record(s) in restore window
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredItems.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-500">No archived records found for the selected filters.</div>
          )}

          {filteredItems.map((item) => {
            const expiresIn = getDaysToExpiry(item.deletedAt)
            return (
              <div key={`${item.type}-${item.id}`} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.subtitle} • Archived {format(new Date(item.deletedAt), 'dd MMM yyyy, h:mm a')} • {expiresIn} day(s) left
                  </p>
                </div>

                <Button
                  size="sm"
                  leftIcon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => handleRestore(item)}
                  isLoading={restoringId === item.id}
                  loadingText="Restoring..."
                >
                  Restore
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
