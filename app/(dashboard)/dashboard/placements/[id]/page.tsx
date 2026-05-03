'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
    ArrowLeft,
    Calendar,
    DollarSign,
    FileText,
    User,
    Building2,
    Briefcase,
    ExternalLink,
    Save,
    Trash2,
    CheckCircle2
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { startTransition, use } from 'react'
import Link from 'next/link'

import { PageContainer } from '@/components/ui/PageContainer'
import Button from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import StatusBadge from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/Toast'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'

// Actions
import { getPlacementById, updatePlacementAction, deletePlacement } from '@/lib/actions/module8-placement'
import { PlacementStatusSchema } from '@/lib/validators/common'

// Schema for form
const EditPlacementSchema = z.object({
    status: PlacementStatusSchema,
    joiningDate: z.string().optional(), // Map to Date
    feeAmount: z.number().optional(),
    currency: z.string().optional(),
    invoiceNumber: z.string().optional(),
    invoiceUrl: z.string().optional(),
    paymentReceivedAt: z.string().optional(),
    backoutReason: z.string().optional(),
    notes: z.string().optional(),
})

type EditPlacementFormValues = z.infer<typeof EditPlacementSchema>

export default function PlacementDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { id } = use(params)
    const { data: session } = useSession()
    const toast = useToast()

    const [loading, setLoading] = useState(true)
    const [placement, setPlacement] = useState<any>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'COORDINATOR']
    const canEdit = session?.user && allowedRoles.includes(session.user.role)

    useEffect(() => {
        if (searchParams.get('edit') === '1' && canEdit) {
            setIsEditing(true)
        }
    }, [searchParams, canEdit])

    const form = useForm<EditPlacementFormValues>({
        resolver: zodResolver(EditPlacementSchema),
        defaultValues: {
            status: 'OFFERED',
            currency: 'USD'
        }
    })

    useEffect(() => {
        fetchPlacement()
    }, [id])

    const fetchPlacement = async () => {
        setLoading(true)
        const res = await getPlacementById({ id })
        if (res.success) {
            setPlacement(res.data)
            // Reset form
            form.reset({
                status: res.data?.status,
                joiningDate: res.data?.joiningDate ? new Date(res.data.joiningDate).toISOString().split('T')[0] : '',
                feeAmount: res.data?.feeAmount ?? undefined,
                currency: res.data?.currency || 'USD',
                invoiceNumber: res.data?.invoiceNumber || '',
                invoiceUrl: res.data?.invoiceUrl || '',
                paymentReceivedAt: res.data?.paymentReceivedAt ? new Date(res.data.paymentReceivedAt).toISOString().split('T')[0] : '',
                backoutReason: res.data?.backoutReason || '',
                notes: res.data?.notes || '',
            })
        } else {
            toast.error('Error', res.error || 'Failed to fetch placement')
            router.push('/dashboard/placements')
        }
        setLoading(false)
    }

    const onSubmit = async (data: EditPlacementFormValues) => {
        setSaving(true)

        // Convert strings to dates
        const payload = {
            ...data,
            id,
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : undefined,
            paymentReceivedAt: data.paymentReceivedAt ? new Date(data.paymentReceivedAt) : undefined,
        }

        const res = await updatePlacementAction(payload as any)
        if (res.success) {
            toast.success('Updated', 'Placement details saved')
            setPlacement((prev: any) => ({ ...prev, ...res.data }))
            setIsEditing(false)
        } else {
            toast.error('Error', res.error || 'Failed to update')
        }
        setSaving(false)
    }

    const handleDelete = async () => {
        const res = await deletePlacement({ id })
        if (res.success) {
            toast.success('Deleted', 'Placement removed')
            router.push('/dashboard/placements')
        } else {
            toast.error('Error', res.error || 'Failed to delete')
        }
    }

    if (loading) return <div className="p-8 text-center">Loading placement details...</div>

    if (!placement) return <div className="p-8 text-center">Placement not found</div>

    return (
        <PageContainer
            header={
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/placements')} className="pl-0 hover:bg-transparent text-slate-500">
                                <ArrowLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Placement Details</h1>
                        <p className="text-slate-500">Ref: {placement.requirement?.mmdId} • {placement.candidate?.firstName} {placement.candidate?.lastName}</p>
                    </div>
                    <div className="flex gap-2">
                        {canEdit && !isEditing && (
                            <>
                                <Button variant="danger" onClick={() => setIsDeleteOpen(true)} leftIcon={<Trash2 className="w-4 h-4" />}>
                                    Delete
                                </Button>
                                <Button onClick={() => setIsEditing(true)} leftIcon={<FileText className="w-4 h-4" />}>
                                    Edit Details
                                </Button>
                            </>
                        )}
                        {isEditing && (
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button onClick={form.handleSubmit(onSubmit)} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                                    Save Changes
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Main Info */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Status & Dates Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-brand-500" />
                            Status & Timeline
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Current Status</label>
                                {isEditing ? (
                                    <Select
                                        {...form.register('status')}
                                        options={[
                                            { label: 'Offered', value: 'OFFERED' },
                                            { label: 'Accepted', value: 'ACCEPTED' },
                                            { label: 'Joined', value: 'JOINED' },
                                            { label: 'Invoice Sent', value: 'INVOICE_SENT' },
                                            { label: 'Paid', value: 'PAID' },
                                            { label: 'Backed Out', value: 'BACKED_OUT' },
                                        ]}
                                    />
                                ) : (
                                    <StatusBadge status={placement.status} />
                                )}
                            </div>

                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Joining Date</label>
                                {isEditing ? (
                                    <Input type="date" {...form.register('joiningDate')} />
                                ) : (
                                    <div className="font-medium flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        {placement.joiningDate ? new Date(placement.joiningDate).toLocaleDateString('en-US') : 'Not set'}
                                    </div>
                                )}
                            </div>

                            {isEditing && (
                                <div className="md:col-span-2">
                                    <label className="text-sm text-slate-500 block mb-1">Backout Reason (if applicable)</label>
                                    <Input {...form.register('backoutReason')} placeholder="Reason for backing out..." />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Financials Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-emerald-500" />
                            Financials
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Fee Amount</label>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <div className="w-24">
                                            <Select {...form.register('currency')} options={[{ label: 'USD', value: 'USD' }, { label: 'EUR', value: 'EUR' }, { label: 'GBP', value: 'GBP' }]} />
                                        </div>
                                        <Input type="number" {...form.register('feeAmount', { valueAsNumber: true })} />
                                    </div>
                                ) : (
                                    <div className="font-medium text-lg">
                                        {placement.currency} {placement.feeAmount?.toLocaleString('en-US') ?? '0.00'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Payment Received Date</label>
                                {isEditing ? (
                                    <Input type="date" {...form.register('paymentReceivedAt')} />
                                ) : (
                                    <div className="font-medium">
                                        {placement.paymentReceivedAt ? new Date(placement.paymentReceivedAt).toLocaleDateString('en-US') : 'Pending'}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Invoice Number</label>
                                {isEditing ? (
                                    <Input {...form.register('invoiceNumber')} />
                                ) : (
                                    <div className="font-medium">{placement.invoiceNumber || '-'}</div>
                                )}
                            </div>

                            <div>
                                <label className="text-sm text-slate-500 block mb-1">Invoice URL</label>
                                {isEditing ? (
                                    <Input {...form.register('invoiceUrl')} placeholder="https://..." />
                                ) : (
                                    placement.invoiceUrl ? (
                                        <a href={placement.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline flex items-center gap-1">
                                            View Invoice <ExternalLink className="w-3 h-3" />
                                        </a>
                                    ) : '-'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 className="font-semibold text-lg mb-4">Notes</h3>
                        {isEditing ? (
                            <Textarea {...form.register('notes')} rows={4} />
                        ) : (
                            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{placement.notes || 'No notes added.'}</p>
                        )}
                    </div>

                </div>

                {/* Right: Relational Info (ReadOnly) */}
                <div className="space-y-6">

                    {/* Candidate Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold">
                                {placement.candidate?.firstName?.[0]}{placement.candidate?.lastName?.[0]}
                            </div>
                            <div>
                                <h4 className="font-semibold">{placement.candidate?.firstName} {placement.candidate?.lastName}</h4>
                                <p className="text-xs text-slate-500">Candidate</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Email</span>
                                <span className="font-medium">{placement.candidate?.email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Phone</span>
                                <span className="font-medium">{placement.candidate?.phone || '-'}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Link href={`/dashboard/candidates?id=${placement.candidate?._id}`} className="text-xs text-brand-600 hover:underline flex items-center gap-1 justify-end">
                                    View Profile <ArrowLeft className="w-3 h-3 rotate-180" />
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Requirement Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold truncate w-40">{placement.requirement?.title}</h4>
                                <p className="text-xs text-slate-500">{placement.requirement?.mmdId}</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Company</span>
                                <span className="font-medium">{placement.company?.name}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Link href={`/dashboard/requirements?q=${placement.requirement?.mmdId}`} className="text-xs text-brand-600 hover:underline flex items-center gap-1 justify-end">
                                    View Requirement <ArrowLeft className="w-3 h-3 rotate-180" />
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <ConfirmDialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Delete Placement"
                message="Are you sure you want to delete this placement? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </PageContainer>
    )
}
