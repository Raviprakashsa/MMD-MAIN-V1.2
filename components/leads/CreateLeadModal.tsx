'use client'

import { useState, useRef } from 'react'
import { Modal } from '@/components/ui/Modal'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { useToast } from '@/components/ui/Toast'
import { createLead, bulkCreateLeads } from '@/lib/actions/module9-leads'
import { SECTORS, SOURCE_PLATFORMS } from '@/types/leads'
import type { LeadSector, LeadStatus, LeadActivity } from '@/types/leads'
import { UploadCloud, File, AlertCircle } from 'lucide-react'

type ExcelJsModule = typeof import('exceljs')
type PapaParseModule = typeof import('papaparse')

let excelJsModulePromise: Promise<ExcelJsModule> | null = null
let papaParseModulePromise: Promise<PapaParseModule> | null = null

const loadExcelJs = async (): Promise<ExcelJsModule> => {
    if (!excelJsModulePromise) {
        excelJsModulePromise = import('exceljs/dist/exceljs.min.js')
            .then(module => module.default as ExcelJsModule)
            .catch((error) => {
                excelJsModulePromise = null
                throw error
            })
    }

    return excelJsModulePromise
}

const loadPapaParse = async (): Promise<PapaParseModule> => {
    if (!papaParseModulePromise) {
        papaParseModulePromise = import('papaparse')
            .then(module => module.default as PapaParseModule)
            .catch((error) => {
                papaParseModulePromise = null
                throw error
            })
    }

    return papaParseModulePromise
}

const emptyForm = {
    _id: '',
    sourcePlatform: '',
    companyName: '',
    sector: 'IT' as LeadSector,
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    contactLinkedIn: '',
    confidenceScore: 70,
    notes: '',
    status: 'NEW' as LeadStatus,
    followUpDate: '',
    assignedTo: '',
    activities: [] as LeadActivity[],
}

const statusOptions: { value: LeadStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All Statuses' },
    { value: 'NEW', label: 'New' },
    { value: 'CONTACTED', label: 'Contacted' },
    { value: 'QUALIFIED', label: 'Qualified' },
    { value: 'FOLLOW_UP', label: 'Follow-up' },
    { value: 'CONVERTED', label: 'Converted' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'STALLED', label: 'Stalled' },
]

interface CreateLeadModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export function CreateLeadModal({ isOpen, onClose, onSuccess }: Readonly<CreateLeadModalProps>) {
    const toast = useToast()
    const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual')
    const [formState, setFormState] = useState(emptyForm)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Bulk Upload State
    const [parsedData, setParsedData] = useState<any[]>([])
    const [fileName, setFileName] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleCreateLead = async () => {
        if (!formState.companyName.trim() || !formState.sourcePlatform.trim()) {
            toast.error('Missing fields', 'Company name and source platform are required')
            return
        }

        setIsSubmitting(true)
        try {
            const result = await createLead({
                ...formState,
                confidenceScore: formState.confidenceScore,
            })

            if (!result.success) {
                toast.error('Create failed', result.error)
                return
            }

            toast.success('Lead Created', formState.companyName)
            handleClose()
            if (onSuccess) {
                onSuccess()
            }
        } catch (err) {
            console.error('Lead creation error:', err)
            toast.error('Create failed', 'An unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setFileName(file.name)
        const ext = file.name.split('.').pop()?.toLowerCase()

        try {
            if (ext === 'csv') {
                const Papa = await loadPapaParse()
                const text = await file.text()
                const result = Papa.parse<Record<string, unknown>>(text, {
                    header: true,
                    skipEmptyLines: true,
                })
                setParsedData(result.data)
            } else if (ext === 'xlsx') {
                const ExcelJS = await loadExcelJs()
                const arrayBuffer = await file.arrayBuffer()
                const workbook = new ExcelJS.Workbook()
                await workbook.xlsx.load(arrayBuffer)
                const worksheet = workbook.worksheets[0]

                const headers: string[] = []
                worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell) => {
                    headers.push(String(cell.value ?? ''))
                })

                const data: Record<string, unknown>[] = []
                worksheet.eachRow((row, rowIndex) => {
                    if (rowIndex === 1) return
                    const rowData: Record<string, unknown> = {}
                    row.eachCell((cell, colIndex) => {
                        if (headers[colIndex - 1]) {
                            rowData[headers[colIndex - 1]] = cell.value
                        }
                    })
                    data.push(rowData)
                })
                setParsedData(data)
            } else {
                toast.error('Unsupported Format', 'Please upload a .xlsx or .csv file')
                setFileName(null)
            }
        } catch (err) {
            console.error('File parsing error:', err)
            toast.error('File Error', 'Could not parse the selected file')
            setParsedData([])
            setFileName(null)
        }
    }

