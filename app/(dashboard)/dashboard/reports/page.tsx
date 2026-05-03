import { BarChart3 } from 'lucide-react'
import ReportBuilder from '@/components/reports/ReportBuilder'

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-500/20">
          <BarChart3 className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Reports</h1>
          <p className="text-[var(--foreground-muted)]">Generate and export custom reports</p>
        </div>
      </div>

      <ReportBuilder />
    </div>
  )
}
