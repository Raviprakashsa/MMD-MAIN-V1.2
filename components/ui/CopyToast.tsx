'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface CopyToastProps {
  show: boolean
  message?: string
}

export function CopyToast({ show, message = 'Copied!' }: Readonly<CopyToastProps>) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="fixed top-4 right-4 z-tooltip flex items-center gap-2 bg-[#10B981] text-white px-4 py-2 rounded-lg shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function useCopyToClipboard(timeout = 2000) {
  const [isCopied, setIsCopied] = useState(false)

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setIsCopied(true)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), timeout)
      return () => clearTimeout(timer)
    }
  }, [isCopied, timeout])

  return { isCopied, copy }
}
