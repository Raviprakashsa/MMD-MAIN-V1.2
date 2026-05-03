import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppShell } from '@/components/layout'

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const userRole = (session.user.role || 'RECRUITER') as 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR' | 'RECRUITER' | 'SCRAPER'

  return (
    <AppShell userRole={userRole} userName={session.user.name || undefined}>
      {children}
    </AppShell>
  )
}
