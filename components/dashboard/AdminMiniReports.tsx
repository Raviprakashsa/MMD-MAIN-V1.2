import Link from 'next/link'
import { AlertTriangle, Phone, Briefcase } from 'lucide-react'
import InteractiveCard from '@/components/ui/InteractiveCard'
import AnimatedIcon, { CountUp } from '@/components/ui/AnimatedIcon'

type WidgetProps = Readonly<{
  stalledCount?: number
  followupsToday?: number
  openRequirements?: number
}>

export default function AdminMiniReports({ stalledCount = 0, followupsToday = 0, openRequirements = 0 }: WidgetProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <InteractiveCard 
        variant="default" 
        glow="none"
        className="p-4 bg-[var(--surface)] border border-[var(--border)] hover:border-amber-200"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-amber-50">
            <AnimatedIcon icon={AlertTriangle} animation="bounce" size={20} className="text-amber-600" />
          </div>
          <span className="text-sm text-[var(--foreground-muted)]">Stalled &gt; 5 days</span>
        </div>
        <div className="text-3xl font-bold text-[var(--foreground)] mb-2">
          <CountUp value={stalledCount} />
        </div>
        <Link 
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors hover-debounce inline-flex items-center gap-1" 
          href="/dashboard/reports?view=stalled"
        >
          View details →
        </Link>
      </InteractiveCard>

      <InteractiveCard 
        variant="default" 
        glow="primary"
        className="p-4 bg-[var(--surface)] border border-[var(--border)] hover:border-indigo-200"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-indigo-50">
            <AnimatedIcon icon={Phone} animation="bounce" size={20} className="text-indigo-600" />
          </div>
          <span className="text-sm text-[var(--foreground-muted)]">Today&apos;s follow-ups</span>
        </div>
        <div className="text-3xl font-bold text-[var(--foreground)] mb-2">
          <CountUp value={followupsToday} />
        </div>
        <Link 
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors hover-debounce inline-flex items-center gap-1" 
          href="/dashboard/reports?view=followups"
        >
          View list →
        </Link>
      </InteractiveCard>

      <InteractiveCard 
        variant="default" 
        glow="none"
        className="p-4 bg-[var(--surface)] border border-[var(--border)] hover:border-emerald-200"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-emerald-50">
            <AnimatedIcon icon={Briefcase} animation="bounce" size={20} className="text-emerald-600" />
          </div>
          <span className="text-sm text-[var(--foreground-muted)]">Open requirements</span>
        </div>
        <div className="text-3xl font-bold text-[var(--foreground)] mb-2">
          <CountUp value={openRequirements} />
        </div>
        <Link 
          className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors hover-debounce inline-flex items-center gap-1" 
          href="/dashboard/reports?view=requirements"
        >
          Drill down →
        </Link>
      </InteractiveCard>
    </div>
  )
}
