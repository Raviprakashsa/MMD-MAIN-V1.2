'use client'

import { useState, useEffect } from 'react'
import { FileText, Trash2, ExternalLink, Plus, Loader2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import { listDocumentsAction, deleteDocument } from '@/lib/actions/module9-document'
import { useToast } from '@/components/ui/Toast'
import { GlassCard } from '@/components/ui/GlassCard'

interface DocumentManagerProps {
    entityType: 'Company' | 'Requirement' | 'Candidate'
    entityId: string
    readonly?: boolean
}

interface DocumentItem {
    _id: string
    name: string
    category?: string
    url: string
    uploadedBy?: string
    createdAt: string
}

export function DocumentManager({ entityType, entityId, readonly = false }: Readonly<DocumentManagerProps>) {
    const [documents, setDocuments] = useState<DocumentItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newDoc, setNewDoc] = useState({ name: '', category: 'Other', file: null as File | null })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const toast = useToast()

    const fetchDocuments = async () => {
        setIsLoading(true)
        const res = await listDocumentsAction({ entityType, entityId })
        if (res.success && res.data) {
            setDocuments(res.data as unknown as DocumentItem[])
        }
        setIsLoading(false)
    }

    useEffect(() => {
        fetchDocuments()
    }, [entityId, entityType])

    const handleAdd = async () => {
        if (!newDoc.file) {
            toast.error('Missing file', 'Select a file to upload')
            return
        }

        setIsSubmitting(true)

        try {
            const payload = new FormData()
            payload.append('entityType', entityType)
            payload.append('entityId', entityId)
            payload.append('name', newDoc.name.trim() || newDoc.file.name.replace(/\.[a-zA-Z0-9]+$/, ''))
            payload.append('category', newDoc.category)
            payload.append('file', newDoc.file)

            const response = await fetch('/api/documents/upload', {
                method: 'POST',
                body: payload,
            })

            const body = await response.json().catch(() => ({} as { error?: string }))

            if (!response.ok) {
                toast.error('Error', body.error || 'Failed to upload document')
                return
            }

            toast.success('Document Added', 'File uploaded successfully')
            setNewDoc({ name: '', category: 'Other', file: null })
            setIsAdding(false)
            fetchDocuments()
        } catch {
            toast.error('Error', 'Failed to upload document')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (typeof window !== 'undefined' && !window.confirm('Are you sure you want to remove this document?')) return
        const res = await deleteDocument({ id })
        if (res.success) {
            setDocuments(prev => prev.filter(d => d._id !== id))
            toast.success('Deleted', 'Document removed')
        } else {
            toast.error('Error', res.error || 'Failed to delete')
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-[var(--foreground-muted)]">
                    Documents
                </h3>
                {!readonly && !isAdding && (
                    <Button variant="ghost" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setIsAdding(true)}>
                        Add
                    </Button>
                )}
            </div>

            {isAdding && (
                <GlassCard className="p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <input
                        className="w-full px-3 py-2 bg-[var(--surface-hover)] rounded border border-[var(--border)] text-sm"
                        placeholder="Document Name (e.g. MOU, Agreement)"
                        value={newDoc.name}
                        onChange={e => setNewDoc({ ...newDoc, name: e.target.value })}
                    />
                    <div className="flex gap-2">
                        <select
                            className="px-3 py-2 bg-[var(--surface-hover)] rounded border border-[var(--border)] text-sm"
                            value={newDoc.category}
                            onChange={e => setNewDoc({ ...newDoc, category: e.target.value })}
                        >
                            <option value="MOU">MOU</option>
                            <option value="Agreement">Agreement</option>
                            <option value="Resume">Resume</option>
                            <option value="ID Proof">ID Proof</option>
                            <option value="Other">Other</option>
                        </select>
                        <input
                            className="flex-1 px-3 py-2 bg-[var(--surface-hover)] rounded border border-[var(--border)] text-sm"
                            type="file"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt"
                            onChange={e => setNewDoc({ ...newDoc, file: e.target.files?.[0] ?? null })}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
                        <Button variant="primary" size="sm" onClick={handleAdd} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Upload Document'}
                        </Button>
                    </div>
                </GlassCard>
            )}

            {isLoading ? (
                <div className="space-y-2">
                    <div className="h-10 bg-[var(--surface-hover)] rounded animate-pulse" />
                    <div className="h-10 bg-[var(--surface-hover)] rounded animate-pulse" />
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-[var(--border)] rounded-lg">
                    <FileText className="w-8 h-8 text-[var(--foreground-muted)] mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-[var(--foreground-muted)]">No documents attached</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {documents.map(doc => (
                        <div key={doc._id} className="group flex items-center justify-between p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--primary-light)] transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded bg-[var(--primary-light)] text-[var(--primary)]">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate text-[var(--foreground)]" title={doc.name}>{doc.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                                        {doc.category && <span className="chip chip-xs">{doc.category}</span>}
                                        <span>{new Date(doc.createdAt).toLocaleDateString('en-US')}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 rounded-full hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--primary)] transition-colors">
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                                {!readonly && (
                                    <button onClick={() => handleDelete(doc._id)} className="p-2 rounded-full hover:bg-rose-50 text-[var(--foreground-muted)] hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
