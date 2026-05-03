'use client'

import {
  Building2,
  Calendar,
  Edit,
  ExternalLink,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  Users,
  ArrowUpRight,
  AlertTriangle,
} from 'lucide-react'

import { Modal } from '@/components/ui/Modal'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { cn } from '@/lib/utils'
import type { Lead, ActivityType } from '@/types/leads'
import { STATUS_CONFIG } from '@/types/leads'

interface LeadDetailsDialogProps {
  readonly lead: Lead | null
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onEdit: (lead: Lead) => void
  readonly onConvert: (lead: Lead) => void
  readonly onLogActivity: (lead: Lead) => void
  readonly canConvert: boolean
}

export function LeadDetailsDialog({
  lead,
  isOpen,
  onClose,
  onEdit,
  onConvert,
  onLogActivity,
  canConvert,
}: LeadDetailsDialogProps) {
  if (!lead) return null

  const statusConfig = STATUS_CONFIG[lead.status]

  const getActivityIcon = (type: ActivityType) => {
    const icons = {
      call: <PhoneCall className="w-4 h-4" />,
      whatsapp: <MessageSquare className="w-4 h-4" />,
      email: <Mail className="w-4 h-4" />,
      meeting: <Users className="w-4 h-4" />,
      note: <FileText className="w-4 h-4" />,
    }
    return icons[type]
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{lead.companyName}</h2>
            <p className="text-sm text-slate-500 mt-1">
              Lead ID: {lead._id.slice(-8).toUpperCase()} • Created {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-US') : 'N/A'}
              {lead.createdByName && ` by ${lead.createdByName}`}
            </p>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-slate-100 border border-slate-200',
            statusConfig.color
          )}>
            <span className={cn('w-2 h-2 rounded-full', statusConfig.bgColor)} />
            {statusConfig.label}
          </span>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Confidence</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{lead.confidenceScore}%</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Days in Pipeline</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{lead.daysSinceCreated || 0}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Activities</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{lead.activities?.length || 0}</p>
          </div>
        </div>

        {/* Company & Contact Info */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Company Details
            </h4>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Sector:</span>
                <p className="font-medium text-slate-900">{lead.sector}</p>
              </div>
              <div>
                <span className="text-slate-500">Source:</span>
                <p className="font-medium text-slate-900">{lead.sourcePlatform}</p>
              </div>
              <div>
                <span className="text-slate-500">Assigned To:</span>
                <p className="font-medium text-slate-900">{lead.assignedToName || lead.assignedTo || 'Unassigned'}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Contact Information
            </h4>
            <div className="space-y-3">
              {lead.contactName && (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-900">{lead.contactName}</span>
                </div>
              )}
              {lead.contactPhone && (
                <a
                  href={`tel:${lead.contactPhone}`}
                  className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <Phone className="w-4 h-4 text-slate-400" />
                  {lead.contactPhone}
                </a>
              )}
              {lead.contactEmail && (
                <a
                  href={`mailto:${lead.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 transition-colors"
                >
                  <Mail className="w-4 h-4 text-slate-400" />
                  {lead.contactEmail}
                </a>
              )}
              {lead.contactLinkedIn && (
                <a
                  href={lead.contactLinkedIn.startsWith('http') ? lead.contactLinkedIn : `https://${lead.contactLinkedIn}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {lead.sourcePlatform ? `${lead.sourcePlatform} Profile` : 'Profile Link'}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Follow-up Alert */}
        {lead.followUpDate && (
          <div className={cn(
            'p-4 rounded-xl border',
            lead.isOverdue
              ? 'bg-orange-50 border-orange-200'
              : 'bg-blue-50 border-blue-200'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className={cn('w-5 h-5', lead.isOverdue ? 'text-orange-600' : 'text-blue-600')} />
                <div>
                  <p className={cn('font-medium', lead.isOverdue ? 'text-orange-900' : 'text-blue-900')}>
                    {lead.isOverdue ? 'Follow-up Overdue' : 'Next Follow-up'}
                  </p>
                  <p className={cn('text-sm', lead.isOverdue ? 'text-orange-700' : 'text-blue-700')}>
                    {lead.followUpDate}
                  </p>
                </div>
              </div>
              {lead.isOverdue && <AlertTriangle className="w-5 h-5 text-orange-600" />}
            </div>
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-2">Notes</h4>
            <p className="text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200 whitespace-pre-line">
              {lead.notes}
            </p>
          </div>
        )}

        {/* Activity Timeline */}
        <div className="border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Activity Timeline ({lead.activities?.length || 0})
            </h4>
            <AnimatedButton
              variant="secondary"
              icon={<Plus className="w-4 h-4" />}
              iconPosition="left"
              onClick={() => onLogActivity(lead)}
              className="h-9 px-4"
            >
              Log Activity
            </AnimatedButton>
          </div>

          {(!lead.activities || lead.activities.length === 0) ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No activities logged yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {lead.activities.map((activity) => (
                <div key={activity._id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-slate-900 capitalize">{activity.type}</p>
                          <p className="text-sm text-slate-600 mt-0.5">{activity.summary}</p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                          {activity.date} {activity.time}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-slate-500">Outcome:</span>
                        <span className="ml-1.5 text-slate-900">{activity.outcome}</span>
                      </div>
                      {activity.nextFollowUp && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-indigo-600">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Next follow-up: {activity.nextFollowUp}</span>
                        </div>
                      )}
                      {activity.createdByName && (
                        <p className="text-xs text-slate-400 mt-2">By {activity.createdByName}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6">
          <AnimatedButton variant="secondary" onClick={onClose}>
            Close
          </AnimatedButton>
          <AnimatedButton
            variant="secondary"
            icon={<Edit className="w-4 h-4" />}
            iconPosition="left"
            onClick={() => {
              onClose()
              onEdit(lead)
            }}
          >
            Edit Lead
          </AnimatedButton>
          {lead.status !== 'CONVERTED' && canConvert && (
            <AnimatedButton
              variant="primary"
              icon={<ArrowUpRight className="w-4 h-4" />}
              iconPosition="left"
              onClick={() => {
                onClose()
                onConvert(lead)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Convert to Company
            </AnimatedButton>
          )}
        </div>
      </div>
    </Modal>
  )
}
