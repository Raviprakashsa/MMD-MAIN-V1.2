import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getUsers } from "@/lib/actions/module1-auth"
import UserList from "./_components/UserList"
import { UserManagementModal } from "@/components/forms/user-management"
import { Users, UserPlus } from "lucide-react"

export default async function UsersPage() {
    const session = await auth()

    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
        redirect("/dashboard")
    }

    const usersRes = await getUsers({})
    const users = usersRes?.data || []

    // Transform for display if needed, though action returns what we need
    const formattedUsers = users.map((u: any) => ({
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
                        <Users className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">User Management</h1>
                        <p className="text-slate-500">Manage team access and roles</p>
                    </div>
                </div>
                <UserManagementModal
                    triggerLabel="Invite User"
                    triggerIcon={<UserPlus className="h-4 w-4" />}
                    triggerClassName="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
                />
            </div>

            <UserList initialUsers={formattedUsers} />
        </div>
    )
}
