'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
    ArrowLeft,
    CheckCircle2
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { PageContainer } from '@/components/ui/PageContainer'
import Button from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'

// Actions
import { createPlacementAction } from '@/lib/actions/module8-placement'
import { getCandidates } from '@/lib/actions/module8-candidate'
import { getRequirements } from '@/lib/actions/module4-requirement'

// Schema
const CreatePlacementSchema = z.object({
    candidateId: z.string().min(1, "Candidate is required"),
    requirementId: z.string().min(1, "Requirement is required"),
    joiningDate: z.string().min(1, "Joining date is required"),
    feeAmount: z.number().min(0).optional(),
    currency: z.string().default('USD'),
    status: z.enum(['OFFERED', 'ACCEPTED', 'JOINED', 'INVOICE_SENT', 'PAID', 'BACKED_OUT']).default('OFFERED'),
    notes: z.string().optional()
})

type CreatePlacementFormValues = z.infer<typeof CreatePlacementSchema>

export default function NewPlacementPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { data: session } = useSession()
    const toast = useToast()

    const [loading, setLoading] = useState(false)
    const [candidates, setCandidates] = useState<any[]>([])
    const [requirements, setRequirements] = useState<any[]>([])

    // Pre-fill from URL
    const preCandidateId = searchParams.get('candidateId') || ''
    const preRequirementId = searchParams.get('requirementId') || ''

    const form = useForm<CreatePlacementFormValues>({
        resolver: zodResolver(CreatePlacementSchema),
        defaultValues: {
            candidateId: preCandidateId,
            requirementId: preRequirementId,
            status: 'OFFERED',
            currency: 'USD',
            joiningDate: new Date().toISOString().split('T')[0]
        }
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        // Fetch candidates and requirements for dropdowns
        const [candRes, reqRes] = await Promise.all([
            getCandidates({}),
            getRequirements({})
        ])

        if (candRes.success) {
            setCandidates(candRes.data as any[])
        }
        if (reqRes.success) {
            setRequirements(reqRes.data as any[])
        }
    }

    const onSubmit = async (data: CreatePlacementFormValues) => {
        setLoading(true)

        // Find companyId from requirement
        const selectedReq = requirements.find(r => r.id === data.requirementId)
        const companyId = selectedReq?.companyId

        if (!companyId) {
            toast.error('Error', 'Invalid requirement selected (no company linked)')
            setLoading(false)
            return
        }

        const payload = {
            ...data,
            companyId,
            joiningDate: new Date(data.joiningDate)
        }

        const res = await createPlacementAction(payload as any)

        if (res.success) {
            toast.success('Success', 'Placement created successfully')
            router.push('/dashboard/placements')
        } else {
            toast.error('Error', res.error || 'Failed to create placement')
        }
        setLoading(false)
    }

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
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New Placement</h1>
                        <p className="text-slate-500">Record a new successful placement.</p>
                    </div>
                </div>
            }
        >
            <div className="max-w-2xl mx-auto">
                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Candidate</label>
                                <Select
                                    {...form.register('candidateId')}
                                    options={[
                                        { label: 'Select Candidate', value: '' },
                                        ...candidates.map(c => ({ label: `${c.firstName} ${c.lastName}`, value: c.id || c._id }))
                                    ]}
                                />
                                {form.formState.errors.candidateId && (
                                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.candidateId.message}</p>
                                )}
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Requirement</label>
                                <Select
                                    {...form.register('requirementId')}
                                    options={[
                                        { label: 'Select Requirement', value: '' },
                                        ...requirements.map(r => ({ label: `${r.title} (${r.mmdId})`, value: r.id || r._id }))
                                    ]}
                                />
                                {form.formState.errors.requirementId && (
                                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.requirementId.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Status</label>
                                <Select
                                    {...form.register('status')}
                                    options={[
                                        { label: 'Offered', value: 'OFFERED' },
                                        { label: 'Accepted', value: 'ACCEPTED' },
                                        { label: 'Joined', value: 'JOINED' },
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Joining Date</label>
                                <Input type="date" {...form.register('joiningDate')} />
                                {form.formState.errors.joiningDate && (
                                    <p className="text-xs text-red-500 mt-1">{form.formState.errors.joiningDate.message}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Currency</label>
                                <Select
                                    {...form.register('currency')}
                                    options={[
                                        { label: 'USD', value: 'USD' },
                                        { label: 'EUR', value: 'EUR' },
                                        { label: 'GBP', value: 'GBP' }
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Fee Amount</label>
                                <Input type="number" {...form.register('feeAmount', { valueAsNumber: true })} placeholder="0.00" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Notes</label>
                                <Textarea {...form.register('notes')} placeholder="Any additional details..." />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button variant="ghost" type="button" onClick={() => router.push('/dashboard/placements')}>
                                Cancel
                            </Button>
                            <Button type="submit" isLoading={loading} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                                Create Placement
                            </Button>
                        </div>

                    </form>
                </div>
            </div>
        </PageContainer>
    )
}
