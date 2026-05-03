'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  readonly error: Error & { digest?: string }
  readonly reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 max-w-md text-center">
        <div className="p-4 bg-red-500/10 rounded-full w-fit mx-auto mb-4">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Something went wrong</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          We encountered an error while loading this page. Please try again.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-500 mb-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#5558E3] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
