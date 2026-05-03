'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Building2, User, DollarSign, Calendar } from 'lucide-react'
import { PageContainer } from '@/components/ui/PageContainer'
import Button from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input' // Assuming these exist or standard Input
import { useToast } from '@/components/ui/Toast' // Assuming Toast exists
import { useSession } from 'next-auth/react'
import { createInvoice } from '@/lib/actions/module14-invoice'
import { getCompanies } from '@/lib/actions/module3-company'
import { getPlacements } from '@/lib/actions/module8-placement'

// Types
interface Company {
    _id: string
    name: string
}

interface Placement {
    _id: string
    candidate: {
        firstName: string
        lastName: string
    }
    requirementId?: string
    feeAmount?: number
    currency?: string
}

export default function CreateInvoicePage() {
    const router = useRouter()
    const toast = useToast()

    const [loading, setLoading] = useState(false)
    const [companies, setCompanies] = useState<Company[]>([])
    const [placements, setPlacements] = useState<Placement[]>([])

    const [formData, setFormData] = useState({
        companyId: '',
        placementId: '',
        requirementId: '',
        amount: '',
        currency: 'INR',
        dueDate: '' // Optional if needed by schema, but schema implies amount/currency/company are core
    })

    const { data: session } = useSession()
    const role = session?.user?.role || 'RECRUITER'
    const canCreateInvoice = role === 'SUPER_ADMIN' || role === 'COORDINATOR'

    useEffect(() => {
        if (!canCreateInvoice) {
            toast.error("Access Denied", "Only Super Admin and Coordinators can create invoices")
            router.push('/dashboard/invoices')
        }
    }, [canCreateInvoice, router, toast])

    // Fetch Companies on Mount
    useEffect(() => {
        async function fetchCompanies() {
            try {
                const res = await getCompanies({})
                if (res.success && Array.isArray(res.data)) {
                    setCompanies(res.data as any)
                }
            } catch (error) {
                console.error("Failed to fetch companies", error)
            }
        }
        fetchCompanies()
    }, [])

    // Fetch Placements when Company Selected
    useEffect(() => {
        if (!formData.companyId) {
            setPlacements([])
            return
        }

        async function fetchPlacements() {
            try {
                const res = await getPlacements({ companyId: formData.companyId })
                if (res.success && Array.isArray(res.data)) {
                    setPlacements(res.data as any)
                }
            } catch (error) {
                console.error("Failed to fetch placements", error)
            }
        }
        fetchPlacements()
    }, [formData.companyId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!formData.companyId || !formData.amount) {
                toast.error("Error", "Please fill in all required fields")
                setLoading(false)
                return
            }

            const payload: any = {
                companyId: formData.companyId,
                amount: parseFloat(formData.amount),
                currency: formData.currency,
            }

            if (formData.placementId) {
                payload.placementId = formData.placementId
            }

            if (formData.dueDate) {
                payload.dueDate = formData.dueDate
            }

            const res = await createInvoice(payload)

            if (res.success) {
                toast.success("Success", "Invoice created successfully")
                router.refresh() // Force refresh data
                router.push('/dashboard/invoices')
            } else {
                toast.error("Error", res.error || "Failed to create invoice")
            }
        } catch (error) {
            toast.error("Error", "An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    // Handle placement selection to auto-fill amount if available
    const handlePlacementChange = (value: string) => {
        const placement = placements.find(p => p._id === value)
        setFormData(prev => ({
            ...prev,
            placementId: value,
            requirementId: placement?.requirementId || '',
            amount: placement?.feeAmount ? placement.feeAmount.toString() : prev.amount,
            currency: placement?.currency || prev.currency
        }))
    }

    return (
        <PageContainer
            header={
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.back()} size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Invoice</h1>
                        <p className="text-slate-500">Generate a new invoice for a company or placement.</p>
                    </div>
                </div>
            }
        >
            <div className="max-w-3xl mx-auto">
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Company Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Building2 className="w-4 h-4" /> Company <span className="text-red-500">*</span>
                            </label>
                            <Select
                                value={formData.companyId}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyId: e.target.value, placementId: '' }))}
                                options={[
                                    { label: "Select Company", value: "" },
                                    ...companies.map(c => ({ label: c.name, value: c._id }))
                                ]}
                                disabled={loading}
                            />
                        </div>

                        {/* Placement Selection (Optional) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <User className="w-4 h-4" /> Placement (Optional)
                            </label>
                            <Select
                                value={formData.placementId}
                                onChange={(e) => handlePlacementChange(e.target.value)}
                                options={[
                                    { label: "Select Placement", value: "" },
                                    ...placements.map(p => ({
                                        label: `${p.candidate?.firstName} ${p.candidate?.lastName} ${p.feeAmount ? `(${p.currency} ${p.feeAmount})` : ''}`,
                                        value: p._id
                                    }))
                                ]}
                                disabled={!formData.companyId || loading}
                            />
                            {!formData.companyId && (
                                <p className="text-xs text-slate-500">Select a company first</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Amount */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" /> Amount <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                disabled={loading}
                                min="0"
                                step="0.01"
                            />
                        </div>

                        {/* Currency */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Currency
                            </label>
                            <Select
                                value={formData.currency}
                                onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                                options={[
                                    { label: 'INR (₹)', value: 'INR' },
                                    { label: 'USD ($)', value: 'USD' },
                                    { label: 'EUR (€)', value: 'EUR' },
                                    { label: 'GBP (£)', value: 'GBP' }
                                ]}
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                <Calendar className="w-4 h-4" /> Due Date
                            </label>
                            <Input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            disabled={loading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            leftIcon={loading ? undefined : <Save className="w-4 h-4" />}
                        >
                            {loading ? 'Creating...' : 'Create Invoice'}
                        </Button>
                    </div>

                </form>
            </div>
        </PageContainer>
    )
}
