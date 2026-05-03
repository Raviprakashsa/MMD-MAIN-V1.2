'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Layers,
  Plus,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Trash2,
  Loader2,
  RefreshCw,
  Globe,
  Webhook,
  Database,
  Download,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  deleteIntegrationConfigAction,
  listIntegrationConfigsAction,
  testIntegrationConnectionAction,
  upsertIntegrationConfigAction,
  toggleIntegrationConfigAction,
} from '@/lib/actions/module13-integrations'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'

interface IntegrationConfig {
  _id: string
  name: string
  provider: 'JOB_BOARD' | 'ATS' | 'WEBHOOK' | 'EXPORT'
  isActive: boolean
  health?: {
    status: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN' | 'INACTIVE'
    checkedAt?: string
    message?: string
    httpStatus?: number | null
  }
  config: Record<string, any>
  createdAt: string
  updatedAt: string
}

type IntegrationHealthStatus = 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN' | 'INACTIVE'

const providerIcons: Record<string, typeof Globe> = {
  JOB_BOARD: Globe,
  ATS: Database,
  WEBHOOK: Webhook,
  EXPORT: Download,
}

const providerLabels: Record<string, string> = {
  JOB_BOARD: 'Job Board',
  ATS: 'ATS',
  WEBHOOK: 'Webhook',
  EXPORT: 'Export',
}

const providerColors: Record<string, string> = {
  JOB_BOARD: 'from-blue-500 to-blue-600',
  ATS: 'from-violet-500 to-violet-600',
  WEBHOOK: 'from-amber-500 to-amber-600',
  EXPORT: 'from-emerald-500 to-emerald-600',
}

const healthLabels: Record<IntegrationHealthStatus, string> = {
  HEALTHY: 'Healthy',
  UNHEALTHY: 'Unhealthy',
  UNKNOWN: 'Unknown',
  INACTIVE: 'Inactive',
}

const healthBadgeClasses: Record<IntegrationHealthStatus, string> = {
  HEALTHY: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  UNHEALTHY: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400',
  UNKNOWN: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  INACTIVE: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
}

