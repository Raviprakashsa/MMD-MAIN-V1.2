'use client'

import { useEffect, useState, useTransition } from 'react'
import { Shield, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import { deleteUser, updateUserRole } from '@/lib/actions/module1-auth'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface User {
    _id: string
    name: string
    email: string
    role: 'SUPER_ADMIN' | 'ADMIN' | 'COORDINATOR' | 'RECRUITER' | 'SCRAPER'
    isActive: boolean
    createdAt: string
    lastLogin?: string
}

interface UserListProps {
    initialUsers: User[]
}

export default function UserList({ initialUsers }: Readonly<UserListProps>) {
    const [users, setUsers] = useState(initialUsers)
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showRoleModal, setShowRoleModal] = useState(false)
    const [isPending, startTransition] = useTransition()
    const { success, error } = useToast()
    const router = useRouter()

    useEffect(() => {
        setUsers(initialUsers)
    }, [initialUsers])

    const handleDelete = async () => {
        if (!selectedUser) return
        startTransition(async () => {
            const res = await deleteUser({ id: selectedUser._id })
            if (res.success) {
                setUsers(users.filter(u => u._id !== selectedUser._id))
                success('User deleted')
                router.refresh()
                setShowDeleteConfirm(false)
            } else {
                error('Failed to delete user', res.error)
            }
        })
    }

    const handleRoleUpdate = async (newRole: string) => {
        if (!selectedUser) return
        startTransition(async () => {
            const res = await updateUserRole({
                userId: selectedUser._id,
                role: newRole as any
            })
            if (res.success) {
                setUsers(users.map(u => u._id === selectedUser._id ? { ...u, role: newRole as any } : u))
                success('Role updated')
                router.refresh()
                setShowRoleModal(false)
            } else {
                error('Failed to update role', res.error)
            }
        })
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Last Login</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-semibold">{user.name}</div>
                                            <div className="text-xs text-slate-500 font-normal">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                    ${(['SUPER_ADMIN', 'ADMIN'].includes(user.role)) ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'COORDINATOR' ? 'bg-blue-100 text-blue-800' :
                                                user.role === 'SCRAPER' ? 'bg-amber-100 text-amber-800' :
                                                    'bg-slate-100 text-slate-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {user.isActive ? (
                                        <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                                            <XCircle className="h-3.5 w-3.5" /> Inactive
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-500 text-xs">
                                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US') : 'Never'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => { setSelectedUser(user); setShowRoleModal(true) }}
                                            className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Edit Role"
                                        >
                                            <Shield className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true) }}
                                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Delete User"
                message={`Are you sure you want to delete ${selectedUser?.name}? This action cannot be undone.`}
                confirmText="Delete User"
                variant="danger"
                isLoading={isPending}
            />

            <Modal
                isOpen={showRoleModal}
                onClose={() => setShowRoleModal(false)}
                title="Update User Role"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Select a new role for <strong>{selectedUser?.name}</strong>:</p>
                    <div className="grid grid-cols-1 gap-2">
                        {['SUPER_ADMIN', 'ADMIN', 'COORDINATOR', 'RECRUITER', 'SCRAPER'].map((role) => (
                            <button
                                key={role}
                                onClick={() => handleRoleUpdate(role)}
                                disabled={isPending}
                                className={`p-3 text-left rounded-lg text-sm font-medium border transition-all
                                ${selectedUser?.role === role
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
                                    }
                            `}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
        </div>
    )
}
