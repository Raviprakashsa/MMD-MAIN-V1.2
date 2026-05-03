"use client"

import { useState, type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { createUserAction, updateUserRoleAction } from "@/lib/actions/module1-auth"
import { UserRole } from "@/lib/db/models/User"

interface UserFormProps {
  onCreated?: () => void
  triggerLabel?: string
  triggerClassName?: string
  triggerIcon?: ReactNode
}

const roles: UserRole[] = ["SUPER_ADMIN", "ADMIN", "COORDINATOR", "RECRUITER", "SCRAPER"]

export function UserManagementModal({
  onCreated,
  triggerLabel = 'Create User',
  triggerClassName,
  triggerIcon,
}: Readonly<UserFormProps>) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<UserRole>("RECRUITER")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const isAdmin = session?.user && ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await createUserAction({ email, name, password, role })
    setLoading(false)
    if (!result.success) {
      setError(result.error ?? "Failed to create user")
      return
    }
    setOpen(false)
    setEmail("")
    setName("")
    setPassword("")
    setRole("RECRUITER")
    router.refresh()
    onCreated?.()
  }

  const defaultTriggerClassName = 'rounded-md bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!isAdmin}
        className={triggerClassName || defaultTriggerClassName}
        title={isAdmin ? "Create user" : "Admin only"}
      >
        <span className="inline-flex items-center gap-2">
          {triggerIcon}
          {triggerLabel}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg bg-card p-6 shadow-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Create User</h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="user-email">Email</label>
                <input
                  id="user-email"
                  type="email"
                  className="w-full rounded-md border border-border bg-input px-3 py-2"
                  placeholder="admin@magnuscopo.com"
                  title="User email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="user-name">Name</label>
                <input
                  id="user-name"
                  type="text"
                  className="w-full rounded-md border border-border bg-input px-3 py-2"
                  placeholder="Full name"
                  title="User full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="user-password">Password</label>
                <input
                  id="user-password"
                  type="password"
                  className="w-full rounded-md border border-border bg-input px-3 py-2"
                  placeholder="Strong password"
                  title="User password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Min 8 chars, upper, number, special char.</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="user-role">Role</label>
                <select
                  id="user-role"
                  className="w-full rounded-md border border-border bg-input px-3 py-2"
                  title="User role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md px-3 py-2 border border-border"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-primary px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

interface RoleToggleProps {
  userId: string
  currentRole: UserRole
  isActive: boolean
  onUpdated?: () => void
}

export function UserRoleToggle({ userId, currentRole, isActive, onUpdated }: Readonly<RoleToggleProps>) {
  const [role, setRole] = useState<UserRole>(currentRole)
  const [active, setActive] = useState<boolean>(isActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const save = async () => {
    setSaving(true)
    setError("")
    const result = await updateUserRoleAction({ userId, role, isActive: active })
    setSaving(false)
    if (!result.success) {
      setError(result.error ?? "Update failed")
      return
    }
    onUpdated?.()
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-4 bg-card">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Role</p>
          <select
            className="rounded-md border border-border bg-input px-3 py-2"
            title="User role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-sm text-muted-foreground">Active</p>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              title="Active status"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            <span>Active</span>
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-primary px-3 py-2 text-white hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