export default function IntegrationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const toast = useToast()

  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formProvider, setFormProvider] = useState<'JOB_BOARD' | 'ATS' | 'WEBHOOK' | 'EXPORT'>('WEBHOOK')
  const [formActive, setFormActive] = useState(true)
  const [formConfigJson, setFormConfigJson] = useState('{}')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)

  const isAdmin = session?.user && ['SUPER_ADMIN', 'ADMIN'].includes(session.user.role)

  useEffect(() => {
    if (session && !isAdmin) {
      router.push('/dashboard')
    }
  }, [session, isAdmin, router])

  const fetchIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listIntegrationConfigsAction(undefined)
      if (res.success && res.data) {
        setIntegrations(res.data as unknown as IntegrationConfig[])
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err)
      toast.error('Error', 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (isAdmin) fetchIntegrations()
  }, [isAdmin, fetchIntegrations])

  const openCreate = () => {
    setEditingId(null)
    setFormName('')
    setFormProvider('WEBHOOK')
    setFormActive(true)
    setFormConfigJson('{}')
    setIsModalOpen(true)
  }

  const openEdit = (config: IntegrationConfig) => {
    setEditingId(config._id)
    setFormName(config.name)
    setFormProvider(config.provider)
    setFormActive(config.isActive)
    setFormConfigJson(JSON.stringify(config.config, null, 2))
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Validation', 'Name is required')
      return
    }

    let parsedConfig: Record<string, any>
    try {
      parsedConfig = JSON.parse(formConfigJson)
    } catch {
      toast.error('Validation', 'Config must be valid JSON')
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        name: formName,
        provider: formProvider,
        isActive: formActive,
        config: parsedConfig,
      }
      if (editingId) payload.id = editingId

      const res = await upsertIntegrationConfigAction(payload)
      if (res.success) {
        toast.success(editingId ? 'Updated' : 'Created', formName)
        setIsModalOpen(false)
        fetchIntegrations()
      } else {
        toast.error('Error', res.error || 'Failed to save')
      }
    } catch {
      toast.error('Error', 'Failed to save integration')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (config: IntegrationConfig) => {
    try {
      const res = await toggleIntegrationConfigAction({ id: config._id, isActive: !config.isActive })
      if (res.success) {
        toast.success('Toggled', `${config.name} is now ${config.isActive ? 'disabled' : 'enabled'}`)
        fetchIntegrations()
      } else {
        toast.error('Error', res.error || 'Toggle failed')
      }
    } catch {
      toast.error('Error', 'Toggle failed')
    }
  }

  const handleDelete = async (config: IntegrationConfig) => {
    const confirmed = window.confirm(`Delete integration "${config.name}"? This cannot be undone.`)
    if (!confirmed) {
      return
    }

    setDeletingId(config._id)
    try {
      const res = await deleteIntegrationConfigAction({ id: config._id })
      if (res.success) {
        toast.success('Deleted', `${config.name} has been removed`)
        await fetchIntegrations()
      } else {
        toast.error('Error', res.error || 'Delete failed')
      }
    } catch {
      toast.error('Error', 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  const handleTestConnection = async (config: IntegrationConfig) => {
    setTestingId(config._id)
    try {
      const res = await testIntegrationConnectionAction({ id: config._id })
      if (res.success && res.data) {
        const health = (res.data as { health?: IntegrationConfig['health'] }).health
        const status = health?.status ? healthLabels[health.status] : 'Unknown'
        const message = health?.message || `${config.name} connection test completed`
        toast.success(`Connection ${status}`, message)
        await fetchIntegrations()
      } else {
        toast.error('Error', res.error || 'Connection test failed')
      }
    } catch {
      toast.error('Error', 'Connection test failed')
    } finally {
      setTestingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
            <Layers className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Integrations</h1>
            <p className="text-slate-500">Manage external connections, webhooks, and API configurations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchIntegrations}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            <Plus className="h-4 w-4" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Integrations Grid */}
      {integrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
            <Layers className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Integrations</h3>
          <p className="text-slate-500 text-sm max-w-md mb-4">
            Set up connections with job boards, ATS platforms, webhooks, and export configurations.
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Your First Integration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((config) => {
            const Icon = providerIcons[config.provider] || Globe
            return (
              <div
                key={config._id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg bg-gradient-to-br text-white', providerColors[config.provider])}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{config.name}</h3>
                      <p className="text-xs text-slate-500">{providerLabels[config.provider]}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(config)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    title={config.isActive ? 'Disable' : 'Enable'}
                  >
                    {config.isActive ? (
                      <ToggleRight className="h-6 w-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-slate-400" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {config.isActive ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                      <XCircle className="h-3 w-3" /> Inactive
                    </span>
                  )}
                  {config.health?.status && (
                    <span className={cn('text-xs px-2 py-1 rounded-full', healthBadgeClasses[config.health.status])}>
                      {healthLabels[config.health.status]}
                    </span>
                  )}
                </div>

                {config.health?.message && (
                  <p className="text-xs text-slate-500 mb-4 line-clamp-2">{config.health.message}</p>
                )}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleTestConnection(config)}
                    disabled={testingId === config._id}
                    className="p-2 text-slate-400 hover:text-emerald-600 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    title="Test connection"
                  >
                    <RefreshCw className={cn('h-4 w-4', testingId === config._id && 'animate-spin')} />
                  </button>
                  <button
                    onClick={() => openEdit(config)}
                    className="p-2 text-slate-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                    title="Edit integration"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(config)}
                    disabled={deletingId === config._id}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                    title="Delete integration"
                  >
                    {deletingId === config._id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Integration' : 'New Integration'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Integration name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Provider</label>
            <select
              value={formProvider}
              onChange={(e) => setFormProvider(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            >
              <option value="JOB_BOARD">Job Board</option>
              <option value="ATS">ATS</option>
              <option value="WEBHOOK">Webhook</option>
              <option value="EXPORT">Export</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Active</label>
            <button
              type="button"
              onClick={() => setFormActive(!formActive)}
              className="text-slate-400 hover:text-slate-600"
            >
              {formActive ? (
                <ToggleRight className="h-6 w-6 text-emerald-500" />
              ) : (
                <ToggleLeft className="h-6 w-6 text-slate-400" />
              )}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Configuration (JSON)</label>
            <textarea
              value={formConfigJson}
              onChange={(e) => setFormConfigJson(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="{}"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
