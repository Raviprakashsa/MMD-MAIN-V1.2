'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import { Modal } from '@/components/ui/Modal'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import type { Lead } from '@/types/leads'

interface LeadConvertDialogProps {
  readonly lead: Lead | null
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onConvert: (leadId: string, approvalNotes: string) => Promise<void>
}

export function LeadConvertDialog({
  lead,
  isOpen,
  onClose,
  onConvert,
}: LeadConvertDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    setIsSubmitting(true)
    try {
      await onConvert(lead._id, approvalNotes)
      onClose()
      setApprovalNotes('')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!lead) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Convert Lead to Company Master"
      description="This will create a new company record and mark this lead as converted"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Lead Information Summary */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <h4 className="font-semibold text-indigo-900 mb-3">Lead Information</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-indigo-600">Company:</span>
              <p className="font-medium text-indigo-900">{lead.companyName}</p>
            </div>
            <div>
              <span className="text-indigo-600">Sector:</span>
              <p className="font-medium text-indigo-900">{lead.sector}</p>
            </div>
            <div>
              <span className="text-indigo-600">Contact:</span>
              <p className="font-medium text-indigo-900">{lead.contactName || 'N/A'}</p>
            </div>
            <div>
              <span className="text-indigo-600">Confidence:</span>
              <p className="font-medium text-indigo-900">{lead.confidenceScore}%</p>
            </div>
          </div>
        </div>

        {/* Warning / Next Steps */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-900">Important: Next Steps</p>
              <ul className="list-disc list-inside text-amber-700 mt-2 space-y-1.5">
                <li>Company record will be created in Company Master (Module 3)</li>
                <li>MOU process must be initiated</li>
                <li>Cannot proceed to hiring without MOU status</li>
                <li>This action requires admin approval</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Validation Check */}
        {(!lead.contactEmail && !lead.contactPhone) && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-900">Missing Contact Information</p>
                <p className="text-red-700 mt-1">
                  Please add at least an email or phone number before converting this lead.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Approval Notes */}
        <div className="space-y-2">
          <label htmlFor="convert-notes" className="block text-sm font-semibold text-slate-700">Conversion Notes *</label>
          <textarea
            id="convert-notes"
            className="input-modern min-h-[100px]"
            placeholder="Why is this lead ready for conversion? Add any relevant details..."
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            required
            rows={3}
          />
        </div>

        {/* Actions */}
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
            icon={<CheckCircle2 className="w-4 h-4" />}
            iconPosition="left"
            disabled={isSubmitting || !approvalNotes || (!lead.contactEmail && !lead.contactPhone)}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Converting...' : 'Convert Lead'}
          </AnimatedButton>
        </div>
      </form>
    </Modal>
  )
}
