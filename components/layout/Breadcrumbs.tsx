'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  companies: 'Companies',
  requirements: 'Requirements',
  candidates: 'Candidates',
  leads: 'Leads',
  timesheet: 'Timesheet',
  templates: 'Templates',
  reports: 'Reports',
  admin: 'Admin',
  users: 'Users',
  audit: 'Audit Logs',
  privacy: 'Privacy Center',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // Don't show breadcrumbs on the main dashboard
  if (segments.length <= 1) return null

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1

    // Check if segment is an ID (MongoDB ObjectId or UUID)
    const isId = /^[a-f0-9]{24}$/i.test(segment) || /^[a-f0-9-]{36}$/i.test(segment)
    const label = isId ? `#${segment.slice(0, 8)}...` : routeLabels[segment] || segment

    return {
      label,
      href,
      isLast,
    }
  })

  return (
    <nav className="flex items-center gap-1 text-sm mb-6" aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.map((crumb, _index) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="text-foreground font-semibold">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
