import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Types } from "mongoose"
import { getDashboardMetrics, getRecruiterDashboard } from "@/lib/actions/dashboard"
import { getEnhancedLeadMetrics } from "@/lib/actions/module9-leads"
import { AlertCircle } from "lucide-react"
import { PageTransition } from "@/components/layout/PageTransition"

type DashboardRole = 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR' | 'RECRUITER' | 'SCRAPER'
type DashboardRange = '7d' | '30d' | '90d'

function withModernOptOut(content: React.ReactNode) {
  return <div className="ops-modern-optout">{content}</div>
}

function normalizeDashboardRange(value?: string): DashboardRange {
  if (value === '7d' || value === '30d' || value === '90d') return value
  return '30d'
}

function parseCsvParam(value?: string): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeTeamMember(value?: string): 'all' | 'me' {
  return value === 'me' ? 'me' : 'all'
}

function normalizeDashboardRole(role?: string): DashboardRole {
  if (role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'COORDINATOR' || role === 'RECRUITER' || role === 'SCRAPER') {
    return role
  }

  return 'RECRUITER'
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ range?: string; statuses?: string; priorities?: string; teamMember?: string }>
}) {
  const session = await auth()
  const resolvedSearchParams = await searchParams
  const selectedRange = normalizeDashboardRange(resolvedSearchParams?.range)
  const selectedStatuses = parseCsvParam(resolvedSearchParams?.statuses)
  const selectedPriorities = parseCsvParam(resolvedSearchParams?.priorities)
  const selectedTeamMember = normalizeTeamMember(resolvedSearchParams?.teamMember)

  if (!session?.user) {
    redirect("/login")
  }

  const role = normalizeDashboardRole(session.user.role)
  const userId = session.user.id

  try {
    if (role === 'SCRAPER') {
      const [{ ScraperDashboard }, enhancedMetricsRes] = await Promise.all([
        import('./_components/ScraperDashboard'),
        getEnhancedLeadMetrics({}),
      ])

      const enhancedMetrics = enhancedMetricsRes?.data || undefined

      return (
        withModernOptOut(
          <PageTransition>
            <ScraperDashboard userName={session.user.name || 'Scraper'} metrics={enhancedMetrics} />
          </PageTransition>
        )
      )
    }

    // Get dashboard data based on role
    const user = {
      _id: new Types.ObjectId(userId),
      role,
      assignedGroup: null,
    }

    if (role === 'RECRUITER') {
      const [{ RecruiterDashboard }, metrics, recruiterData] = await Promise.all([
        import('./_components/RecruiterDashboard'),
        getDashboardMetrics(user, {
          range: selectedRange,
          statuses: selectedStatuses,
          priorities: selectedPriorities,
          teamMember: selectedTeamMember,
        }),
        getRecruiterDashboard(userId),
      ])

      return (
        withModernOptOut(
          <PageTransition>
            <RecruiterDashboard
              metrics={metrics}
              recruiterData={recruiterData}
              userName={session.user.name || 'Recruiter'}
            />
          </PageTransition>
        )
      )
    }

    if (role === 'COORDINATOR') {
      const [{ CoordinatorDashboard }, metrics] = await Promise.all([
        import('./_components/CoordinatorDashboard'),
        getDashboardMetrics(user, {
          range: selectedRange,
          statuses: selectedStatuses,
          priorities: selectedPriorities,
          teamMember: selectedTeamMember,
        }),
      ])

      return (
        withModernOptOut(
          <PageTransition>
            <CoordinatorDashboard metrics={metrics} userName={session.user.name || 'Coordinator'} />
          </PageTransition>
        )
      )
    }

    const [{ AdminDashboard }, metrics] = await Promise.all([
      import('./_components/AdminPanel'),
      getDashboardMetrics(user, {
        range: selectedRange,
        statuses: selectedStatuses,
        priorities: selectedPriorities,
        teamMember: selectedTeamMember,
      }),
    ])

    return (
      withModernOptOut(
        <PageTransition>
          <AdminDashboard
            metrics={metrics}
            selectedRange={selectedRange}
            userName={session.user.name || 'Admin'}
          />
        </PageTransition>
      )
    )
  } catch (error) {
    console.error('Dashboard error:', error)

    return (
      withModernOptOut(
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--foreground)]">Dashboard Error</h2>
                <p className="text-sm text-[var(--foreground-muted)]">Unable to load dashboard</p>
              </div>
            </div>

            <div className="bg-[var(--surface-hover)] border border-[var(--border)] rounded-lg p-4">
              <p className="text-sm text-[var(--foreground)] mb-2">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
              <p className="text-xs text-[var(--foreground-muted)]">
                Please check:
              </p>
              <ul className="text-xs text-[var(--foreground-muted)] list-disc list-inside mt-2 space-y-1">
                <li>MongoDB is running (check service status)</li>
                <li>Database has been seeded with users (run: npm run db:seed)</li>
                <li>DATABASE_URL is correctly set in .env</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <a
                href="/login"
                className="flex-1 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors text-center text-sm font-medium"
              >
                Back to Login
              </a>
              <a
                href="/dashboard"
                className="flex-1 px-4 py-2 bg-[var(--surface-hover)] text-[var(--foreground)] rounded-lg hover:bg-[var(--surface-active)] transition-colors text-sm font-medium border border-[var(--border)] text-center"
              >
                Retry
              </a>
            </div>
          </div>
        </div>
      )
    )
  }
}
