import { redirect } from "next/navigation"
import {
  Activity,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
} from "lucide-react"

import { getUsers } from "@/lib/actions/module1-auth"
import { auth } from "@/lib/auth"
import SettingsAccessConsole, { type SettingsUser } from "./_components/SettingsAccessConsole"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard")
  }

  const usersResult = await getUsers({})
  const users = ((usersResult.data || []) as any[]).map((user): SettingsUser => ({
    _id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
  }))

  const activeUsers = users.filter((user) => user.isActive).length
  const superAdmins = users.filter((user) => user.role === "SUPER_ADMIN" && user.isActive).length
  const inactiveUsers = users.length - activeUsers

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-indigo-100 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-700 shadow-sm">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Super Admin Console
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Settings</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage user profiles, account status, password resets, and role-based access for the staffing platform.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Users</p>
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">{users.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Active Users</p>
            <Activity className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">{activeUsers}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Super Admins</p>
            <ShieldCheck className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">{superAdmins}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Inactive Accounts</p>
            <KeyRound className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-3xl font-bold text-slate-950">{inactiveUsers}</p>
        </div>
      </section>

      <section className="rounded-lg border border-indigo-100 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">Identity and Access Management</h2>
            <p className="mt-1 text-sm text-slate-600">
              Changes made here affect sign-in access immediately and are recorded through the existing audit log service.
            </p>
          </div>
        </div>
      </section>

      <SettingsAccessConsole currentUserId={session.user.id} initialUsers={users} />
    </div>
  )
}
