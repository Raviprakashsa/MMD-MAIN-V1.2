'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import type { Lead, ActivityType, LeadActivity } from '@/types/leads'
import { ACTIVITY_TYPES } from '@/types/leads'

interface LeadActivityDialogProps {
  readonly lead: Lead | null
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSubmit: (leadId: string, activity: Omit<LeadActivity, '_id' | 'createdBy' | 'createdByName'>) => Promise<void>
}

export function LeadActivityDialog({
  lead,
  isOpen,
  onClose,
  onSubmit,
}: LeadActivityDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    type: 'call' as ActivityType,
    summary: '',
    outcome: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    nextFollowUp: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    setIsSubmitting(true)
    try {
      await onSubmit(lead._id, {
        type: formData.type,
        summary: formData.summary,
        outcome: formData.outcome,
        date: formData.date,
        time: formData.time,
        nextFollowUp: formData.nextFollowUp || undefined,
      })
      onClose()
      setFormData({
        type: 'call',
        summary: '',
        outcome: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        nextFollowUp: '',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!lead) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Log Activity - ${lead.companyName}`}
      description="Record communication and set next follow-up"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="activity-type" className="block text-sm font-semibold text-slate-700">Activity Type *</label>
            <select
              id="activity-type"
              title="Activity Type"
              className="select-modern w-full"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ActivityType }))}
              required
            >
              {ACTIVITY_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="activity-date" className="block text-sm font-semibold text-slate-700">Date *</label>
            <input
              id="activity-date"
              type="date"
              title="Activity Date"
              className="input-modern"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2 col-span-2">
            <label htmlFor="activity-time" className="block text-sm font-semibold text-slate-700">Time *</label>
            <input
              id="activity-time"
              type="time"
              title="Activity Time"
              className="input-modern"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="activity-summary" className="block text-sm font-semibold text-slate-700">Summary *</label>
          <textarea
            id="activity-summary"
            className="input-modern min-h-[80px]"
            placeholder="Brief description of the activity..."
            value={formData.summary}
            onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
            required
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="activity-outcome" className="block text-sm font-semibold text-slate-700">Outcome *</label>
          <textarea
            id="activity-outcome"
            className="input-modern min-h-[80px]"
            placeholder="What was the result? What are next steps?"
            value={formData.outcome}
            onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
            required
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="activity-followup" className="block text-sm font-semibold text-slate-700">Next Follow-up Date</label>
          <input
            id="activity-followup"
            type="date"
            title="Next Follow-up Date"
            className="input-modern"
            value={formData.nextFollowUp}
            onChange={(e) => setFormData(prev => ({ ...prev, nextFollowUp: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <AnimatedButton
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton
            type="submit"
            variant="primary"
            disabled={isSubmitting || !formData.summary || !formData.outcome}
          >
            {isSubmitting ? 'Logging...' : 'Log Activity'}
          </AnimatedButton>
        </div>
      </form>
    </Modal>
  )
}
