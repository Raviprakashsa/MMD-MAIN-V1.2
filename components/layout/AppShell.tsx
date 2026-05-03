'use client'

import { logoutAction } from '@/lib/actions/module1-auth'
import { Sidebar } from '@/components/layout/AppSidebar'
import { TopNav } from '@/components/layout/TopNav'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import AmbientBackground from './AmbientBackground'

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR' | 'RECRUITER' | 'SCRAPER'

interface AppShellProps {
  children: React.ReactNode
  userRole: UserRole
  userName?: string
}

export function AppShell({ children, userRole, userName }: Readonly<AppShellProps>) {
  const handleSignOut = async () => {
    try {
      await logoutAction()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div className="fixed inset-0 w-screen text-foreground overflow-hidden" style={{ overscrollBehavior: 'none' }}>
      {/* CSS-only ambient background – zero JS runtime cost */}
      <AmbientBackground variant="constellation" intensity={1} transparentBg={false} overlayMode="soft" />

      <div className="flex h-full relative z-10 overflow-hidden">
        <Sidebar userRole={userRole} userName={userName} onSignOut={handleSignOut} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TopNav userName={userName} userRole={userRole} />
          <main id="main-content" tabIndex={-1} className="ops-modern-page flex-1 p-6 pb-12 overflow-y-auto custom-scrollbar scroll-smooth">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
