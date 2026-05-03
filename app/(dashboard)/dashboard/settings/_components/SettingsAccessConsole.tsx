"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  Plus,
  Search,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react"

import {
  createUserAction,
  resetPassword as resetPasswordAction,
  updateUserRoleAction,
} from "@/lib/actions/module1-auth"
import type { UserRole } from "@/lib/db/models/User"
import { Modal } from "@/components/ui/Modal"
import { useToast } from "@/components/ui/Toast"

export interface SettingsUser {
  _id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  lastLogin?: string
}

interface SettingsAccessConsoleProps {
  currentUserId: string
  initialUsers: SettingsUser[]
}

const roleOptions: Array<{
  value: UserRole
  label: string
  tone: string
  summary: string
  access: string[]
}> = [
  {
    value: "SUPER_ADMIN",
    label: "Super Admin",
    tone: "bg-violet-50 text-violet-700 border-violet-200",
    summary: "Owns platform settings, users, passwords, and access.",
    access: ["Settings", "Users", "All dashboards", "API keys"],
  },
  {
    value: "ADMIN",
    label: "Admin",
    tone: "bg-indigo-50 text-indigo-700 border-indigo-200",
    summary: "Runs operational admin workflows without identity control.",
    access: ["Companies", "Requirements", "Reports", "Invoices"],
  },
  {
    value: "COORDINATOR",
    label: "Coordinator",
    tone: "bg-cyan-50 text-cyan-700 border-cyan-200",
    summary: "Manages client and requirement coordination.",
    access: ["Companies", "Requirements", "Candidates", "Reports"],
  },
  {
    value: "RECRUITER",
    label: "Recruiter",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    summary: "Works candidates, activities, and placement workflows.",
    access: ["Requirements", "Candidates", "Activities", "Placements"],
  },
  {
    value: "SCRAPER",
    label: "Scraper",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    summary: "Handles lead sourcing and intake queue work.",
    access: ["Dashboard", "Pipeline", "Leads", "Timesheet"],
  },
]

const emptyCreateForm = {
  name: "",
  email: "",
  password: "",
  role: "RECRUITER" as UserRole,
}

function roleMeta(role: UserRole) {
  return roleOptions.find((item) => item.value === role) || roleOptions[3]
}

function formatDate(value?: string) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Never"
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U"
}

