'use client'

import { createContext, useContext, useCallback, useState, useEffect, ReactNode, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { X, Undo2, CheckCircle2, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toastSlideUp } from '@/lib/animations'

/**
 * UndoToast - High-Trust UI Pattern
 * ==================================
 * Neuropsychology Principle: "Make actions reversible"
 * 
 * Features:
 * - Undo button for destructive actions
 * - Progress bar showing time remaining
 * - Optimistic UI support with rollback
 * - Auto-dismiss with configurable duration
 */
type ToastType = 'undo' | 'success' | 'warning' | 'info'

interface UndoToastData {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number // ms, default 5000
  onUndo?: () => void | Promise<void>
  onDismiss?: () => void
  undoLabel?: string
}

interface UndoToastContextType {
  showUndoToast: (toast: Omit<UndoToastData, 'id'>) => string
  showSuccess: (title: string, message?: string) => void
  showWarning: (title: string, message?: string) => void
  showInfo: (title: string, message?: string) => void
  dismissToast: (id: string) => void
  dismissAll: () => void
}

const UndoToastContext = createContext<UndoToastContextType | undefined>(undefined)

export function useUndoToast() {
  const context = useContext(UndoToastContext)
  if (!context) {
    throw new Error('useUndoToast must be used within an UndoToastProvider')
  }
  return context
}

// Toast icon based on type
function ToastIcon({ type }: Readonly<{ type: ToastType }>) {
  const iconClass = 'w-5 h-5'
  
  switch (type) {
    case 'undo':
      return <Undo2 className={cn(iconClass, 'text-brand-400')} />
    case 'success':
      return <CheckCircle2 className={cn(iconClass, 'text-emerald-400')} />
    case 'warning':
      return <AlertTriangle className={cn(iconClass, 'text-amber-400')} />
    case 'info':
      return <Info className={cn(iconClass, 'text-cyan-400')} />
  }
}

// Individual Toast Component
function UndoToastItem({ 
  toast, 
  onDismiss,
  onUndo 
}: Readonly<{ 
  toast: UndoToastData
  onDismiss: () => void
  onUndo?: () => void
}>) {
  const prefersReducedMotion = useReducedMotion()
  const [isUndoing, setIsUndoing] = useState(false)
  const [progress, setProgress] = useState(100)
  
  const toastDuration = toast.duration || 5000

  // Progress countdown
  useEffect(() => {
    if (toast.type !== 'undo' || prefersReducedMotion) return
    
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / toastDuration) * 100)
      setProgress(remaining)
      
      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 50)
    
    return () => clearInterval(interval)
  }, [toastDuration, toast.type, prefersReducedMotion])

  // Auto-dismiss
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss()
      toast.onDismiss?.()
    }, toastDuration)
    
    return () => clearTimeout(timer)
  }, [toastDuration, onDismiss, toast])

  const handleUndo = async () => {
    if (isUndoing || !toast.onUndo) return
    
    setIsUndoing(true)
    try {
      await toast.onUndo()
      onDismiss()
    } catch (error) {
      console.error('Undo failed:', error)
      setIsUndoing(false)
    }
  }

  return (
    <motion.div
      layout
      variants={toastSlideUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={cn(
        'relative flex items-center gap-3 px-4 py-3 rounded-xl overflow-hidden',
        'bg-slate-900/95 text-white shadow-2xl backdrop-blur-xl',
        'min-w-[320px] max-w-[420px]'
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <ToastIcon type={toast.type} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-white">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">{toast.message}</p>
        )}
      </div>

      {/* Undo Button */}
      {toast.type === 'undo' && toast.onUndo && (
        <motion.button
          onClick={handleUndo}
          disabled={isUndoing}
          className={cn(
            'px-3 py-1.5 text-sm font-semibold rounded-lg',
            'bg-white/15 text-white hover:bg-white/25 transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
          whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
        >
          {isUndoing ? 'Undoing...' : toast.undoLabel || 'Undo'}
        </motion.button>
      )}

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar (only for undo toasts) */}
      {toast.type === 'undo' && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-brand-500 rounded-b-xl"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: 'linear' }}
        />
      )}
    </motion.div>
  )
}

// Toast Provider Component
export function UndoToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [toasts, setToasts] = useState<UndoToastData[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  const showUndoToast = useCallback((toast: Omit<UndoToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newToast: UndoToastData = { ...toast, id }
    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const showSuccess = useCallback((title: string, message?: string) => {
    showUndoToast({ type: 'success', title, message, duration: 3000 })
  }, [showUndoToast])

  const showWarning = useCallback((title: string, message?: string) => {
    showUndoToast({ type: 'warning', title, message, duration: 4000 })
  }, [showUndoToast])

  const showInfo = useCallback((title: string, message?: string) => {
    showUndoToast({ type: 'info', title, message, duration: 3000 })
  }, [showUndoToast])

  const contextValue = useMemo(() => ({
    showUndoToast,
    showSuccess,
    showWarning,
    showInfo,
    dismissToast,
    dismissAll,
  }), [showUndoToast, showSuccess, showWarning, showInfo, dismissToast, dismissAll])

  return (
    <UndoToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <UndoToastItem
              key={toast.id}
              toast={toast}
              onDismiss={() => dismissToast(toast.id)}
              onUndo={toast.onUndo}
            />
          ))}
        </AnimatePresence>
      </div>
    </UndoToastContext.Provider>
  )
}

// Success Toast with Micro-Spark Effect
export function SuccessToast({ 
  title, 
  message,
  onDismiss 
}: Readonly<{ 
  title: string
  message?: string
  onDismiss: () => void
}>) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      variants={toastSlideUp}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-900/90 text-white shadow-xl backdrop-blur-xl"
    >
      {/* Success Icon with micro-spark */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </motion.div>
        
        {/* Micro-spark particles */}
        {!prefersReducedMotion && (
          <>
            <motion.span
              className="absolute -top-1 left-1/4 w-1 h-1 rounded-full bg-gold"
              initial={{ opacity: 0, y: 4, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                y: [4, -6], 
                scale: [0, 1, 0.5] 
              }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.span
              className="absolute -top-0.5 right-1/4 w-1 h-1 rounded-full bg-gold"
              initial={{ opacity: 0, y: 4, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0], 
                y: [4, -8], 
                scale: [0, 1, 0.5] 
              }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            />
          </>
        )}
      </div>

      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        {message && <p className="text-xs text-emerald-300 mt-0.5">{message}</p>}
      </div>

      <button
        onClick={onDismiss}
        className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </motion.div>
  )
}

export default UndoToastProvider
