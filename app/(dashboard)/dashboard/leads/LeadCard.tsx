import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal, Phone, Mail, Building2, GripVertical, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Lead } from './KanbanBoard'

interface LeadCardProps {
    readonly lead: Lead
    readonly onEdit: (lead: Lead) => void
    readonly onConvert: (leadId: string) => void
}

export function LeadCard({ lead, onEdit, onConvert }: LeadCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: lead._id, data: { ...lead } })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    // Confidence Color Logic
    const getConfidenceColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200'
        if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200'
        return 'text-red-600 bg-red-50 border-red-200'
    }

    // Variants for animation
    const variants = {
        initial: { opacity: 0, y: 10, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
        hover: { y: -2, boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)" }
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={{ ...style, opacity: 0.5 }}
                className={cn(
                    "group relative bg-white rounded-xl border border-indigo-400 p-3 shadow-xl",
                )}
            >
                <div className="pr-6 mb-2">
                    <h4 className="font-semibold text-sm text-[var(--foreground)] truncate">{lead.companyName}</h4>
                </div>
            </div>
        )
    }

    return (
        <motion.div
            ref={setNodeRef}
            style={style}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            whileHover="hover"
            layoutId={lead._id}
            className={cn(
                "group relative bg-white rounded-xl border border-[var(--border)] p-3 shadow-sm transition-colors",
                "hover:border-indigo-300"
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-3 right-3 text-[var(--foreground-muted)] opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:text-[var(--primary)] transition-opacity"
            >
                <GripVertical className="h-4 w-4" />
            </div>

            {/* Header */}
            <div className="pr-6 mb-2">
                <div className="flex items-center gap-1.5 mb-1">
                    <Building2 className="h-3.5 w-3.5 text-[var(--foreground-subtle)]" />
                    <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--foreground-muted)]">
                        {lead.sourcePlatform}
                    </span>
                </div>
                <h4 className="font-semibold text-sm text-[var(--foreground)] truncate" title={lead.companyName}>
                    {lead.companyName}
                </h4>
            </div>

            {/* Contact Info (Compact) */}
            <div className="space-y-1.5 mb-3">
                {lead.contactName && (
                    <p className="text-xs text-[var(--foreground-muted)] flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-[var(--foreground-subtle)]" />
                        {lead.contactName}
                    </p>
                )}
                <div className="flex items-center gap-3">
                    {lead.contactEmail && (
                        <a
                            href={`mailto:${lead.contactEmail}`}
                            className="text-[10px] text-[var(--foreground-subtle)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title={lead.contactEmail}
                        >
                            <Mail className="h-3 w-3" /> Email
                        </a>
                    )}
                    {lead.contactPhone && (
                        <a
                            href={`tel:${lead.contactPhone}`}
                            className="text-[10px] text-[var(--foreground-subtle)] hover:text-[var(--primary)] flex items-center gap-1 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title={lead.contactPhone}
                        >
                            <Phone className="h-3 w-3" /> Call
                        </a>
                    )}
                </div>
            </div>

            {/* Footer / Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] mt-2">
                <div className={cn("px-2 py-0.5 rounded text-[10px] font-medium border", getConfidenceColor(lead.confidenceScore))}>
                    {lead.confidenceScore}% Match
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEdit(lead)}
                        className="p-1.5 text-[var(--foreground-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
                        title="Edit Lead"
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>

                    {lead.status !== 'CONVERTED' && (
                        <button
                            onClick={() => onConvert(lead._id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Convert to Company"
                        >
                            <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    )
}

