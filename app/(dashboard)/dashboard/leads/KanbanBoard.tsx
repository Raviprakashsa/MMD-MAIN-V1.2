import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
    closestCorners,
    useDroppable,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { LeadCard } from './LeadCard'
import { cn } from '@/lib/utils'

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'REJECTED' | 'STALLED'

export interface Lead {
    _id: string
    companyName: string
    sourcePlatform: string
    sector: 'IT' | 'NON_IT' | 'CORE' | 'STARTUP' | 'ENTERPRISE'
    contactName?: string
    contactPhone?: string
    contactEmail?: string
    confidenceScore: number
    status: LeadStatus
    notes?: string
    convertedToCompanyId?: string
    assignedTo?: string
    createdAt?: Date | string
    updatedAt?: Date | string
}

interface KanbanBoardProps {
    readonly leads: Lead[]
    readonly onStatusChange: (leadId: string, newStatus: LeadStatus) => void
    readonly onEdit: (lead: Lead) => void
    readonly onConvert: (leadId: string) => void
}

const statusColumns: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'REJECTED', 'STALLED']

const statusColors: Record<string, string> = {
    NEW: 'bg-blue-50/80 border-blue-200 text-blue-700',
    CONTACTED: 'bg-indigo-50/80 border-indigo-200 text-indigo-700',
    QUALIFIED: 'bg-purple-50/80 border-purple-200 text-purple-700',
    CONVERTED: 'bg-emerald-50/80 border-emerald-200 text-emerald-700',
    REJECTED: 'bg-red-50/80 border-red-200 text-red-700',
    STALLED: 'bg-amber-50/80 border-amber-200 text-amber-700',
}

export function KanbanBoard({ leads, onStatusChange, onEdit, onConvert }: KanbanBoardProps) {
    const [activeLead, setActiveLead] = useState<Lead | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event
        const lead = leads.find((l) => l._id === active.id)
        if (lead) setActiveLead(lead)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over) {
            setActiveLead(null)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        const activeLead = leads.find((l) => l._id === activeId)
        if (!activeLead) return

        if (statusColumns.includes(overId as LeadStatus)) {
            if (activeLead.status !== overId) {
                onStatusChange(activeId, overId as LeadStatus)
            }
        }
        else {
            const overLead = leads.find((l) => l._id === overId)
            if (overLead && activeLead.status !== overLead.status) {
                onStatusChange(activeId, overLead.status)
            }
        }
        setActiveLead(null)
    }

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full w-full gap-5 overflow-x-auto pb-6 items-start px-2">
                {statusColumns.map((status) => (
                    <DroppableColumn
                        key={status}
                        status={status}
                        leads={leads.filter((l) => l.status === status)}
                        onEdit={onEdit}
                        onConvert={onConvert}
                    />
                ))}
            </div>

            {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeLead ? (
                        <div className="transform rotate-2 scale-105 cursor-grabbing shadow-2xl">
                            <LeadCard
                                lead={activeLead}
                                onEdit={() => { }}
                                onConvert={() => { }}
                            />
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    )
}

function DroppableColumn({ status, leads, onEdit, onConvert }: {
    readonly status: LeadStatus,
    readonly leads: Lead[],
    readonly onEdit: (lead: Lead) => void,
    readonly onConvert: (leadId: string) => void
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: status,
    });

    return (
        <div className="flex-shrink-0 w-[340px] flex flex-col gap-3">
            {/* Glassmorphism Header */}
            <div className={cn(
                "flex items-center justify-between p-3.5 rounded-2xl border backdrop-blur-md shadow-sm transition-all",
                statusColors[status],
                isOver && "ring-2 ring-primary ring-offset-2"
            )}>
                <div className="flex items-center gap-2.5">
                    <span className="text-sm font-bold tracking-tight uppercase">{status}</span>
                </div>
                <span className="flex items-center justify-center h-6 min-w-6 px-2 rounded-lg bg-white/70 text-xs font-bold shadow-sm backdrop-blur-sm">
                    {leads.length}
                </span>
            </div>

            <SortableContext
                id={status}
                items={leads.map(l => l._id)}
                strategy={verticalListSortingStrategy}
            >
                <div
                    ref={setNodeRef}
                    className={cn(
                        "flex-1 min-h-[500px] space-y-3 p-1 transition-colors rounded-xl",
                        isOver ? "bg-slate-50/50" : ""
                    )}
                    data-status={status}
                >
                    {leads.map((lead) => (
                        <LeadCard
                            key={lead._id}
                            lead={lead}
                            onEdit={onEdit}
                            onConvert={onConvert}
                        />
                    ))}
                    {leads.length === 0 && (
                        <div className="h-32 rounded-xl border-2 border-dashed border-gray-200/50 flex flex-col items-center justify-center gap-2 opacity-50">
                            <span className="text-sm font-medium text-gray-400">Empty</span>
                        </div>
                    )}
                </div>
            </SortableContext>
        </div>
    )
}
