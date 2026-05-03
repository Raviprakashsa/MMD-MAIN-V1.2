'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Plus,
    Download,
    MoreHorizontal,
    Building2,
    FileText,
    IndianRupee,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Send,
    Trash2,
    XCircle
} from 'lucide-react'
import { useSession } from 'next-auth/react'

import { PageContainer } from '@/components/ui/PageContainer'
import Button, { IconButton } from '@/components/ui/Button'
import { SearchInput, Select } from '@/components/ui/Input'
import StatusBadge from '@/components/ui/StatusBadge'
import InteractiveTableRow from '@/components/ui/InteractiveTableRow'
import { ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { getInvoices, getInvoiceMetrics, updateInvoiceStatus, deleteInvoice } from '@/lib/actions/module14-invoice'

// Types
interface Invoice {
    _id: string
    invoiceNumber: string
    company: {
        name: string
    } | null
    placement: {
        candidate: {
            name: string
        } | null
    } | null
    amount: number
    currency: string
    status: string
    issueDate: string
    dueDate: string
    createdAt: string
}

interface InvoiceMetrics {
    totalInvoiced: number
    totalPending: number
    totalOverdue: number
    countPaid: number
    countPending: number
    countOverdue: number
}

function MetricCard({ title, value, subtext, icon: Icon, colorClass }: any) {
    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-start justify-between">
            <div>
                <p className="text-sm text-slate-500 font-medium mb-1">{title}</p>
                <h4 className="text-2xl font-bold text-slate-900 dark:text-white">{value}</h4>
                {subtext && <p className="text-xs text-slate-600 mt-1">{subtext}</p>}
            </div>
            <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
                <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
            </div>
        </div>
    )
}