function isStrongPassword(value: string) {
  return value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[!@#$%^&*(),.?":{}|<>_-]/.test(value)
}

export default function SettingsAccessConsole({
  currentUserId,
  initialUsers,
}: Readonly<SettingsAccessConsoleProps>) {
  const router = useRouter()
  const toast = useToast()
  const [users, setUsers] = useState(initialUsers)
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"ALL" | UserRole>("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [createOpen, setCreateOpen] = useState(false)
  const [accessOpen, setAccessOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SettingsUser | null>(null)
  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [accessRole, setAccessRole] = useState<UserRole>("RECRUITER")
  const [accessActive, setAccessActive] = useState(true)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase()
    return users.filter((user) => {
      const matchesSearch = !term ||
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter
      const matchesStatus = statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? user.isActive : !user.isActive)
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [query, roleFilter, statusFilter, users])

  const openAccess = (user: SettingsUser) => {
    setSelectedUser(user)
    setAccessRole(user.role)
    setAccessActive(user.isActive)
    setAccessOpen(true)
  }

  const openPassword = (user: SettingsUser) => {
    setSelectedUser(user)
    setNewPassword("")
    setConfirmPassword("")
    setPasswordOpen(true)
  }

  const closeCreate = () => {
    setCreateOpen(false)
    setCreateForm(emptyCreateForm)
  }

  const submitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isStrongPassword(createForm.password)) {
      toast.error("Password is not strong enough", "Use uppercase, lowercase, number, and special character.")
      return
    }

    setBusy("create")
    const result = await createUserAction(createForm)
    setBusy(null)

    if (!result.success || !result.data) {
      toast.error("Could not create user", result.error)
      return
    }

    const created = result.data as any
    setUsers((current) => [{
      _id: created._id || created.id,
      name: created.name,
      email: created.email,
      role: created.role,
      isActive: created.isActive,
      createdAt: created.createdAt,
    }, ...current])
    closeCreate()
    toast.success("User created", `${createForm.name} can now sign in.`)
    router.refresh()
  }

  const submitAccess = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedUser) return

    setBusy("access")
    const result = await updateUserRoleAction({
      userId: selectedUser._id,
      role: accessRole,
      isActive: accessActive,
    })
    setBusy(null)

    if (!result.success) {
      toast.error("Could not update access", result.error)
      return
    }

    setUsers((current) => current.map((user) => user._id === selectedUser._id
      ? { ...user, role: accessRole, isActive: accessActive }
      : user))
    setAccessOpen(false)
    toast.success("Access updated", selectedUser.name)
    router.refresh()
  }

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedUser) return
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (!isStrongPassword(newPassword)) {
      toast.error("Password is not strong enough", "Use uppercase, lowercase, number, and special character.")
      return
    }

    setBusy("password")
    const result = await resetPasswordAction({
      userId: selectedUser._id,
      newPassword,
    })
    setBusy(null)

    if (!result.success) {
      toast.error("Could not reset password", result.error)
      return
    }

    setPasswordOpen(false)
    setNewPassword("")
    setConfirmPassword("")
    toast.success("Password reset", selectedUser.name)
    router.refresh()
  }

  const toggleActive = async (user: SettingsUser) => {
    setBusy(`status-${user._id}`)
    const result = await updateUserRoleAction({
      userId: user._id,
      isActive: !user.isActive,
    })
    setBusy(null)

    if (!result.success) {
      toast.error("Could not update status", result.error)
      return
    }

    setUsers((current) => current.map((item) => item._id === user._id
      ? { ...item, isActive: !item.isActive }
      : item))
    toast.success(user.isActive ? "Account deactivated" : "Account activated", user.name)
    router.refresh()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">User Directory</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredUsers.length} accounts shown</p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <UserPlus className="h-4 w-4" />
            New User
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 p-5 lg:grid-cols-[minmax(0,1fr)_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search users"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "ALL" | UserRole)}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            aria-label="Filter by role"
          >
            <option value="ALL">All roles</option>
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            aria-label="Filter by status"
          >
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">User</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Created</th>
                <th className="px-5 py-3 font-semibold">Last Login</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const meta = roleMeta(user.role)
                return (
                  <tr key={user._id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700">
                          {initials(user.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${meta.tone}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500">
                          <XCircle className="h-4 w-4" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(user.lastLogin)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openAccess(user)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          title="Edit access"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPassword(user)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                          title="Reset password"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(user)}
                          disabled={busy === `status-${user._id}` || user._id === currentUserId}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                          title={user.isActive ? "Deactivate user" : "Activate user"}
                        >
                          {user.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Password Policy</h2>
              <p className="text-sm text-slate-500">Applies to create and reset flows</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Minimum 8 characters
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Uppercase and lowercase letters
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Number and special character
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Access Matrix</h2>
          <div className="mt-4 space-y-4">
            {roleOptions.map((role) => (
              <div key={role.value} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${role.tone}`}>
                    {role.label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{role.summary}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {role.access.map((item) => (
                    <span key={item} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <Modal isOpen={createOpen} onClose={closeCreate} title="Create User" size="lg">
        <form onSubmit={submitCreate} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Full Name</span>
            <input
              value={createForm.name}
              onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Email</span>
            <input
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm((form) => ({ ...form, email: event.target.value }))}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Temporary Password</span>
            <input
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm((form) => ({ ...form, password: event.target.value }))}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
              required
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Role</span>
            <select
              value={createForm.role}
              onChange={(event) => setCreateForm((form) => ({ ...form, role: event.target.value as UserRole }))}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={closeCreate} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={busy === "create"} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              <Plus className="h-4 w-4" />
              {busy === "create" ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={accessOpen} onClose={() => setAccessOpen(false)} title="Edit Access" size="md">
        <form onSubmit={submitAccess} className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-950">{selectedUser?.name}</p>
            <p className="text-sm text-slate-500">{selectedUser?.email}</p>
          </div>
          <label className="space-y-1.5 block">
            <span className="text-sm font-semibold text-slate-700">Role</span>
            <select
              value={accessRole}
              onChange={(event) => setAccessRole(event.target.value as UserRole)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <span>
              <span className="block text-sm font-semibold text-slate-800">Account Active</span>
              <span className="block text-sm text-slate-500">Inactive users cannot sign in.</span>
            </span>
            <input
              type="checkbox"
              checked={accessActive}
              disabled={selectedUser?._id === currentUserId}
              onChange={(event) => setAccessActive(event.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600"
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setAccessOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={busy === "access"} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {busy === "access" ? "Saving..." : "Save Access"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} title="Reset Password" size="md">
        <form onSubmit={submitPassword} className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-950">{selectedUser?.name}</p>
            <p className="text-sm text-slate-500">{selectedUser?.email}</p>
          </div>
          <label className="space-y-1.5 block">
            <span className="text-sm font-semibold text-slate-700">New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
              required
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-semibold text-slate-700">Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-50"
              required
            />
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPasswordOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={busy === "password"} className="rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {busy === "password" ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
