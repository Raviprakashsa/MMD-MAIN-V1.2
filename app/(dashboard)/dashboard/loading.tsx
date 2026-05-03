import { SkeletonKPIGrid, SkeletonChart, SkeletonTable } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="w-48 h-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          <div className="w-64 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="space-y-1 text-right">
          <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto" />
          <div className="w-40 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto" />
        </div>
      </div>

      {/* KPI Cards skeleton */}
      <SkeletonKPIGrid />

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>

      {/* Tables skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonTable rows={5} />
        <SkeletonTable rows={5} />
      </div>
    </div>
  )
}