export default function InvoicesPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const toast = useToast()

    const [loading, setLoading] = useState(true)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [metrics, setMetrics] = useState<InvoiceMetrics | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    // Role-based permissions
    const role = session?.user?.role || 'RECRUITER'
    const canUpdateStatus = role === 'SUPER_ADMIN' || role === 'COORDINATOR'
    const canDelete = role === 'SUPER_ADMIN'
    const canCreateInvoice = role === 'SUPER_ADMIN' || role === 'COORDINATOR'

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [invoicesRes, metricsRes] = await Promise.all([
                getInvoices({ status: statusFilter !== 'ALL' ? statusFilter : undefined }),
                getInvoiceMetrics({})
            ])

            if (invoicesRes.success) {
                setInvoices(invoicesRes.data as any)
            }

            if (metricsRes.success) {
                setMetrics(metricsRes.data as any)
            }
        } catch (error) {
            toast.error('Error', 'Failed to fetch invoice data')
        } finally {
            setLoading(false)
        }
    }

    // Re-fetch when filter changes
    useEffect(() => {
        if (!loading) fetchData() // Optimized: could separate metrics fetch as unique
    }, [statusFilter])

    const filteredInvoices = invoices.filter(inv => {
        if (!inv) return false
        const searchLower = (searchQuery || '').toLowerCase()
        const invNum = String(inv.invoiceNumber || '').toLowerCase()
        const company = inv.company?.name ? String(inv.company.name).toLowerCase() : ''

        return invNum.includes(searchLower) || company.includes(searchLower)
    })

    // Format currency
    const fmtMoney = (amount: number, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
    }

    const handleStatusUpdate = async (invoiceId: string, newStatus: string) => {
        if (!canUpdateStatus) {
            toast.error('Access Denied', 'You do not have permission to update invoice status')
            return
        }
        setIsProcessing(true)
        try {
            const result = await updateInvoiceStatus({ invoiceId, status: newStatus as any })
            if (result.success) {
                setInvoices(prev => prev.map(inv =>
                    inv._id === invoiceId ? { ...inv, status: newStatus } : inv
                ))
                toast.success('Status Updated', `Invoice marked as ${newStatus}`)
                fetchData() // Refresh list and metrics
            } else {
                toast.error('Update Failed', result.error || 'Unknown error')
            }
        } catch {
            toast.error('Error', 'Failed to update invoice status')
        } finally {
            setIsProcessing(false)
            setOpenMenuId(null)
        }
    }

    const handleDeleteConfirm = async () => {
        if (!deleteTarget || !canDelete) return
        setIsProcessing(true)
        try {
            const result = await deleteInvoice({ id: deleteTarget._id })
            if (result.success) {
                setInvoices(prev => prev.filter(inv => inv._id !== deleteTarget._id))
                toast.success('Invoice Deleted', `Invoice ${deleteTarget.invoiceNumber} has been removed`)
                fetchData() // Refresh list and metrics
            } else {
                toast.error('Delete Failed', result.error || 'Unknown error')
            }
        } catch {
            toast.error('Error', 'Failed to delete invoice')
        } finally {
            setIsProcessing(false)
            setDeleteTarget(null)
        }
    }

    const handleExport = () => {
        if (filteredInvoices.length === 0) {
            toast.error('Export Failed', 'No invoices to export')
            return
        }

        const headers = ['Invoice #', 'Company', 'Candidate', 'Amount', 'Currency', 'Status', 'Issue Date', 'Due Date']
        const csvRows = [headers.join(',')]

        filteredInvoices.forEach(inv => {
            const row = [
                inv.invoiceNumber,
                `"${inv.company?.name || ''}"`,
                `"${inv.placement?.candidate?.name || ''}"`,
                inv.amount,
                inv.currency,
                inv.status,
                inv.issueDate ? new Date(inv.issueDate).toLocaleDateString() : '',
                inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : ''
            ]
            csvRows.push(row.join(','))
        })

        const csvString = csvRows.join('\n')
        const blob = new Blob([csvString], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `invoices_export_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Export Successful', `Exported ${filteredInvoices.length} invoices`)
    }


    return (
        <PageContainer
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Invoices</h1>
                        <p className="text-slate-500">Track billing, payments, and outstanding invoices.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>
                            Export
                        </Button>
                        {canCreateInvoice && (
                            <Button
                                onClick={() => router.push('/dashboard/invoices/new')}
                                leftIcon={<Plus className="w-4 h-4" />}
                            >
                                Create Invoice
                            </Button>
                        )}
                    </div>
                </div>
            }
        >
            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <MetricCard
                    title="Total Invoiced"
                    value={metrics ? fmtMoney(metrics.totalInvoiced) : '-'}
                    subtext="Lifetime value"
                    icon={TrendingUp}
                    colorClass="bg-emerald-500 text-emerald-600"
                />
                <MetricCard
                    title="Outstanding"
                    value={metrics ? fmtMoney(metrics.totalPending) : '-'}
                    subtext={`${metrics?.countPending || 0} invoices pending`}
                    icon={IndianRupee}
                    colorClass="bg-blue-500 text-blue-600"
                />
                <MetricCard
                    title="Overdue"
                    value={metrics ? fmtMoney(metrics.totalOverdue) : '-'}
                    subtext={`${metrics?.countOverdue || 0} invoices overdue`}
                    icon={AlertCircle}
                    colorClass="bg-rose-500 text-rose-600"
                />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <SearchInput
                        placeholder="Search invoice # or company..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-48">
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        options={[
                            { label: 'All Statuses', value: 'ALL' },
                            { label: 'Draft', value: 'DRAFT' },
                            { label: 'Sent', value: 'SENT' },
                            { label: 'Paid', value: 'PAID' },
                            { label: 'Overdue', value: 'OVERDUE' },
                            { label: 'Voided', value: 'VOID' }
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
                                <th className="px-6 py-4">Invoice Details</th>
                                <th className="px-6 py-4">Company</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Dates</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                // Skeleton Loading
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" /></td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
                                        <td className="px-6 py-4" />
                                    </tr>
                                ))
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="w-8 h-8 text-slate-300 mb-2" />
                                            <p>No invoices found.</p>
                                            {canCreateInvoice && (
                                                <Button variant="ghost" onClick={() => router.push('/dashboard/invoices/new')}>
                                                    Create Invoice
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((inv) => (
                                    <InteractiveTableRow
                                        key={inv._id}
                                        onClick={() => { }} // No detail page yet
                                        className="cursor-default" // Until we have detail page
                                        interactive={false}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400" />
                                                {inv.invoiceNumber}
                                            </div>
                                            {inv.placement && (
                                                <div className="text-xs text-slate-500 ml-6">
                                                    For: {inv.placement.candidate?.name || 'Unknown candidate'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                {inv.company?.name || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {fmtMoney(inv.amount, inv.currency)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={inv.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <span className="w-10">Issued:</span>
                                                    <span className="font-medium text-slate-900 dark:text-slate-200">
                                                        {new Date(inv.issueDate).toLocaleDateString('en-US')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                                    <span className="w-10">Due:</span>
                                                    <span className={`font-medium ${new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? 'text-red-600' : 'text-slate-900 dark:text-slate-200'}`} suppressHydrationWarning>
                                                        {new Date(inv.dueDate).toLocaleDateString('en-US')}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* Primary Actions based on Status */}
                                                {canUpdateStatus && inv.status === 'DRAFT' && (
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleStatusUpdate(inv._id, 'SENT')
                                                        }}
                                                        disabled={isProcessing}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs font-medium border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                                    >
                                                        <Send className="w-3.5 h-3.5 mr-1.5" />
                                                        Send Invoice
                                                    </Button>
                                                )}

                                                {canUpdateStatus && (inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                                                    <Button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleStatusUpdate(inv._id, 'PAID')
                                                        }}
                                                        disabled={isProcessing}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 text-xs font-medium border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                                    >
                                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                                        Record Payment
                                                    </Button>
                                                )}

                                                {/* Secondary Actions Menu */}
                                                <div className="relative">
                                                    <IconButton
                                                        variant="ghost"
                                                        size="sm"
                                                        aria-label="More options"
                                                        className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setOpenMenuId(openMenuId === inv._id ? null : inv._id)
                                                        }}
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </IconButton>

                                                    {openMenuId === inv._id && (
                                                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 overflow-hidden">
                                                            {canUpdateStatus && inv.status !== 'VOID' && inv.status !== 'PAID' && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleStatusUpdate(inv._id, 'VOID')
                                                                    }}
                                                                    disabled={isProcessing}
                                                                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                                                >
                                                                    <XCircle className="w-4 h-4 text-slate-400" />
                                                                    Void Invoice
                                                                </button>
                                                            )}

                                                            {canDelete && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setOpenMenuId(null)
                                                                        setDeleteTarget(inv)
                                                                    }}
                                                                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors border-t border-slate-100 dark:border-slate-700/50"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                    Delete Invoice
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
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
                title="Delete Invoice"
                message={`Are you sure you want to delete invoice "${deleteTarget?.invoiceNumber}"? This action cannot be undone.`}
                confirmText={isProcessing ? 'Deleting...' : 'Delete'}
                variant="danger"
            />
        </PageContainer>
    )
}
