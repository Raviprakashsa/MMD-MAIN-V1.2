'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Plus,
    Search,
    Download,
    MoreHorizontal,
    Building2,
    Users,
    Briefcase,
    Calendar,
    Eye,
    Edit2,
    Trash2
} from 'lucide-react'
import { useSession } from 'next-auth/react'

import { PageContainer } from '@/components/ui/PageContainer'
import Button, { IconButton } from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Input'
import StatusBadge from '@/components/ui/StatusBadge'
import InteractiveTableRow from '@/components/ui/InteractiveTableRow'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getPlacements, deletePlacement } from '@/lib/actions/module8-placement'

// Types
interface Placement {
    _id: string
    candidate: {
        firstName: string
        lastName: string
        email: string
    } | null
    requirement: {
        title: string
        mmdId: string
    } | null
    company: {
        name: string
    } | null
    status: string
    joiningDate?: string
    margin?: number
    feePercentage?: number
    createdAt: string
}

export default function PlacementsPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const toast = useToast()

    const [loading, setLoading] = useState(true)
    const [placements, setPlacements] = useState<Placement[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Placement | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Role-based permissions
    const role = session?.user?.role || 'RECRUITER'
    const canDelete = (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any)) || role === 'COORDINATOR'


    useEffect(() => {
        fetchPlacements()
    }, [])

    const fetchPlacements = async () => {
        setLoading(true)
        try {
            const result = await getPlacements({
                status: statusFilter !== 'ALL' ? statusFilter : undefined
            })

            if (result.success) {
                // Ensure data matches expected type
                setPlacements(result.data as unknown as Placement[])
            } else {
                toast.error('Error', result.error || 'Failed to fetch placements')
            }
        } catch (error) {
            toast.error('Error', 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value)
        // In a real app, strict trigger fetch or filter client-side if data is small
        // For now, let's just trigger a re-fetch or filter effect 
        // Effect will catch it if we add it to dep array, but let's do manual for control or add to dep array
    }

    // Re-fetch when filter changes
    useEffect(() => {
        if (!loading) fetchPlacements()
    }, [statusFilter])


    const filteredPlacements = placements.filter(p => {
        const searchLower = searchQuery.toLowerCase()
        const candidateName = p.candidate ? `${p.candidate.firstName} ${p.candidate.lastName}`.toLowerCase() : ''
        const reqTitle = p.requirement?.title.toLowerCase() || ''
        const companyName = p.company?.name.toLowerCase() || ''

        return candidateName.includes(searchLower) ||
            reqTitle.includes(searchLower) ||
            companyName.includes(searchLower)
    })

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            const result = await deletePlacement({ id: deleteTarget._id })
            if (result.success) {
                setPlacements(prev => prev.filter(p => p._id !== deleteTarget._id))
                toast.success('Placement Deleted', `Placement has been removed`)
                fetchPlacements()
            } else {
                toast.error('Delete Failed', result.error || 'Unknown error')
            }
        } catch {
            toast.error('Error', 'Failed to delete placement')
        } finally {
            setIsDeleting(false)
            setDeleteTarget(null)
        }
    }


    return (
        <PageContainer
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Placements</h1>
                        <p className="text-slate-500">Manage successful candidate placements and tracking.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>
                            Export
                        </Button>
                        <Button
                            onClick={() => router.push('/dashboard/placements/new')}
                            leftIcon={<Plus className="w-4 h-4" />}
                        >
                            New Placement
                        </Button>
                    </div>
                </div>
            }
        >
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <SearchInput
                        placeholder="Search candidate, role, or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-48">
                    <Select
                        value={statusFilter}
                        onChange={handleStatusChange}
                        options={[
                            { label: 'All Statuses', value: 'ALL' },
                            { label: 'Offer', value: 'OFFERED' },
                            { label: 'Joined', value: 'JOINED' },
                            { label: 'Paid', value: 'PAID' },
                            { label: 'Backed Out', value: 'BACKED_OUT' }
                        ]}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Candidate</th>
                                <th className="px-6 py-4">Role & Company</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                // Skeleton Loading
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-2" /><div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td className="px-6 py-4" />
                                    </tr>
                                ))
                            ) : filteredPlacements.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users className="w-8 h-8 text-slate-300 mb-2" />
                                            <p>No placements found.</p>
                                            <Button variant="ghost" onClick={() => router.push('/dashboard/placements/new')}>
                                                Create your first placement
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPlacements.map((placement) => (
                                    <InteractiveTableRow
                                        key={placement._id}
                                        onClick={() => router.push(`/dashboard/placements/${placement._id}`)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 dark:text-white">
                                                {placement.candidate?.firstName} {placement.candidate?.lastName}
                                            </div>
                                            <div className="text-xs text-slate-500">{placement.candidate?.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-white mb-0.5">
                                                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                                                {placement.requirement?.title}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Building2 className="w-3 h-3" />
                                                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">
                                                    {placement.requirement?.mmdId}
                                                </span>
                                                {placement.company?.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={placement.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {placement.joiningDate ? new Date(placement.joiningDate).toLocaleDateString('en-US') : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative">
                                                <IconButton
                                                    variant="ghost"
                                                    size="sm"
                                                    aria-label="More options"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setOpenMenuId(openMenuId === placement._id ? null : placement._id)
                                                    }}
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </IconButton>
                                                {openMenuId === placement._id && (
                                                    <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20 py-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setOpenMenuId(null)
                                                                router.push(`/dashboard/placements/${placement._id}`)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        >
                                                            <Eye className="w-4 h-4" /> View
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setOpenMenuId(null)
                                                                router.push(`/dashboard/placements/${placement._id}/edit`)
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                                                        >
                                                            <Edit2 className="w-4 h-4" /> Edit
                                                        </button>
                                                        {canDelete && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setOpenMenuId(null)
                                                                    setDeleteTarget(placement)
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                                <Trash2 className="w-4 h-4" /> Delete
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </InteractiveTableRow>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmDialog
                isOpen={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete Placement"
                message={`Are you sure you want to delete the placement for "${deleteTarget?.candidate?.firstName ?? ''} ${deleteTarget?.candidate?.lastName ?? ''}"? This action cannot be undone.`}
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
                variant="danger"
            />
        </PageContainer>
    )
}
