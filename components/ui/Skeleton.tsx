export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="w-12 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
      <div className="w-16 h-8 bg-slate-200 dark:bg-slate-800 rounded" />
    </div>
  )
}

const tableRowIds = ['row-a', 'row-b', 'row-c', 'row-d', 'row-e', 'row-f', 'row-g', 'row-h', 'row-i', 'row-j']

export function SkeletonTable({ rows = 5 }: Readonly<{ rows?: number }>) {
  const rowKeys = tableRowIds.slice(0, rows)
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden animate-pulse">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="w-32 h-5 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {rowKeys.map((rowId) => (
          <div key={`skeleton-table-${rowId}`} className="px-5 py-3 flex items-center gap-3">
            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="flex-1 space-y-2">
              <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const chartBarWidths = ['w-full', 'w-[85%]', 'w-[70%]', 'w-[55%]', 'w-[40%]']

export function SkeletonChart() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 animate-pulse">
      <div className="w-32 h-5 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
      <div className="space-y-3">
        {chartBarWidths.map((widthClass) => (
          <div key={`skeleton-chart-${widthClass}`}>
            <div className="flex justify-between mb-1">
              <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-8 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            <div className={`h-8 bg-slate-200 dark:bg-slate-800 rounded-lg ${widthClass}`} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonKPIGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((id) => (
        <SkeletonCard key={`skeleton-kpi-${id}`} />
      ))}
    </div>
  )
}
