'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
    Mail,
    Search,
    CheckCircle2,
    Clock,
    User,
    AlertCircle,
    Trash2,
    RefreshCw
} from 'lucide-react'
import { PageContainer } from '@/components/ui/PageContainer'
import Button from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { getAdminInbox, getUserRequests, sendAdminRequest, markAsRead, deleteMessage } from '@/lib/actions/module15-mail'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea, Select } from '@/components/ui/Input'

interface IMessage {
    _id: string
    senderName: string
    senderRole: string
    subject: string
    body: string
    type: string
    status: string
    createdAt: string
}

export default function MailPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const toast = useToast()

    const [messages, setMessages] = useState<IMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedMessage, setSelectedMessage] = useState<IMessage | null>(null)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [formState, setFormState] = useState<{ subject: string; body: string; type: 'REQUEST' | 'MESSAGE' }>({ subject: '', body: '', type: 'REQUEST' })

    const role = session?.user?.role || 'RECRUITER'
    const isAdmin = (['SUPER_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(role as any)) || role === 'SUPER_ADMIN'
    const isSuperAdmin = role === 'SUPER_ADMIN'

    useEffect(() => {
        fetchMessages()
    }, [isAdmin])

    const fetchMessages = async () => {
        setLoading(true)
        const res = isAdmin ? await getAdminInbox() : await getUserRequests()
        if (res.success && res.data) {
            setMessages(res.data)
        } else {
            toast.error("Error", "Failed to load messages")
        }
        setLoading(false)
    }

    const handleCreate = async () => {
        if (!formState.subject || !formState.body) {
            toast.error("Missing Info", "Subject and message are required")
            return
        }

        const res = await sendAdminRequest(formState)
        if (res.success && res.data) {
            setMessages(prev => [res.data, ...prev])
            setIsCreateOpen(false)
            setFormState({ subject: '', body: '', type: 'REQUEST' })
            toast.success("Sent", "Request sent successfully")
        } else {
            toast.error("Error", res.error || "Failed to send")
        }
    }

    const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        const res = await markAsRead(id)
        if (res.success) {
            setMessages(prev => prev.map(m => m._id === id ? { ...m, status: 'READ' } : m))
            if (selectedMessage?._id === id) {
                setSelectedMessage(prev => prev ? { ...prev, status: 'READ' } : null)
            }
            toast.success("Updated", "Marked as read")
        }
    }

    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        if (!isSuperAdmin) {
            toast.error("Permission Denied", "Only Super Admin can delete messages")
            return
        }

        if (!confirm("Are you sure you want to delete this message?")) return

        const res = await deleteMessage(id)
        if (res.success) {
            setMessages(prev => prev.filter(m => m._id !== id))
            if (selectedMessage?._id === id) setSelectedMessage(null)
            toast.success("Deleted", "Message removed")
        } else {
            toast.error("Error", "Failed to delete message")
        }
    }

    const filteredMessages = messages.filter(m =>
        m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.senderName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <PageContainer
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Mail className="w-6 h-6 text-violet-600" />
                            {isAdmin ? "Inbox" : "My Requests"}
                        </h1>
                        <p className="text-slate-500">{isAdmin ? "Manage member requests" : "Track your requests to admins"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isAdmin && (
                            <Button onClick={() => setIsCreateOpen(true)} leftIcon={<Mail className="w-4 h-4" />}>
                                New Request
                            </Button>
                        )}
                        <Button variant="ghost" onClick={fetchMessages} leftIcon={<RefreshCw className="w-4 h-4" />}>
                            Refresh
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Search and List */}
                <div className="lg:col-span-1 flex flex-col gap-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                        <SearchInput
                            placeholder="Search requests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="p-4 text-center text-slate-500">Loading messages...</div>
                        ) : filteredMessages.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                                <Mail className="w-8 h-8 text-slate-300 mb-2" />
                                <p>No messages found</p>
                            </div>
                        ) : (
                            filteredMessages.map(msg => (
                                <div
                                    key={msg._id}
                                    onClick={() => setSelectedMessage(msg)}
                                    className={cn(
                                        "p-3 rounded-lg cursor-pointer transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700",
                                        selectedMessage?._id === msg._id ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                                        msg.status === 'UNREAD' ? "bg-white dark:bg-slate-900 font-medium" : "bg-slate-50/50 dark:bg-slate-800/30 text-slate-600"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            {msg.status === 'UNREAD' && <div className="w-2 h-2 rounded-full bg-violet-600" />}
                                            <span className="font-semibold text-sm truncate">{msg.senderName}</span>
                                        </div>
                                        <span className="text-xs text-slate-400 whitespace-nowrap">
                                            {new Date(msg.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className={cn("text-sm truncate mb-1", msg.status === 'UNREAD' ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                                        {msg.subject}
                                    </h4>
                                    <p className="text-xs text-slate-400 truncate">{msg.body}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Detail View */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
                    {selectedMessage ? (
                        <>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{selectedMessage.subject}</h2>
                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-4 h-4" />
                                            <span className="text-slate-900 dark:text-slate-200 font-medium">{selectedMessage.senderName}</span>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                                {selectedMessage.senderRole}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" />
                                            <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedMessage.status === 'UNREAD' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleMarkAsRead(selectedMessage._id)}
                                            leftIcon={<CheckCircle2 className="w-4 h-4" />}
                                        >
                                            Mark as Read
                                        </Button>
                                    )}
                                    {isSuperAdmin && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-white hover:bg-rose-50 hover:text-rose-600"
                                            onClick={() => handleDelete(selectedMessage._id)}
                                        >
                                            <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 p-6 overflow-y-auto whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                                {selectedMessage.body}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 text-slate-600">
                            <Mail className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a message to view details</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="New Request"
            >
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Subject</label>
                        <Input
                            value={formState.subject}
                            onChange={(e) => setFormState(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder="Brief subject..."
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Message Type</label>
                        <Select
                            value={formState.type}
                            onChange={(e) => setFormState(prev => ({ ...prev, type: e.target.value as 'REQUEST' | 'MESSAGE' }))}
                            options={[
                                { label: 'Request', value: 'REQUEST' },
                                { label: 'Message', value: 'MESSAGE' }
                            ]}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Details</label>
                        <Textarea
                            value={formState.body}
                            onChange={(e) => setFormState(prev => ({ ...prev, body: e.target.value }))}
                            placeholder="Describe your request..."
                            rows={4}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate}>Send Request</Button>
                    </div>
                </div>
            </Modal>
        </PageContainer>
    )
}
