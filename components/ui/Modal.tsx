'use client'

import { Fragment, ReactNode, useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose()
      }
    },
    [closeOnEsc, onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen || !mounted) return null

  return createPortal(
    <Fragment>
      {/* Premium Backdrop with blur */}
      <div
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_20px_40px_-20px_rgba(0,0,0,0.2),0_40px_80px_-40px_rgba(0,0,0,0.15)] animate-in zoom-in-95 fade-in duration-250',
            sizeClasses[size]
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
        >
          {/* Premium Header with gradient accent */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between p-6 border-b border-[var(--border)] relative overflow-hidden">
              {/* Subtle gradient accent at top */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6366F1] to-transparent opacity-30" />
              <div>
                {title && (
                  <h2 id="modal-title" className="text-xl font-bold text-[var(--foreground)] tracking-tight">
                    {title}
                  </h2>
                )}
                {description && (
                  <p id="modal-description" className="mt-1.5 text-sm text-[var(--foreground-muted)]">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-2 -mr-2 -mt-2 rounded-xl hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all hover:scale-105 active:scale-95"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Body with scroll to avoid covering full viewport */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">{children}</div>
        </div>
      </div>
    </Fragment>,
    document.body
  )
}

// Confirmation Dialog
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'default'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const buttonVariants = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    default: 'btn-gradient',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">{title}</h3>
        <p className="text-[var(--foreground-muted)] mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-lg border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              'px-4 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50',
              buttonVariants[variant]
            )}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="spinner-indigo !w-4 !h-4 !border-white !border-t-transparent" />
                Processing...
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Side Panel / Drawer
interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  position?: 'left' | 'right'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const drawerSizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  size = 'md',
}: DrawerProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <Fragment>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] glass-command-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 bottom-0 z-[100] w-full bg-white flex flex-col',
          drawerSizes[size],
          position === 'right' ? 'right-0 glass-side-panel' : 'left-0 glass-side-panel-right',
          position === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          {title && <h2 className="text-xl font-semibold text-[var(--foreground)]">{title}</h2>}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </Fragment>
  )
}

export default Modal
