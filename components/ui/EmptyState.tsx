'use client'

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: Readonly<EmptyStateProps>) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 bg-[#1E293B]/50 rounded-full mb-4">
        <Icon className="h-10 w-10 text-slate-500" />
      </div>
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 text-center max-w-sm">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-[#6366F1] text-white rounded-lg hover:bg-[#5558E3] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

interface EmptyStateCardProps extends EmptyStateProps {
  className?: string
}

export function EmptyStateCard({ className, ...props }: Readonly<EmptyStateCardProps>) {
  return (
    <div className={`bg-[#0F1623] border border-[#1E293B] rounded-xl ${className || ''}`}>
      <EmptyState {...props} />
    </div>
  )
}