    const handleBulkSubmit = async () => {
        if (!parsedData || parsedData.length === 0) {
            toast.error('No valid data', 'Please upload a populated Excel file')
            return
        }

        setIsSubmitting(true)
        try {
            // Map the flat excel rows to LeadSchema expectations
            const formattedLeads = parsedData.map(row => ({
                sourcePlatform: row.Source || row.sourcePlatform || 'Website',
                companyName: row.Company || row.companyName || 'Unknown Company',
                sector: row.Sector || row.sector || 'IT',
                contactName: row.ContactName || row.contactName || '',
                contactPhone: String(row.Phone || row.contactPhone || ''),
                contactEmail: row.Email || row.contactEmail || '',
                contactLinkedIn: row.LinkedIn || row.contactLinkedIn || '',
                confidenceScore: Number(row.Confidence) || 50,
                status: row.Status || 'NEW',
                notes: row.Notes || '',
            }))

            const result = await bulkCreateLeads(formattedLeads)

            if (!result.success) {
                toast.error('Bulk Import Failed', result.error)
                return
            }

            toast.success('Bulk Import Complete', `Processed leads count: ${result.data?.attemptedCount}`)
            handleClose()
            if (onSuccess) {
                onSuccess()
            }
        } catch (err) {
            console.error('Bulk import error:', err)
            toast.error('Bulk Import Failed', 'An unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setFormState(emptyForm)
        setParsedData([])
        setFileName(null)
        setActiveTab('manual')
        onClose()
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Add New Lead"
            description="Enter lead details manually or upload an Excel file to track potential hiring opportunities."
            size="lg"
        >
            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-6 mt-2">
                <button
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('manual')}
                >
                    Manual Entry
                </button>
                <button
                    className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'bulk' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    onClick={() => setActiveTab('bulk')}
                >
                    Bulk Upload (Excel)
                </button>
            </div>

            {activeTab === 'manual' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="create-source" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Source Platform *</label>
                            <select
                                id="create-source"
                                title="Source Platform"
                                className="select-modern w-full"
                                value={formState.sourcePlatform}
                                onChange={(e) => setFormState(prev => ({ ...prev, sourcePlatform: e.target.value }))}
                            >
                                <option value="">Select source</option>
                                {SOURCE_PLATFORMS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="create-company" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Company Name *</label>
                            <input
                                id="create-company"
                                className="input-modern"
                                placeholder="Enter company name"
                                value={formState.companyName}
                                onChange={(e) => setFormState(prev => ({ ...prev, companyName: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label htmlFor="create-sector" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Sector *</label>
                            <select
                                id="create-sector"
                                title="Sector"
                                className="select-modern w-full"
                                value={formState.sector}
                                onChange={(e) => setFormState(prev => ({ ...prev, sector: e.target.value as LeadSector }))}
                            >
                                {SECTORS.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="create-confidence" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confidence % *</label>
                            <input
                                id="create-confidence"
                                className="input-modern"
                                type="number"
                                min="1"
                                max="100"
                                placeholder="1-100"
                                value={formState.confidenceScore}
                                onChange={(e) => setFormState(prev => ({ ...prev, confidenceScore: Number(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <h4 className="font-semibold text-slate-900 mb-4">Contact Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="create-contact-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Contact Name *</label>
                                <input
                                    id="create-contact-name"
                                    className="input-modern"
                                    placeholder="Full name"
                                    value={formState.contactName}
                                    onChange={(e) => setFormState(prev => ({ ...prev, contactName: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label htmlFor="create-phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone *</label>
                                <input
                                    id="create-phone"
                                    className="input-modern"
                                    placeholder="+91 XXXXX XXXXX"
                                    value={formState.contactPhone}
                                    onChange={(e) => setFormState(prev => ({ ...prev, contactPhone: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label htmlFor="create-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email *</label>
                                <input
                                    id="create-email"
                                    className="input-modern"
                                    type="email"
                                    placeholder="email@company.com"
                                    value={formState.contactEmail}
                                    onChange={(e) => setFormState(prev => ({ ...prev, contactEmail: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label htmlFor="create-linkedin" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    {formState.sourcePlatform ? `${formState.sourcePlatform} Profile` : 'Profile Link'}
                                </label>
                                <input
                                    id="create-linkedin"
                                    className="input-modern"
                                    placeholder={formState.sourcePlatform ? `Enter ${formState.sourcePlatform} profile URL...` : "https://..."}
                                    value={formState.contactLinkedIn}
                                    onChange={(e) => setFormState(prev => ({ ...prev, contactLinkedIn: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                        <h4 className="font-semibold text-slate-900 mb-4">Tracking Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="create-followup" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Follow-up Date</label>
                                <input
                                    id="create-followup"
                                    className="input-modern"
                                    type="date"
                                    title="Follow-up Date"
                                    placeholder="Select follow-up date"
                                    value={formState.followUpDate}
                                    onChange={(e) => setFormState(prev => ({ ...prev, followUpDate: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label htmlFor="create-status" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
                                <select
                                    id="create-status"
                                    title="Status"
                                    className="select-modern w-full"
                                    value={formState.status}
                                    onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as LeadStatus }))}
                                >
                                    {statusOptions.filter(s => s.value !== 'all').map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4">
                            <label htmlFor="create-notes" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Notes</label>
                            <textarea
                                id="create-notes"
                                className="input-modern min-h-[80px]"
                                placeholder="Add any relevant notes about this lead..."
                                value={formState.notes}
                                onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <AnimatedButton variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </AnimatedButton>
                        <AnimatedButton variant="primary" onClick={handleCreateLead} disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Lead'}
                        </AnimatedButton>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <button
                        type="button"
                        className="w-full border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center bg-indigo-50/50 hover:bg-indigo-50 transition-colors cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            accept=".xlsx,.csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                            <UploadCloud className="w-8 h-8 text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-1">Click to Upload File</h3>
                        <p className="text-slate-500 text-sm">Supports .xlsx and .csv files</p>
                    </button>

                    {fileName && (
                        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <File className="w-8 h-8 text-emerald-500" />
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{fileName}</p>
                                    <p className="text-emerald-600 font-medium text-xs text-left">
                                        {parsedData.length} records parsed securely
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setFileName(null)
                                    setParsedData([])
                                }}
                                className="text-sm text-red-500 hover:text-red-700 font-semibold px-2 py-1"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div className="text-sm text-amber-800">
                            <p className="font-semibold mb-1">Upload Guidelines:</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs">
                                <li>Ensure columns include: <strong>Company</strong>, <strong>Source</strong>, <strong>Sector</strong>.</li>
                                <li>Optional columns: <strong>ContactName</strong>, <strong>Phone</strong>, <strong>Email</strong>, <strong>LinkedIn</strong>.</li>
                                <li>Invalid entries will be gracefully skipped during import.</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <AnimatedButton variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </AnimatedButton>
                        <AnimatedButton
                            variant="primary"
                            onClick={handleBulkSubmit}
                            disabled={isSubmitting || parsedData.length === 0}
                        >
                            {isSubmitting ? 'Importing...' : 'Start Import'}
                        </AnimatedButton>
                    </div>
                </div>
            )}
        </Modal>
    )
}
